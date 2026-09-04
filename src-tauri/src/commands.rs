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

/// macOS only: `Accessory` keeps Lore in the menu bar but out of the Dock and
/// the Cmd-Tab switcher; `Regular` puts it back. The quick-capture overlay
/// stays Accessory on purpose — only the main window earns a Dock entry.
fn set_app_visible_in_switcher(app: &AppHandle, visible: bool) {
    #[cfg(target_os = "macos")]
    {
        use tauri::ActivationPolicy;

        let policy = match visible {
            true => ActivationPolicy::Regular,
            false => ActivationPolicy::Accessory,
        };
        let _ = app.set_activation_policy(policy);
    }
    #[cfg(not(target_os = "macos"))]
    let _ = (app, visible);
}

/// Bring the main window back, restoring the Dock/Cmd-Tab entry first so the
/// window can actually come to the front instead of opening behind other apps.
pub fn show_main(app: &AppHandle) {
    set_app_visible_in_switcher(app, true);

    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
}

/// Hide the main window and drop out of the Dock and Cmd-Tab; the tray icon
/// stays, and is the way back in.
pub fn hide_main(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }

    set_app_visible_in_switcher(app, false);
}

/// System-tray icon with a menu: Quick Capture · focus · Open Lore · Quit.
/// Left-clicking the tray icon toggles the capture window.
///
/// The focus lines only ask the main window to act — the timer's state lives in
/// the renderer, and `focus_tray` paints the countdown back onto this icon.
#[cfg(desktop)]
pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    use tauri::menu::{MenuBuilder, MenuItem};
    use tauri::tray::TrayIconBuilder;
    use tauri::Emitter;

    use crate::focus_tray::{FocusTray, TRAY_ID};

    let capture = MenuItem::with_id(app, "capture", "Quick Capture", true, Some("Alt+Space"))?;
    let focus = MenuItem::with_id(app, "focus", "Start Focus", true, Some("Alt+Shift+F"))?;
    let focus_mode = MenuItem::with_id(app, "focusmode", "Open Focus mode", true, None::<&str>)?;
    let open = MenuItem::with_id(app, "open", "Open Lore", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Lore", true, Some("Cmd+Q"))?;
    let menu = MenuBuilder::new(app)
        .item(&capture)
        .separator()
        .item(&focus)
        .item(&focus_mode)
        .separator()
        .item(&open)
        .item(&quit)
        .build()?;

    // Held so the countdown can rename it between Start and Pause.
    app.state::<FocusTray>().set_toggle_item(focus.clone());

    // Left-click opens the menu (macOS-standard); the user picks an action.
    let tray = TrayIconBuilder::with_id(TRAY_ID)
        // The retina master; macOS scales it down for the 1x menu bar.
        .icon(tauri::include_image!("icons/tray@2x.png"))
        .tooltip("Lore")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "capture" => toggle_capture_window(app),
            "focus" => {
                let _ = app.emit_to("main", "focus:toggle", ());
            }
            "focusmode" => {
                show_main(app);
                let _ = app.emit_to("main", "focus:mode", ());
            }
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
