// Commands and helpers for the Quick Capture window. The window is declared
// (hidden) in tauri.conf.json; here we toggle/hide it. ⌥Space (registered in
// lib.rs) and the in-app Capture buttons both route through toggle.

use tauri::{AppHandle, Manager};

/// Show the capture window if hidden, hide it if visible. Centers + focuses on show.
pub fn toggle_capture_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("capture") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let _ = win.center();
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}

#[tauri::command]
pub fn toggle_capture(app: AppHandle) {
    toggle_capture_window(&app);
}

#[tauri::command]
pub fn hide_capture(app: AppHandle) {
    if let Some(win) = app.get_webview_window("capture") {
        let _ = win.hide();
    }
}
