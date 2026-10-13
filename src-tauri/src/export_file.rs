use std::path::Path;

/// What a sketch can be exported as. The renderer names the destination, so
/// this is what keeps the command from writing any file it likes.
const EXTENSIONS: [&str; 2] = ["excalidraw", "svg"];

#[tauri::command]
pub fn write_export(destination: String, contents: String) -> Result<(), String> {
    let path = Path::new(&destination);
    let allowed = path
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| EXTENSIONS.contains(&extension.to_ascii_lowercase().as_str()));

    if !allowed {
        return Err("Lore exports a sketch as .excalidraw or .svg only.".to_string());
    }

    std::fs::write(path, contents).map_err(|error| error.to_string())
}
