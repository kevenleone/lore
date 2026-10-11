// Installing the command-line launcher: a symlink on the PATH to the script
// bundled in the app (`resources/lore`), named for the build mode so `lore`,
// `lore-dev` and `lore-agent` each open their own Lore.

use std::path::{Path, PathBuf};
use std::process::Command;

use serde::Serialize;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager, Runtime, WebviewWindow};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

use crate::mode::CLI_NAME;

const BIN_DIR: &str = "/usr/local/bin";

// The first argument is the prompt; the rest are one command, each quoted here
// so a path with a space or a quote in it cannot become a second command.
const ELEVATE: &str = r#"on run argv
    set command to ""
    repeat with part in rest of argv
        set command to command & quoted form of (part as text) & " "
    end repeat
    do shell script command with prompt (item 1 of argv) with administrator privileges
end run"#;

const LINK: &str = r#"/bin/mkdir -p "$1" && /bin/ln -sfn "$2" "$3""#;

#[derive(Serialize)]
pub struct Status {
    installed: bool,
    name: &'static str,
}

enum Failure {
    /// The password prompt was dismissed: nothing changed and nothing to report.
    Cancelled,
    Reason(String),
}

pub fn install<R: Runtime>(app: &AppHandle<R>) {
    let (kind, message) = match try_install(app) {
        Ok(link) => (
            MessageDialogKind::Info,
            format!(
                "Installed {}.\n\nRun `{CLI_NAME} .` to open a folder as a vault, or `{CLI_NAME} note.md` to open one file.",
                link.display()
            ),
        ),
        Err(Failure::Cancelled) => return,
        Err(Failure::Reason(reason)) => (MessageDialogKind::Warning, reason),
    };

    app.dialog()
        .message(message)
        .title(format!("'{CLI_NAME}' Command"))
        .kind(kind)
        .show(|_| {});
}

#[tauri::command(async)]
pub fn cli_status<R: Runtime>(app: AppHandle<R>) -> Status {
    status(&app)
}

// `async` because the password prompt blocks until it is answered.
#[tauri::command(async)]
pub fn set_cli_installed<R: Runtime>(
    window: WebviewWindow<R>,
    installed: bool,
) -> Result<Status, String> {
    if window.label() != "main" {
        return Err("Only the main window installs the command.".into());
    }

    let app = window.app_handle();
    let outcome = if installed {
        try_install(app).map(|_| ())
    } else {
        try_uninstall(app)
    };

    match outcome {
        Ok(()) | Err(Failure::Cancelled) => Ok(status(app)),
        Err(Failure::Reason(reason)) => Err(reason),
    }
}

fn status<R: Runtime>(app: &AppHandle<R>) -> Status {
    Status {
        installed: is_installed(app),
        name: CLI_NAME,
    }
}

fn link() -> PathBuf {
    Path::new(BIN_DIR).join(CLI_NAME)
}

fn script<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, Failure> {
    app.path()
        .resolve("resources/lore", BaseDirectory::Resource)
        .map_err(|error| {
            Failure::Reason(format!("The launcher is missing from this build: {error}"))
        })
}

/// Whether the link is there and is this app's, not another Lore's.
fn is_installed<R: Runtime>(app: &AppHandle<R>) -> bool {
    let Ok(script) = script(app) else {
        return false;
    };

    points_at(&link(), &script)
}

fn points_at(link: &Path, script: &Path) -> bool {
    let is_link = std::fs::symlink_metadata(link)
        .map(|metadata| metadata.file_type().is_symlink())
        .unwrap_or(false);

    match (std::fs::canonicalize(link), std::fs::canonicalize(script)) {
        (Ok(target), Ok(script)) => is_link && target == script,
        _ => false,
    }
}

fn try_install<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, Failure> {
    let script = script(app)?;
    let link = link();

    // Only ever replace a link, which is what an earlier install or a moved app
    // leaves behind. A real file there is somebody else's program.
    let stale = match std::fs::symlink_metadata(&link) {
        Ok(metadata) if metadata.file_type().is_symlink() => true,
        Ok(_) => {
            return Err(Failure::Reason(format!(
                "{} already exists and is not a link Lore made, so it was left alone.",
                link.display()
            )));
        }
        Err(_) => false,
    };

    let _ = std::fs::create_dir_all(BIN_DIR);

    let plain = if stale {
        std::fs::remove_file(&link)
    } else {
        Ok(())
    }
    .and_then(|()| std::os::unix::fs::symlink(&script, &link));

    if plain.is_err() {
        let (script, link) = (script.to_string_lossy(), link.to_string_lossy());

        elevate(
            &format!("Lore wants to add the “{CLI_NAME}” command to {BIN_DIR}."),
            &["/bin/sh", "-c", LINK, "sh", BIN_DIR, &script, &link],
        )?;
    }

    Ok(link)
}

fn try_uninstall<R: Runtime>(app: &AppHandle<R>) -> Result<(), Failure> {
    // A link to some other Lore, or a program of the same name, is not ours.
    if !is_installed(app) {
        return Ok(());
    }

    let link = link();

    if std::fs::remove_file(&link).is_ok() {
        return Ok(());
    }

    elevate(
        &format!("Lore wants to remove the “{CLI_NAME}” command from {BIN_DIR}."),
        &["/bin/rm", "-f", &link.to_string_lossy()],
    )
}

/// Runs one command as an administrator, behind the system's password prompt.
fn elevate(prompt: &str, command: &[&str]) -> Result<(), Failure> {
    let output = Command::new("/usr/bin/osascript")
        .args(["-e", ELEVATE, prompt])
        .args(command)
        .output()
        .map_err(|error| Failure::Reason(manual(command, &error.to_string())))?;

    if output.status.success() {
        return Ok(());
    }

    let reason = String::from_utf8_lossy(&output.stderr);

    // AppleScript's `userCanceledErr`.
    if reason.contains("-128") {
        return Err(Failure::Cancelled);
    }

    Err(Failure::Reason(manual(command, reason.trim())))
}

fn manual(command: &[&str], reason: &str) -> String {
    let line = match command {
        [.., script, link] if command.contains(&LINK) => {
            format!("sudo mkdir -p {BIN_DIR} && sudo ln -sfn \"{script}\" \"{link}\"")
        }
        [.., link] => format!("sudo rm -f \"{link}\""),
        [] => String::new(),
    };

    format!("Could not write to {BIN_DIR} ({reason}).\n\nRun this in a terminal instead:\n\n{line}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_link_counts_only_when_it_reaches_this_script() {
        let dir = std::env::temp_dir().join(format!("lore-cli-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();

        let script = dir.join("lore");
        let other = dir.join("other");
        std::fs::write(&script, "").unwrap();
        std::fs::write(&other, "").unwrap();

        let ours = dir.join("ours");
        let theirs = dir.join("theirs");
        let dangling = dir.join("dangling");
        std::os::unix::fs::symlink(&script, &ours).unwrap();
        std::os::unix::fs::symlink(&other, &theirs).unwrap();
        std::os::unix::fs::symlink(dir.join("gone"), &dangling).unwrap();

        assert!(points_at(&ours, &script));
        assert!(!points_at(&theirs, &script));
        assert!(!points_at(&dangling, &script));
        assert!(!points_at(&script, &script));
        assert!(!points_at(&dir.join("absent"), &script));

        std::fs::remove_dir_all(&dir).unwrap();
    }
}
