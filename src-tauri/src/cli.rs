// Installing the command-line launcher: a symlink on the PATH to the script
// bundled in the app (`resources/lore`), named for the build mode so `lore`,
// `lore-dev` and `lore-agent` each open their own Lore.

use std::path::{Path, PathBuf};

use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

use crate::mode::CLI_NAME;

const BIN_DIR: &str = "/usr/local/bin";

pub fn install<R: Runtime>(app: &AppHandle<R>) {
    let (kind, message) = match try_install(app) {
        Ok(link) => (
            MessageDialogKind::Info,
            format!(
                "Installed {}.\n\nRun `{CLI_NAME} .` to open a folder as a vault, or `{CLI_NAME} note.md` to open one file.",
                link.display()
            ),
        ),
        Err(reason) => (MessageDialogKind::Warning, reason),
    };

    app.dialog()
        .message(message)
        .title(format!("'{CLI_NAME}' Command"))
        .kind(kind)
        .show(|_| {});
}

fn try_install<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let script = app
        .path()
        .resolve("resources/lore", BaseDirectory::Resource)
        .map_err(|error| format!("The launcher is missing from this build: {error}"))?;
    let link = Path::new(BIN_DIR).join(CLI_NAME);

    // Only ever replace a link, which is what an earlier install or a moved app
    // leaves behind. A real file there is somebody else's program.
    match std::fs::symlink_metadata(&link) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            std::fs::remove_file(&link).map_err(|error| manual(&script, &link, &error))?;
        }
        Ok(_) => {
            return Err(format!(
                "{} already exists and is not a link Lore made, so it was left alone.",
                link.display()
            ));
        }
        Err(_) => {}
    }

    let _ = std::fs::create_dir_all(BIN_DIR);
    std::os::unix::fs::symlink(&script, &link).map_err(|error| manual(&script, &link, &error))?;

    Ok(link)
}

/// Lore does not ask for an administrator password; it says what to run.
fn manual(script: &Path, link: &Path, error: &std::io::Error) -> String {
    format!(
        "Could not write to {BIN_DIR} ({error}).\n\nRun this in a terminal instead:\n\nsudo mkdir -p {BIN_DIR} && sudo ln -sf \"{}\" \"{}\"",
        script.display(),
        link.display()
    )
}
