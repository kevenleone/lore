// A window over one Markdown file, opened from outside the app.
//
// The file is not a vault item and need not be inside a vault, so the engine
// never sees it. The renderer never names a path either: each command resolves
// the file from the window that called it, so a document window can read and
// write the one file the host opened for it and nothing else.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;
use std::time::UNIX_EPOCH;

use serde::Serialize;
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

const LABEL_PREFIX: &str = "document-";
/// What `write_document` answers when the file is not the one that was read.
const CHANGED_ON_DISK: &str = "changed_on_disk";

#[derive(Default)]
pub struct Documents {
    next: AtomicU32,
    paths: Mutex<HashMap<String, PathBuf>>,
}

impl Documents {
    fn label_for(&self, path: &Path) -> Option<String> {
        self.paths
            .lock()
            .unwrap()
            .iter()
            .find(|(_, open)| open.as_path() == path)
            .map(|(label, _)| label.clone())
    }

    fn path_of(&self, label: &str) -> Result<PathBuf, String> {
        self.paths
            .lock()
            .unwrap()
            .get(label)
            .cloned()
            .ok_or_else(|| "this window has no document".to_string())
    }
}

#[derive(Serialize)]
pub struct Document {
    /// Milliseconds since the epoch; `None` when the file has gone.
    modified: Option<u64>,
    name: String,
    path: String,
    text: String,
}

pub fn is_document(label: &str) -> bool {
    label.starts_with(LABEL_PREFIX)
}

pub fn any_open(app: &AppHandle) -> bool {
    !app.state::<Documents>().paths.lock().unwrap().is_empty()
}

pub fn open(app: &AppHandle, path: PathBuf) {
    let documents = app.state::<Documents>();

    // The Dock entry first: a window raised by an Accessory app opens behind
    // whatever the user is looking at.
    crate::commands::set_app_visible_in_switcher(app, true);

    if let Some(window) = documents
        .label_for(&path)
        .and_then(|label| app.get_webview_window(&label))
    {
        let _ = window.unminimize();
        let _ = window.set_focus();
        return;
    }

    let label = format!(
        "{LABEL_PREFIX}{}",
        documents.next.fetch_add(1, Ordering::Relaxed)
    );
    let title = crate::mode::window_title(&file_name(&path));

    // Registered before the window exists, so its first `read_document` finds it.
    documents.paths.lock().unwrap().insert(label.clone(), path);

    let built =
        WebviewWindowBuilder::new(app, &label, WebviewUrl::App("windows/document.html".into()))
            .title(title)
            .inner_size(860.0, 960.0)
            .min_inner_size(480.0, 400.0)
            .decorations(false)
            .build();

    match built {
        Ok(window) => {
            #[cfg(target_os = "macos")]
            crate::window_frame::adopt_system_frame(&window.as_ref().window());
            let _ = window.set_focus();
        }
        Err(error) => {
            eprintln!("lore: could not open a document window: {error}");
            closed(app, &label);
        }
    }
}

pub fn closed(app: &AppHandle, label: &str) {
    app.state::<Documents>().paths.lock().unwrap().remove(label);
    crate::commands::settle_switcher(app);
}

#[tauri::command]
pub fn read_document(
    window: WebviewWindow,
    documents: State<'_, Documents>,
) -> Result<Document, String> {
    let path = documents.path_of(window.label())?;
    let text = std::fs::read_to_string(&path)
        .map_err(|error| format!("could not read {}: {error}", path.display()))?;

    Ok(Document {
        modified: modified(&path),
        name: file_name(&path),
        path: path.to_string_lossy().into_owned(),
        text,
    })
}

/// Writes the window's file, unless it changed since the window last saw it.
///
/// `expected_modified` is what the last read or write reported. `None` skips the
/// check, which is how the user's "overwrite" reaches here.
#[tauri::command]
pub fn write_document(
    window: WebviewWindow,
    documents: State<'_, Documents>,
    text: String,
    expected_modified: Option<u64>,
) -> Result<Option<u64>, String> {
    let path = documents.path_of(window.label())?;

    // A file that has gone is not a conflict: writing it back is the only way
    // what was typed survives.
    if let (Some(expected), Some(current)) = (expected_modified, modified(&path)) {
        if expected != current {
            return Err(CHANGED_ON_DISK.to_string());
        }
    }

    write_atomically(&path, &text)
        .map_err(|error| format!("could not save {}: {error}", path.display()))?;

    Ok(modified(&path))
}

/// A sibling temporary file renamed over the original, so a crash mid-write
/// leaves the old note rather than half of the new one.
fn write_atomically(path: &Path, text: &str) -> std::io::Result<()> {
    let temporary = path.with_file_name(format!(".{}.lore-saving", file_name(path)));

    std::fs::write(&temporary, text)?;

    if let Ok(metadata) = std::fs::metadata(path) {
        let _ = std::fs::set_permissions(&temporary, metadata.permissions());
    }

    std::fs::rename(&temporary, path).inspect_err(|_| {
        let _ = std::fs::remove_file(&temporary);
    })
}

fn modified(path: &Path) -> Option<u64> {
    let modified = std::fs::metadata(path).ok()?.modified().ok()?;

    Some(modified.duration_since(UNIX_EPOCH).ok()?.as_millis() as u64)
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_atomic_write_replaces_the_file_and_leaves_no_temporary() {
        let dir = std::env::temp_dir().join(format!("lore-document-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let note = dir.join("note.md");
        std::fs::write(&note, "before").unwrap();

        write_atomically(&note, "after").unwrap();

        assert_eq!(std::fs::read_to_string(&note).unwrap(), "after");
        assert_eq!(std::fs::read_dir(&dir).unwrap().count(), 1);
    }
}
