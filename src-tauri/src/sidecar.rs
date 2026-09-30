// Spawning and supervising the Bun data engine.
//
// The renderer never spawns anything: it asks for an endpoint and talks HTTP.
// That is why the webview is granted no `shell:` permission at all — the only
// thing that can start a process is this file.

use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tokio::sync::watch;

/// Fixed endpoint used by `pnpm dev:all`, which runs the sidecar under
/// `bun --watch` so it stays out of the Rust rebuild loop. The port is per
/// mode, so a dev Lore and an agent's Lore never reach each other's engine.
const DEV_PORT: &str = crate::mode::SIDECAR_DEV_PORT;
const DEV_TOKEN: &str = "lore-dev-token";

const HANDSHAKE: &str = "LORE_SIDECAR";
/// The first launch of the x86_64 build on Apple Silicon waits for Rosetta to
/// translate the whole engine, which measured close to ten seconds on its own.
const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(30);
/// How long the renderer's `sidecar_endpoint` waits for a starting engine
/// before reporting it as still starting.
const ENDPOINT_WAIT: Duration = Duration::from_secs(45);
const MAX_RESTARTS: u32 = 3;

#[derive(Clone, Serialize)]
pub struct Endpoint {
    pub url: String,
    pub token: String,
}

#[derive(Clone)]
enum Readiness {
    Starting,
    Ready(Endpoint),
    Failed(String),
}

pub struct SidecarState {
    readiness: watch::Sender<Readiness>,
    child: Mutex<Option<CommandChild>>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            readiness: watch::channel(Readiness::Starting).0,
            child: Mutex::new(None),
        }
    }
}

impl SidecarState {
    // `send_replace`, not `send`: the latter refuses when nobody is subscribed,
    // which is the usual case at boot.
    fn set(&self, readiness: Readiness) {
        self.readiness.send_replace(readiness);
    }

    fn take_child(&self) -> Option<CommandChild> {
        self.child.lock().unwrap().take()
    }

    /// Kills the engine. Tauri does not reap children on exit, so without this
    /// quitting Lore would leave a process holding the vault.
    pub fn shutdown(&self) {
        if let Some(child) = self.take_child() {
            let _ = child.kill();
        }
    }
}

/// 32 bytes of randomness, hex-encoded.
fn generate_token() -> String {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes).expect("failed to gather randomness for the sidecar token");
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// The default vault, alongside the app's own data.
pub fn default_vault(app: &AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("no app data dir: {e}"))?
        .join("Vault");
    std::fs::create_dir_all(&dir).map_err(|e| format!("could not create the vault: {e}"))?;
    Ok(dir.to_string_lossy().into_owned())
}

/// What the renderer calls to learn where the engine is. It waits out a slow
/// start rather than failing it, so boot never races the handshake.
#[tauri::command]
pub async fn sidecar_endpoint(state: State<'_, SidecarState>) -> Result<Endpoint, String> {
    let mut readiness = state.readiness.subscribe();
    let settled = tokio::time::timeout(
        ENDPOINT_WAIT,
        readiness.wait_for(|readiness| !matches!(readiness, Readiness::Starting)),
    )
    .await
    .map_err(|_| "the data engine is still starting".to_string())?
    .map_err(|_| "the data engine is not running".to_string())?
    .clone();

    match settled {
        Readiness::Ready(endpoint) => Ok(endpoint),
        Readiness::Failed(reason) => Err(reason),
        Readiness::Starting => Err("the data engine is still starting".to_string()),
    }
}

#[tauri::command]
pub fn default_vault_path(app: AppHandle) -> Result<String, String> {
    default_vault(&app)
}

/// Starts the engine, or points at the already-running dev one. It returns as
/// soon as the process is spawned; the handshake settles `SidecarState` later.
pub fn start(app: &AppHandle) {
    let state = app.state::<SidecarState>();

    // In a debug build the engine is run separately by `pnpm dev:all`, so that
    // editing it does not force a Rust rebuild.
    if cfg!(debug_assertions) {
        state.set(Readiness::Ready(Endpoint {
            url: format!("http://127.0.0.1:{DEV_PORT}"),
            token: DEV_TOKEN.to_string(),
        }));
        return;
    }

    spawn(app, 0);
}

fn spawn(app: &AppHandle, attempt: u32) {
    let state = app.state::<SidecarState>();
    state.set(Readiness::Starting);

    if let Err(reason) = try_spawn(app, attempt) {
        eprintln!("lore-sidecar: {reason}");
        state.set(Readiness::Failed(reason));
    }
}

fn try_spawn(app: &AppHandle, attempt: u32) -> Result<(), String> {
    let token = generate_token();
    let vault = default_vault(app)?;

    let command = app
        .shell()
        .sidecar("lore-sidecar")
        .map_err(|e| format!("sidecar binary missing: {e}"))?
        // The token goes through the environment, never argv: argv is
        // world-readable through `ps`.
        .env("LORE_TOKEN", token.clone())
        .env("LORE_VAULT", vault)
        // Which Lore this is, so a dev build keeps its own index rather than
        // rebuilding the installed app's when they share a vault.
        .env("LORE_MODE", crate::mode::MODE)
        .env("LORE_PARENT_PID", std::process::id().to_string());

    let (mut rx, child) = command
        .spawn()
        .map_err(|e| format!("could not start the data engine: {e}"))?;
    *app.state::<SidecarState>().child.lock().unwrap() = Some(child);

    let supervised = app.clone();

    tauri::async_runtime::spawn(async move {
        let state = supervised.state::<SidecarState>();
        let mut announced = false;
        let mut failure: Option<String> = None;
        let deadline = tokio::time::sleep(HANDSHAKE_TIMEOUT);
        tokio::pin!(deadline);

        loop {
            let event = tokio::select! {
                event = rx.recv() => event,
                // A hung engine is killed rather than abandoned: its
                // `Terminated` event is what brings the restart below.
                _ = &mut deadline, if !announced && failure.is_none() => {
                    failure = Some(format!(
                        "the data engine did not start within {} seconds",
                        HANDSHAKE_TIMEOUT.as_secs()
                    ));
                    state.shutdown();
                    continue;
                }
            };

            let Some(event) = event else { break };

            match event {
                CommandEvent::Stdout(line) => {
                    if announced {
                        continue;
                    }
                    let line = String::from_utf8_lossy(&line);
                    let Some(rest) = line.trim().strip_prefix(HANDSHAKE) else {
                        continue;
                    };
                    announced = true;
                    let port = serde_json::from_str::<serde_json::Value>(rest.trim())
                        .ok()
                        .and_then(|v| v.get("port").and_then(|p| p.as_u64()))
                        .map(|p| p as u16);
                    match port {
                        Some(port) => state.set(Readiness::Ready(Endpoint {
                            url: format!("http://127.0.0.1:{port}"),
                            token: token.clone(),
                        })),
                        None => {
                            failure = Some(
                                "the data engine sent a handshake we could not read".to_string(),
                            );
                            state.shutdown();
                        }
                    }
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("lore-sidecar: {}", String::from_utf8_lossy(&line).trim());
                }
                CommandEvent::Terminated(payload) => {
                    let reason = failure.take().unwrap_or_else(|| {
                        format!("the data engine exited unexpectedly ({:?})", payload.code)
                    });
                    restart(&supervised, attempt, reason);
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

/// Brings the engine back after a crash or a missed handshake, then tells the
/// renderer to re-discover the endpoint — the port and token both change.
fn restart(app: &AppHandle, attempt: u32, reason: String) {
    eprintln!("lore-sidecar: {reason}");
    let state = app.state::<SidecarState>();
    state.take_child();

    if attempt >= MAX_RESTARTS {
        eprintln!("lore-sidecar: giving up after {MAX_RESTARTS} restarts");
        state.set(Readiness::Failed(reason));
        let _ = tauri::Emitter::emit(app, "sidecar:down", ());
        return;
    }

    state.set(Readiness::Starting);
    let backoff = Duration::from_millis(250 * 2u64.pow(attempt));
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(backoff).await;
        spawn(&app, attempt + 1);
        let _ = tauri::Emitter::emit(&app, "sidecar:restarted", ());
    });
}

/// Renames a legacy SQLite store after a successful import.
///
/// Deliberately a rename and not a delete: for a user mid-upgrade that file is
/// the only copy of their library. It has already earned its keep once.
#[tauri::command]
pub fn backup_legacy_db(app: AppHandle, file: String) -> Result<String, String> {
    // The renderer supplies the name, so refuse anything that is not a plain
    // filename — this must never be able to move a file outside app data.
    if file.is_empty() || file.contains('/') || file.contains('\\') || file.contains("..") {
        return Err(format!("not a legacy store name: {file}"));
    }
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("no app data dir: {e}"))?;
    let from = dir.join(&file);
    if !from.exists() {
        return Ok(String::new());
    }
    let to = dir.join(format!("{file}.premigration"));
    std::fs::rename(&from, &to).map_err(|e| format!("could not set the old store aside: {e}"))?;
    Ok(to.to_string_lossy().into_owned())
}
