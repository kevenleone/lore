// What Lore does with a path it is handed from outside: Finder's "Open With",
// a command line, or a second launch forwarded by the single-instance plugin.
// A folder is a vault for the main window; a Markdown file gets a window of
// its own.

use std::path::{Path, PathBuf};
use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, State};

const MARKDOWN_EXTENSIONS: [&str; 2] = ["md", "markdown"];

#[derive(Debug, PartialEq)]
pub enum Target {
    Workspace(PathBuf),
    Document(PathBuf),
    Ignored,
}

/// The folder a launch asked for, held until the main window collects it: on a
/// cold start the event below fires before the renderer is listening.
#[derive(Default)]
pub struct PendingWorkspace(Mutex<Option<String>>);

pub fn classify(argument: &str, cwd: &Path) -> Target {
    if argument.is_empty() || argument.starts_with('-') {
        return Target::Ignored;
    }

    // Canonical, so the same file reached by two spellings is one window.
    let Ok(path) = cwd.join(argument).canonicalize() else {
        return Target::Ignored;
    };

    if path.is_dir() {
        return Target::Workspace(path);
    }

    let markdown = path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            MARKDOWN_EXTENSIONS
                .iter()
                .any(|known| extension.eq_ignore_ascii_case(known))
        });

    match markdown && path.is_file() {
        true => Target::Document(path),
        false => Target::Ignored,
    }
}

pub fn handle<I>(app: &AppHandle, arguments: I, cwd: &Path)
where
    I: IntoIterator<Item = String>,
{
    let targets: Vec<Target> = arguments
        .into_iter()
        .map(|argument| classify(&argument, cwd))
        .collect();
    let handle = app.clone();

    // A forwarded launch arrives on a worker thread, and a window's frame is
    // AppKit's: touching it anywhere but the main thread aborts the app.
    let _ = app.run_on_main_thread(move || {
        for target in targets {
            match target {
                Target::Workspace(path) => open_workspace(&handle, path),
                Target::Document(path) => crate::document_window::open(&handle, path),
                Target::Ignored => {}
            }
        }
    });
}

/// Launch arguments, resolved against the directory the process started in.
pub fn handle_launch(app: &AppHandle) {
    let cwd = std::env::current_dir().unwrap_or_default();
    handle(app, std::env::args().skip(1), &cwd);
}

fn open_workspace(app: &AppHandle, path: PathBuf) {
    let path = path.to_string_lossy().into_owned();

    *app.state::<PendingWorkspace>().0.lock().unwrap() = Some(path.clone());
    crate::commands::show_main(app);
    let _ = app.emit_to("main", "workspace:open", path);
}

#[tauri::command]
pub fn take_pending_workspace(pending: State<'_, PendingWorkspace>) -> Option<String> {
    pending.0.lock().unwrap().take()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch(name: &str) -> PathBuf {
        let dir =
            std::env::temp_dir().join(format!("lore-open-paths-{}-{name}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(dir.join("vault")).unwrap();
        std::fs::write(dir.join("vault/note.md"), "# note").unwrap();
        std::fs::write(dir.join("vault/UPPER.MARKDOWN"), "# upper").unwrap();
        std::fs::write(dir.join("vault/photo.png"), "").unwrap();
        dir.canonicalize().unwrap()
    }

    #[test]
    fn a_folder_is_a_workspace() {
        let dir = scratch("folder");
        assert_eq!(
            classify("vault", &dir),
            Target::Workspace(dir.join("vault"))
        );
        assert_eq!(
            classify(".", &dir.join("vault")),
            Target::Workspace(dir.join("vault"))
        );
    }

    #[test]
    fn a_markdown_file_is_a_document() {
        let dir = scratch("markdown");
        let note = dir.join("vault/note.md");
        assert_eq!(
            classify("vault/note.md", &dir),
            Target::Document(note.clone())
        );
        assert_eq!(
            classify(note.to_str().unwrap(), Path::new("/")),
            Target::Document(note)
        );
        assert_eq!(
            classify("UPPER.MARKDOWN", &dir.join("vault")),
            Target::Document(dir.join("vault/UPPER.MARKDOWN"))
        );
    }

    #[test]
    fn two_spellings_of_one_file_are_one_target() {
        let dir = scratch("spellings");
        assert_eq!(
            classify("vault/../vault/note.md", &dir),
            classify("vault/note.md", &dir)
        );
    }

    #[test]
    fn everything_else_is_ignored() {
        let dir = scratch("ignored");
        assert_eq!(classify("vault/photo.png", &dir), Target::Ignored);
        assert_eq!(classify("vault/missing.md", &dir), Target::Ignored);
        assert_eq!(classify("--flag", &dir), Target::Ignored);
        assert_eq!(classify("-psn_0_12345", &dir), Target::Ignored);
        assert_eq!(classify("", &dir), Target::Ignored);
    }
}
