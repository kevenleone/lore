// The focus countdown in the menu bar.
//
// The phase machine lives in the renderer (see `store/useStore.ts`); this only
// draws it. The renderer hands over the instant the interval ends and Rust
// counts down to it, rather than pushing a new title every second — a hidden
// window has its timers throttled to about once a minute, which is exactly when
// the tray clock matters most.
//
// When the countdown reaches zero Rust emits `focus:elapsed` at the main
// window. Events are not throttled the way timers are, so that wakes the
// renderer to roll the phase over even while it is hidden.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use tauri::menu::MenuItem;
use tauri::{AppHandle, Emitter, Manager, Wry};

pub const TRAY_ID: &str = "lore-tray";

#[derive(Default)]
pub struct FocusTray {
    /// Bumped on every update so an in-flight ticker knows it is stale and exits.
    generation: AtomicU64,
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

/// Mirrors the renderer's focus state into the menu bar.
///
/// `ends_at_ms` is set only while the interval runs; when it is paused the
/// renderer sends the frozen `remaining_sec` instead. `show` is false when the
/// timer is sitting untouched at a full interval, which leaves the tray as a
/// plain icon.
#[tauri::command]
pub fn set_focus_tray(
    app: AppHandle,
    ends_at_ms: Option<f64>,
    label: String,
    remaining_sec: i64,
    running: bool,
    show: bool,
) {
    let state = app.state::<FocusTray>();
    // Claim this update; any ticker still running for an older one now exits.
    let generation = state.generation.fetch_add(1, Ordering::SeqCst) + 1;

    if let Ok(slot) = state.toggle_item.lock() {
        if let Some(item) = slot.as_ref() {
            let _ = item.set_text(if running { "Pause Focus" } else { "Start Focus" });
        }
    }

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
