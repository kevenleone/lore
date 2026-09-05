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

/// Brings the main window forward on the full Focus surface. The popover calls
/// this rather than emitting, because the main window may be hidden and only
/// Rust can raise it.
#[tauri::command]
pub fn open_focus_mode(app: AppHandle) {
    use tauri::Emitter;

    crate::focus_tray::hide_panel(&app);
    show_main(&app);
    let _ = app.emit_to("main", "focus:mode", ());
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

/// System-tray icon. Left-clicking it opens the focus popover under the icon —
/// `Lore Settings.dc.html` frame 1e, where the timer lives in the menu bar and
/// never takes the screen. Right-click (or Control-click) opens the menu.
///
/// The menu's focus lines only ask the main window to act — the timer's state
/// lives in the renderer, and `focus_tray` paints it back onto this icon.
#[cfg(desktop)]
pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    use tauri::menu::{MenuBuilder, MenuItem};
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
    use tauri::Emitter;

    use crate::focus_tray::{self, FocusTray, TRAY_ID};

    let capture = MenuItem::with_id(app, "capture", "Quick Capture", true, Some("Alt+Space"))?;
    let focus = MenuItem::with_id(app, "focus", "Start Focus", true, Some("Alt+Shift+F"))?;
    let stop = MenuItem::with_id(app, "stopfocus", "Stop Focus", false, None::<&str>)?;
    let focus_mode = MenuItem::with_id(app, "focusmode", "Open Focus mode", true, None::<&str>)?;
    let open = MenuItem::with_id(app, "open", "Open Lore", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Lore", true, Some("Cmd+Q"))?;
    let menu = MenuBuilder::new(app)
        .item(&capture)
        .separator()
        .item(&focus)
        .item(&stop)
        .item(&focus_mode)
        .separator()
        .item(&open)
        .item(&quit)
        .build()?;

    // Held so the countdown can rename Start/Pause and enable Stop.
    app.state::<FocusTray>()
        .set_menu_items(focus.clone(), stop.clone());

    // Left-click opens the menu (macOS-standard); the user picks an action.
    let tray = TrayIconBuilder::with_id(TRAY_ID)
        // The retina master; macOS scales it down for the 1x menu bar.
        .icon(tauri::include_image!("icons/tray@2x.png"))
        .tooltip("Lore")
        .menu(&menu)
        // The menu is the right-click gesture; a left click is the popover.
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } = event
            {
                let position = rect.position.to_physical::<f64>(1.0);
                let size = rect.size.to_physical::<f64>(1.0);
                focus_tray::toggle_panel(
                    tray.app_handle(),
                    position.x + size.width / 2.0,
                    position.y + size.height,
                );
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "capture" => toggle_capture_window(app),
            "focus" => {
                let _ = app.emit_to("main", "focus:toggle", ());
            }
            // The renderer owns the timer, so this only asks. The stop comes
            // back through `sync_focus`, which is where `on_focus_stopped` runs.
            "stopfocus" => {
                let _ = app.emit_to("main", "focus:stop", ());
            }
            "focusmode" => {
                focus_tray::hide_panel(app);
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
