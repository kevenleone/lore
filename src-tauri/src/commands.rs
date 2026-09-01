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

/// System-tray icon with a menu: Quick Capture · Open Lore · Quit.
/// Left-clicking the tray icon toggles the capture window.
#[cfg(desktop)]
pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    use tauri::menu::{MenuBuilder, MenuItem};
    use tauri::tray::TrayIconBuilder;

    let capture = MenuItem::with_id(app, "capture", "Quick Capture", true, Some("Alt+Space"))?;
    let open = MenuItem::with_id(app, "open", "Open Lore", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Lore", true, Some("Cmd+Q"))?;
    let menu = MenuBuilder::new(app)
        .item(&capture)
        .item(&open)
        .separator()
        .item(&quit)
        .build()?;

    // Left-click opens the menu (macOS-standard); the user picks an action.
    let tray = TrayIconBuilder::with_id("lore-tray")
        // The retina master; macOS scales it down for the 1x menu bar.
        .icon(tauri::include_image!("icons/tray@2x.png"))
        .tooltip("Lore")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "capture" => toggle_capture_window(app),
            "open" => show_main(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    // The mark ships as a monochrome template so the menu bar inverts it for
    // light and dark appearances, per the identity's menu-bar spec.
    #[cfg(target_os = "macos")]
    tray.set_icon_as_template(true)?;
    #[cfg(not(target_os = "macos"))]
    let _ = &tray;

    Ok(())
}
