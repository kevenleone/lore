// The focus session in the menu bar: the countdown beside the tray icon, the
// icon swap while a session runs, and the popover panel the icon opens.
//
// The phase machine lives in the renderer (see `store/useStore.ts`); this only
// draws it. The main window pushes a snapshot on every change; Rust caches it,
// paints the tray from it, and forwards it to the popover window, which is a
// thin remote control rather than a second copy of the timer.
//
// The countdown itself is Rust's: the renderer hands over the instant the
// interval ends and Rust counts down to it, because a hidden window has its
// timers throttled to about once a minute — exactly when the menu bar matters.
// When the countdown reaches zero Rust emits `focus:elapsed` at the main
// window; events are not throttled the way timers are, so that wakes the
// renderer to roll the phase over even while it is hidden.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use tauri::image::Image;
use tauri::menu::MenuItem;
use tauri::{AppHandle, Emitter, LogicalPosition, Manager, Wry};

pub const TRAY_ID: &str = "lore-tray";
pub const PANEL_LABEL: &str = "focus";

/// Gap between the menu bar and the top of the popover, in logical pixels.
const PANEL_GAP: f64 = 6.0;

fn idle_icon() -> Image<'static> {
    tauri::include_image!("icons/tray@2x.png")
}

fn running_icon() -> Image<'static> {
    tauri::include_image!("icons/tray-focus@2x.png")
}

#[derive(Default)]
pub struct FocusTray {
    /// Bumped on every update so an in-flight ticker knows it is stale and exits.
    generation: AtomicU64,
    /// Last state the main window pushed, replayed to the panel when it opens.
    snapshot: Mutex<Option<serde_json::Value>>,
    /// The tray menu's start/pause line, kept so its label can follow the timer.
    toggle_item: Mutex<Option<MenuItem<Wry>>>,
}

impl FocusTray {
    pub fn set_toggle_item(&self, item: MenuItem<Wry>) {
        if let Ok(mut slot) = self.toggle_item.lock() {
            *slot = Some(item);
        }
    }
}

fn clock(seconds: i64) -> String {
    let total = seconds.max(0);
    format!("{:02}:{:02}", total / 60, total % 60)
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Writes the title beside the tray icon. macOS is the only platform that shows
/// one; elsewhere the tooltip carries the same text.
fn paint(app: &AppHandle, title: Option<&str>, tooltip: &str) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_title(title);
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

/// Swaps the menu-bar mark for the stopwatch while a session runs.
fn paint_icon(app: &AppHandle, running: bool) {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return;
    };
    let _ = tray.set_icon(Some(if running { running_icon() } else { idle_icon() }));
    // Setting an icon clears the template flag, so the menu bar would stop
    // inverting the mark for a light appearance without this.
    #[cfg(target_os = "macos")]
    let _ = tray.set_icon_as_template(true);
}

/// The last state the main window pushed. The popover asks for this on open, so
/// it renders the running timer immediately instead of a blank frame.
#[tauri::command]
pub fn focus_snapshot(app: AppHandle) -> Option<serde_json::Value> {
    app.state::<FocusTray>()
        .snapshot
        .lock()
        .ok()
        .and_then(|s| s.clone())
}

/// Mirrors the renderer's focus state into the menu bar and the popover.
///
/// `ends_at_ms` is set only while the interval runs; when it is paused the
/// renderer sends the frozen `remaining_sec` instead. `show` is false when the
/// timer is sitting untouched at a full interval, which leaves the tray as a
/// plain icon.
#[tauri::command]
pub fn sync_focus(
    app: AppHandle,
    ends_at_ms: Option<f64>,
    label: String,
    remaining_sec: i64,
    running: bool,
    show: bool,
    snapshot: serde_json::Value,
) {
    let state = app.state::<FocusTray>();
    // Claim this update; any ticker still running for an older one now exits.
    let generation = state.generation.fetch_add(1, Ordering::SeqCst) + 1;

    if let Ok(mut slot) = state.snapshot.lock() {
        *slot = Some(snapshot.clone());
    }
    let _ = app.emit_to(PANEL_LABEL, "focus:state", snapshot);

    if let Ok(slot) = state.toggle_item.lock() {
        if let Some(item) = slot.as_ref() {
            let _ = item.set_text(if running { "Pause Focus" } else { "Start Focus" });
        }
    }

    paint_icon(&app, running);

    if !show {
        paint(&app, None, "Lore");
        return;
    }

    let Some(ends_at) = ends_at_ms.filter(|_| running) else {
        let text = clock(remaining_sec);
        paint(&app, Some(&text), &format!("{label} · {text} · paused"));
        return;
    };

    let ends_at = ends_at as i64;
    tauri::async_runtime::spawn(async move {
        loop {
            // Another update landed while we slept — that call owns the tray now.
            if app.state::<FocusTray>().generation.load(Ordering::SeqCst) != generation {
                return;
            }

            let remaining = (ends_at - now_ms() + 999) / 1000;
            let text = clock(remaining);
            paint(&app, Some(&text), &format!("{label} · {text} left"));

            if remaining <= 0 {
                let _ = app.emit_to("main", "focus:elapsed", ());
                return;
            }

            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    });
}

/// Opens the popover under the tray icon, or closes it if it is already up.
///
/// `icon_rect` is where the menu bar drew the icon, in physical pixels; the
/// panel is centred on it and clamped so it cannot hang off either edge of the
/// screen.
pub fn toggle_panel(app: &AppHandle, icon_center_x: f64, icon_bottom_y: f64) {
    let Some(win) = app.get_webview_window(PANEL_LABEL) else {
        return;
    };

    if win.is_visible().unwrap_or(false) {
        let _ = win.hide();
        return;
    }

    if let Ok(size) = win.outer_size() {
        let scale = win.scale_factor().unwrap_or(1.0);
        let width = size.width as f64 / scale;
        let mut x = icon_center_x / scale - width / 2.0;
        let y = icon_bottom_y / scale + PANEL_GAP;

        if let Ok(Some(monitor)) = win.current_monitor() {
            let screen = monitor.size().width as f64 / monitor.scale_factor();
            let margin = 8.0;
            x = x.clamp(margin, (screen - width - margin).max(margin));
        }

        let _ = win.set_position(LogicalPosition::new(x, y));
    }

    let _ = win.show();
    let _ = win.set_focus();
}

pub fn hide_panel(app: &AppHandle) {
    if let Some(win) = app.get_webview_window(PANEL_LABEL) {
        let _ = win.hide();
    }
}
