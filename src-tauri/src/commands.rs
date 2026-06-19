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

fn show_main(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

/// System-tray icon with a menu: Quick Capture · Open Baloon · Quit.
/// Left-clicking the tray icon toggles the capture window.
#[cfg(desktop)]
pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    use tauri::menu::{MenuBuilder, MenuItem};
    use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};

    let capture = MenuItem::with_id(app, "capture", "Quick Capture", true, Some("Alt+Space"))?;
    let open = MenuItem::with_id(app, "open", "Open Baloon", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Baloon", true, Some("Cmd+Q"))?;
    let menu = MenuBuilder::new(app)
        .item(&capture)
        .item(&open)
        .separator()
        .item(&quit)
        .build()?;

    TrayIconBuilder::with_id("baloon-tray")
        .icon(tauri::include_image!("icons/32x32.png"))
        .tooltip("Baloon")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "capture" => toggle_capture_window(app),
            "open" => show_main(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                ..
            } = event
            {
                toggle_capture_window(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}
