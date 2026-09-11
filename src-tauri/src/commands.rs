// Commands and helpers for the Quick Capture window. The window is declared
// (hidden) in tauri.conf.json; here we toggle/hide it. The capture shortcut
// (registered in lib.rs, and per build mode — see `mode.rs`) and the tray's
// Quick Capture item both route through toggle.

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Emitter, Manager};

/// Whether the user wants Lore in the Dock, so that showing the main window
/// does not quietly undo the preference.
///
/// `show_main` has to decide the activation policy every time it raises the
/// window, and the renderer — which owns preferences — may not be running yet
/// when the tray raises it. Hence a copy on the Rust side, written by
/// `set_dock_visible` and read wherever the policy is set.
pub struct DockPreference(AtomicBool);

impl Default for DockPreference {
    /// On until the renderer says otherwise: the tray can raise the window
    /// before the preference has been read, and a Lore that boots into the Dock
    /// is what every version so far has done.
    fn default() -> Self {
        Self(AtomicBool::new(true))
    }
}

impl DockPreference {
    pub fn get(&self) -> bool {
        self.0.load(Ordering::Relaxed)
    }

    fn set(&self, visible: bool) {
        self.0.store(visible, Ordering::Relaxed);
    }
}

/// The capture shortcut, from wherever the user pressed it.
///
/// With Lore in front, capture belongs inside the window it is already showing,
/// so the main window is asked to toggle its capture drawer. The floating panel
/// is the out-of-app path only — throwing an always-on-top overlay over an app
/// the user is looking at is the thing this avoids.
pub fn toggle_capture_window(app: &AppHandle) {
    if main_window_is_frontmost(app) {
        let _ = app.emit_to("main", "capture:toggle", ());
        return;
    }

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

/// Whether the main window is both on screen and the one taking keystrokes.
/// Visible alone is not enough: Lore may be sitting behind the app the user is
/// actually capturing from, and that is exactly when the panel is wanted.
fn main_window_is_frontmost(app: &AppHandle) -> bool {
    app.get_webview_window("main")
        .map(|win| win.is_visible().unwrap_or(false) && win.is_focused().unwrap_or(false))
        .unwrap_or(false)
}

/// Brings the main window forward on the full Focus surface. The popover calls
/// this rather than emitting, because the main window may be hidden and only
/// Rust can raise it.
#[tauri::command]
pub fn open_focus_mode(app: AppHandle) {
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

/// Moves a folder to the Trash, and reports what went wrong if it cannot.
///
/// The Trash rather than a delete: "Delete local vault" is the most destructive
/// thing in Settings, and the difference between a mistake and a catastrophe is
/// whether the files can be dragged back out.
#[tauri::command]
pub fn trash_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use objc2_foundation::{NSFileManager, NSString, NSURL};

        let url = NSURL::fileURLWithPath(&NSString::from_str(&path));
        NSFileManager::defaultManager()
            .trashItemAtURL_resultingItemURL_error(&url, None)
            .map_err(|e| e.localizedDescription().to_string())
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = path;
        Err("Lore can only move a vault to the Trash on macOS.".into())
    }
}

/// Settings → General → "Show icon in the Dock".
#[tauri::command]
pub fn set_dock_visible(app: AppHandle, visible: bool) {
    app.state::<DockPreference>().set(visible);

    // Dropping the Dock entry while the window is hidden would be the same as
    // hiding it twice; raising it back is the job of `show_main`.
    let showing = app
        .get_webview_window("main")
        .and_then(|win| win.is_visible().ok())
        .unwrap_or(false);
    if showing {
        set_app_visible_in_switcher(&app, visible);
    }
}

/// Settings → General → "Show icon in the menu bar".
#[tauri::command]
pub fn set_tray_visible(app: AppHandle, visible: bool) {
    #[cfg(desktop)]
    if let Some(tray) = app.tray_by_id(crate::focus_tray::TRAY_ID) {
        let _ = tray.set_visible(visible);
    }
    #[cfg(not(desktop))]
    let _ = (app, visible);
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
    let dock = app.state::<DockPreference>().get();
    set_app_visible_in_switcher(app, dock);

    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }

    // An Accessory app is not in the activation order, so `set_focus` alone
    // leaves the window behind whatever the user was looking at. With the Dock
    // icon on, the policy change above has already brought Lore forward.
    #[cfg(target_os = "macos")]
    if !dock {
        activate_app();
    }
}

/// Brings Lore forward without a Dock tile to click.
#[cfg(target_os = "macos")]
fn activate_app() {
    use objc2::MainThreadMarker;
    use objc2_app_kit::NSApplication;

    let Some(marker) = MainThreadMarker::new() else {
        return;
    };
    #[allow(deprecated)]
    NSApplication::sharedApplication(marker).activateIgnoringOtherApps(true);
}

/// Hide the main window and drop out of the Dock and Cmd-Tab; the tray icon
/// stays, and is the way back in. With the tray icon hidden too, the capture
/// shortcut is — which is why Settings refuses to turn off the last of them.
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

    use crate::focus_tray::{self, FocusTray, TRAY_ID};

    let capture = MenuItem::with_id(
        app,
        "capture",
        "Quick Capture",
        true,
        Some(crate::mode::CAPTURE_SHORTCUT),
    )?;
    let focus = MenuItem::with_id(app, "focus", "Start Focus", true, Some("Alt+Shift+F"))?;
    let stop = MenuItem::with_id(app, "stopfocus", "Stop Focus", false, None::<&str>)?;
    let focus_mode = MenuItem::with_id(app, "focusmode", "Open Focus mode", true, None::<&str>)?;
    let name = crate::mode::PRODUCT_NAME;
    let open = MenuItem::with_id(app, "open", format!("Open {name}"), true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", format!("Quit {name}"), true, Some("Cmd+Q"))?;
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

    // Held so the countdown can rename Start/Pause and enable Stop, and so the
    // right-click can put the menu on the status item for as long as it is open.
    app.state::<FocusTray>()
        .set_menu_items(focus.clone(), stop.clone());
    app.state::<FocusTray>().set_menu(menu);

    let tray = TrayIconBuilder::with_id(TRAY_ID)
        // The retina master; macOS scales it down for the 1x menu bar.
        .icon(crate::focus_tray::idle_icon())
        .tooltip(name)
        // No menu here on purpose: a menu attached to the status item makes
        // AppKit report every click on it as a right-click, so the left click
        // never arrives. `focus_tray::popup_menu` lends it out per right-click.
        .on_tray_icon_event(|tray, event| match event {
            TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } => {
                let position = rect.position.to_physical::<f64>(1.0);
                let size = rect.size.to_physical::<f64>(1.0);
                focus_tray::toggle_panel(
                    tray.app_handle(),
                    position.x + size.width / 2.0,
                    position.y + size.height,
                );
            }
            TrayIconEvent::Click {
                button: MouseButton::Right,
                button_state: MouseButtonState::Down,
                ..
            } => focus_tray::popup_menu(tray),
            _ => {}
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
    // light and dark appearances, per the identity's menu-bar spec. A labelled
    // build opts out: template mode forces monochrome, which would throw away
    // the tint that tells dev and agent apart.
    #[cfg(target_os = "macos")]
    tray.set_icon_as_template(crate::mode::is_prod())?;
    #[cfg(not(target_os = "macos"))]
    let _ = &tray;

    Ok(())
}
