use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::Deserialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

/// Files the user picked in a save panel this process opened and that have not
/// been written yet. The renderer is not trusted to name a destination, so
/// everything that writes an export takes its path from here, once.
#[derive(Default)]
pub struct SaveTargets(Mutex<HashSet<PathBuf>>);

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportKind {
    Excalidraw,
    Pdf,
    Svg,
}

impl ExportKind {
    fn extension(self) -> &'static str {
        match self {
            Self::Excalidraw => "excalidraw",
            Self::Pdf => "pdf",
            Self::Svg => "svg",
        }
    }

    fn label(self) -> &'static str {
        match self {
            Self::Excalidraw => "Excalidraw",
            Self::Pdf => "PDF",
            Self::Svg => "SVG",
        }
    }
}

/// Shows the save panel and remembers what was picked. `None` when cancelled.
#[tauri::command]
pub async fn pick_save_path(
    app: AppHandle,
    kind: ExportKind,
    name: String,
    title: String,
) -> Result<Option<String>, String> {
    // A bare name: a path here would let the renderer choose the folder.
    let file_name = PathBuf::from(&name)
        .file_name()
        .map(|file| file.to_string_lossy().into_owned())
        .unwrap_or_else(|| format!("untitled.{}", kind.extension()));

    let picked = app
        .dialog()
        .file()
        .set_title(title)
        .set_file_name(file_name)
        .add_filter(kind.label(), &[kind.extension()])
        .blocking_save_file();

    let Some(picked) = picked else {
        return Ok(None);
    };
    let path = picked.into_path().map_err(|error| error.to_string())?;

    app.state::<SaveTargets>()
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .insert(path.clone());

    Ok(Some(path.to_string_lossy().into_owned()))
}

/// The picked path, if `destination` is one. A path can be written once.
pub fn take(targets: &SaveTargets, destination: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(destination);
    let picked = targets
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .remove(&path);

    if picked {
        Ok(path)
    } else {
        Err("Lore only saves an export where you picked in the save panel.".to_string())
    }
}

#[tauri::command]
pub fn write_export(
    targets: State<'_, SaveTargets>,
    destination: String,
    contents: String,
) -> Result<(), String> {
    let path = take(&targets, &destination)?;

    std::fs::write(path, contents).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_a_picked_path_is_written_and_only_once() {
        let targets = SaveTargets::default();

        targets
            .0
            .lock()
            .unwrap()
            .insert(PathBuf::from("/tmp/sketch.svg"));

        assert!(take(&targets, "/Users/someone/.zshrc").is_err());
        assert!(take(&targets, "/tmp/sketch.svg").is_ok());
        assert!(take(&targets, "/tmp/sketch.svg").is_err());
    }
}
