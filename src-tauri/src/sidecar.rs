// Spawning and supervising the Bun data engine.
//
// The renderer never spawns anything: it asks for an endpoint and talks HTTP.
// That is why the webview is granted no `shell:` permission at all — the only
// thing that can start a process is this file.

use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_shell::process::{CommandEvent, CommandChild};
use tauri_plugin_shell::ShellExt;

/// Fixed endpoint used by `pnpm dev:all`, which runs the sidecar under
/// `bun --watch` so it stays out of the Rust rebuild loop.
const DEV_PORT: u16 = 51789;
const DEV_TOKEN: &str = "lore-dev-token";

const HANDSHAKE: &str = "LORE_SIDECAR";
/// Give the engine a bounded time to bind and announce itself.
const HANDSHAKE_TIMEOUT_SECS: u64 = 10;
const MAX_RESTARTS: u32 = 3;

#[derive(Clone, Serialize)]
pub struct Endpoint {
    pub url: String,
    pub token: String,
}

#[derive(Default)]
pub struct SidecarState {
    inner: Mutex<Option<Running>>,
}

struct Running {
    endpoint: Endpoint,
    child: Option<CommandChild>,
}

impl SidecarState {
    fn set(&self, endpoint: Endpoint, child: Option<CommandChild>) {
        *self.inner.lock().unwrap() = Some(Running { endpoint, child });
    }

    fn endpoint(&self) -> Option<Endpoint> {
        self.inner
            .lock()
            .unwrap()
            .as_ref()
            .map(|r| r.endpoint.clone())
    }

    /// Kills the engine. Tauri does not reap children on exit, so without this
    /// quitting Lore would leave a process holding the vault.
    pub fn shutdown(&self) {
        if let Some(running) = self.inner.lock().unwrap().as_mut() {
            if let Some(child) = running.child.take() {
                let _ = child.kill();
            }
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

/// What the renderer calls once at boot to learn where the engine is.
#[tauri::command]
pub fn sidecar_endpoint(state: State<'_, SidecarState>) -> Result<Endpoint, String> {
    state
        .endpoint()
        .ok_or_else(|| "the data engine is not running".to_string())
}

#[tauri::command]
pub fn default_vault_path(app: AppHandle) -> Result<String, String> {
    default_vault(&app)
}

/// Starts the engine, or points at the already-running dev one.
pub fn start(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<SidecarState>();

    // In a debug build the engine is run separately by `pnpm dev:all`, so that
    // editing it does not force a Rust rebuild.
    if cfg!(debug_assertions) {
        state.set(
            Endpoint {
                url: format!("http://127.0.0.1:{DEV_PORT}"),
                token: DEV_TOKEN.to_string(),
            },
            None,
        );
        return Ok(());
    }

    spawn(app, 0)
}

fn spawn(app: &AppHandle, attempt: u32) -> Result<(), String> {
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
        .env("LORE_PARENT_PID", std::process::id().to_string());

    let (mut rx, child) = command
        .spawn()
        .map_err(|e| format!("could not start the data engine: {e}"))?;

    let supervised = app.clone();
    let (tx, wait) = std::sync::mpsc::channel::<Result<u16, String>>();

    tauri::async_runtime::spawn(async move {
        let mut announced = false;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let line = String::from_utf8_lossy(&line);
                    let line = line.trim();
                    if announced {
                        continue;
                    }
                    if let Some(rest) = line.strip_prefix(HANDSHAKE) {
                        announced = true;
                        let port = serde_json::from_str::<serde_json::Value>(rest.trim())
                            .ok()
                            .and_then(|v| v.get("port").and_then(|p| p.as_u64()))
                            .map(|p| p as u16);
                        let _ = tx.send(port.ok_or_else(|| {
                            "the data engine sent a handshake we could not read".to_string()
                        }));
                    }
                }
                CommandEvent::Stderr(line) => {
                    eprintln!("lore-sidecar: {}", String::from_utf8_lossy(&line).trim());
                }
                CommandEvent::Terminated(payload) => {
                    if !announced {
                        let _ = tx.send(Err(format!(
                            "the data engine exited before it was ready ({:?})",
                            payload.code
                        )));
                    }
                    restart(&supervised, attempt);
                    break;
                }
                _ => {}
            }
        }
    });

    let port = wait
        .recv_timeout(std::time::Duration::from_secs(HANDSHAKE_TIMEOUT_SECS))
        .map_err(|_| "the data engine did not start in time".to_string())??;

    app.state::<SidecarState>().set(
        Endpoint {
            url: format!("http://127.0.0.1:{port}"),
            token,
        },
        Some(child),
    );
    Ok(())
}

/// Brings the engine back after a crash, then tells the renderer to re-discover
/// the endpoint — the port and token both change on restart.
fn restart(app: &AppHandle, attempt: u32) {
    if attempt >= MAX_RESTARTS {
        eprintln!("lore-sidecar: giving up after {MAX_RESTARTS} restarts");
        let _ = tauri::Emitter::emit(app, "sidecar:down", ());
        return;
    }
    let backoff = std::time::Duration::from_millis(250 * 2u64.pow(attempt));
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(backoff).await;
        match spawn(&app, attempt + 1) {
            Ok(()) => {
                let _ = tauri::Emitter::emit(&app, "sidecar:restarted", ());
            }
            Err(e) => eprintln!("lore-sidecar: restart failed: {e}"),
        }
    });
}

/// Renames the legacy SQLite store after a successful migration.
///
/// Deliberately a rename and not a delete: for a user mid-upgrade this file is
/// the only copy of their library, and the migration is new code.
#[tauri::command]
pub fn backup_legacy_db(app: AppHandle) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("no app data dir: {e}"))?;
    let from = dir.join("lore.db");
    if !from.exists() {
        return Ok(String::new());
    }
    let to = dir.join("lore.db.premigration");
    std::fs::rename(&from, &to).map_err(|e| format!("could not set the old store aside: {e}"))?;
    Ok(to.to_string_lossy().into_owned())
}
