// The focus session in the menu bar: the countdown beside the tray icon, the
// stopwatch it swaps to while a session runs, and the popover panel the icon
// opens.
//
// The phase machine lives in the renderer (see `store/useStore.ts`); this only
// draws it. The main window pushes a snapshot on every change; Rust caches it,
// paints the tray from it, and forwards it to the popover window, which is a
// thin remote control rather than a second copy of the timer.
//
// **One task paints the tray, and nothing else ever does.** `sync_focus` only
// writes what should be showing and returns; a single loop, started once at
// launch, reads that and paints. Two earlier attempts had `sync_focus` paint
// too, and both were wrong: a per-update ticker could repaint a stale countdown
// after a stop had cleared it, and guarding that with a lock deadlocked the app,
// because painting the tray blocks on the main thread and the main thread was
// waiting for the lock. With a single painter there is no ordering to get wrong
// and no lock is held across a paint.
//
// The countdown is Rust's rather than pushed frame by frame: the renderer hands
// over the instant the interval ends and this loop counts down to it, because a
// hidden window has its timers throttled to about once a minute — exactly when
// the menu bar matters. When it reaches zero Rust emits `focus:elapsed` at the
// main window; events are not throttled the way timers are, so that wakes the
// renderer to roll the phase over even while it is hidden.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, PoisonError};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use tauri::image::Image;
use tauri::menu::MenuItem;
use tauri::{AppHandle, Emitter, LogicalPosition, Manager, Wry};

pub const TRAY_ID: &str = "lore-tray";
pub const PANEL_LABEL: &str = "focus";

/// Gap between the menu bar and the top of the popover, in logical pixels.
const PANEL_GAP: f64 = 6.0;

/// How often the painter looks at the clock. Faster than once a second so the
/// title turns over within a frame or two of the second boundary the window
/// draws on; `TICK_MS` in `useFocusTimer.ts` is the same number.
const TICK: Duration = Duration::from_millis(250);

fn idle_icon() -> Image<'static> {
    tauri::include_image!("icons/tray@2x.png")
}

fn running_icon() -> Image<'static> {
    tauri::include_image!("icons/tray-focus@2x.png")
}

/// What the renderer says should be on the tray. `None` means nothing at all.
#[derive(Clone)]
struct Session {
    /// Epoch ms the interval ends at, while it runs.
    ends_at_ms: Option<i64>,
    label: String,
    /// Authoritative when the interval is not running.
    remaining_sec: i64,
    running: bool,
}

/// What the tray actually shows. Compared against the last paint so the loop
/// only calls into AppKit when something changed.
#[derive(Clone, PartialEq)]
struct TrayView {
    running: bool,
    title: Option<String>,
    tooltip: String,
}

#[derive(Default)]
pub struct FocusTray {
    /// Whether the last update had a session to stop, so `sync_focus` can spot
    /// the edge where one ends. See `on_focus_stopped`.
    was_stoppable: AtomicBool,
    /// What the painter last put on the tray, so it can skip a redundant call
    /// into AppKit. It lives here rather than inside the loop so a reset can
    /// clear it: a painter that only diffs against its own last view can never
    /// be told the tray is showing something it did not paint.
    painted: Mutex<Option<TrayView>>,
    session: Mutex<Option<Session>>,
    /// Last state the main window pushed, replayed to the panel when it opens.
    snapshot: Mutex<Option<serde_json::Value>>,
    /// The tray menu's stop line, disabled until there is a session to end.
    stop_item: Mutex<Option<MenuItem<Wry>>>,
    /// The tray menu's start/pause line, kept so its label can follow the timer.
    toggle_item: Mutex<Option<MenuItem<Wry>>>,
}

impl FocusTray {
    pub fn set_menu_items(&self, toggle: MenuItem<Wry>, stop: MenuItem<Wry>) {
        if let Ok(mut slot) = self.toggle_item.lock() {
            *slot = Some(toggle);
        }
        if let Ok(mut slot) = self.stop_item.lock() {
            *slot = Some(stop);
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

/// Seconds left, rounded up — the same arithmetic as `remainingSeconds` in
/// `lib/focusTimer.ts`. Rounding differently is what put the menu bar and the
/// window a second apart.
fn remaining_at(ends_at_ms: i64, now_ms: i64) -> i64 {
    let remaining = ends_at_ms - now_ms;
    if remaining <= 0 {
        return 0;
    }
    (remaining + 999) / 1000
}

fn view_for(session: Option<&Session>) -> TrayView {
    let Some(session) = session else {
        return TrayView {
            running: false,
            title: None,
            tooltip: "Lore".into(),
        };
    };

    let remaining = match session.ends_at_ms.filter(|_| session.running) {
        Some(ends_at) => remaining_at(ends_at, now_ms()),
        None => session.remaining_sec,
    };
    let text = clock(remaining);
    let label = &session.label;

    TrayView {
        running: session.running,
        title: Some(text.clone()),
        tooltip: if session.running {
            format!("{label} · {text} left")
        } else {
            format!("{label} · {text} · paused")
        },
    }
}

/// Draws a view onto the tray icon. Errors are logged rather than discarded:
/// these calls reach AppKit, and a silently dropped one leaves the menu bar
/// showing a state nothing in this file believes is on screen.
fn paint(app: &AppHandle, view: &TrayView) {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        eprintln!("focus tray: no tray with id {TRAY_ID} to paint");
        return;
    };
    let icon = if view.running {
        running_icon()
    } else {
        idle_icon()
    };
    if let Err(e) = tray.set_icon(Some(icon)) {
        eprintln!("focus tray: set_icon failed: {e}");
    }
    // Setting an icon clears the template flag, so the menu bar would stop
    // inverting the mark for a light appearance without this.
    #[cfg(target_os = "macos")]
    if let Err(e) = tray.set_icon_as_template(true) {
        eprintln!("focus tray: set_icon_as_template failed: {e}");
    }

    // An empty string, not `None`: tray-icon's macOS backend only touches the
    // status item when a title is given, so `set_title(None)` returns Ok and
    // leaves the last countdown frozen in the menu bar.
    if let Err(e) = tray.set_title(Some(view.title.as_deref().unwrap_or(""))) {
        eprintln!("focus tray: set_title failed: {e}");
    }
    if let Err(e) = tray.set_tooltip(Some(&view.tooltip)) {
        eprintln!("focus tray: set_tooltip failed: {e}");
    }
}

/// ---------------------------------------------------------------------------
/// PLACEHOLDER — runs once, the moment a focus session is stopped.
///
/// This is the edge where the stopwatch leaves the menu bar for good: it fires
/// for a real stop (the ■ button, or Stop Focus in the tray menu), and *not* for
/// a pause, which takes the countdown down but keeps the session alive.
///
/// It resets the tray first, so the menu bar is back to the plain mark within a
/// tick. Add whatever you want to test after that.
///
/// Called from `sync_focus`, on whichever thread the renderer's IPC landed on —
/// so keep it quick, or spawn with `tauri::async_runtime::spawn` for anything
/// slow. Do not paint the tray from here: a synchronous command runs on the main
/// thread, and the AppKit call goes nowhere. Change what the painter reads —
/// `reset_tray` is the example — and let it draw.
/// ---------------------------------------------------------------------------
fn on_focus_stopped(app: &AppHandle) {
    reset_tray(app);

    // TODO: test code goes here.

    println!("focus stopped");
}

/// Drops the session and forces the painter to redraw, putting the tray back to
/// its resting state — plain mark, no title — on its next pass.
///
/// It clears `painted` as well as `session`. Clearing the session alone is not
/// enough: the painter skips a redraw whenever the view it computes matches the
/// one it last painted, so a tray already believed to be at rest would never be
/// repainted, and anything else that reached the menu bar would stay there.
/// This does not paint itself — painting from a command runs on the main thread,
/// where the AppKit call is dropped, which is the whole reason a single painter
/// owns the tray.
pub fn reset_tray(app: &AppHandle) {
    let state = app.state::<FocusTray>();
    *state.session.lock().unwrap_or_else(PoisonError::into_inner) = None;
    *state.painted.lock().unwrap_or_else(PoisonError::into_inner) = None;
}

/// The one and only painter. Started once, at launch.
pub fn start_painter(app: &AppHandle) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        // Which interval's end has already been announced, so a session sitting
        // at zero does not emit on every pass.
        let mut announced: Option<i64> = None;

        loop {
            // Both locks are released before painting: a paint blocks on the main
            // thread, and the main thread must never be waiting on either.
            let (session, painted) = {
                let state = app.state::<FocusTray>();
                let session = state
                    .session
                    .lock()
                    .unwrap_or_else(PoisonError::into_inner)
                    .clone();
                let painted = state
                    .painted
                    .lock()
                    .unwrap_or_else(PoisonError::into_inner)
                    .clone();
                (session, painted)
            };

            let view = view_for(session.as_ref());
            if painted.as_ref() != Some(&view) {
                paint(&app, &view);
                *app.state::<FocusTray>()
                    .painted
                    .lock()
                    .unwrap_or_else(PoisonError::into_inner) = Some(view);
            }

            if let Some(ends_at) = session
                .as_ref()
                .filter(|s| s.running)
                .and_then(|s| s.ends_at_ms)
            {
                if now_ms() >= ends_at && announced != Some(ends_at) {
                    announced = Some(ends_at);
                    let _ = app.emit_to("main", "focus:elapsed", ());
                }
            }

            tokio::time::sleep(TICK).await;
        }
    });
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

/// Records what the tray should show, and hands the popover the new snapshot.
/// Paints nothing itself — the painter picks this up on its next pass.
///
/// `show` is false whenever the menu bar should be bare, which is every state
/// but a running interval: pausing and stopping both take the countdown down.
#[tauri::command]
pub fn sync_focus(
    app: AppHandle,
    can_stop: bool,
    ends_at_ms: Option<f64>,
    label: String,
    remaining_sec: i64,
    running: bool,
    show: bool,
    snapshot: serde_json::Value,
) {
    let state = app.state::<FocusTray>();

    if let Ok(mut slot) = state.session.lock() {
        *slot = show.then(|| Session {
            ends_at_ms: ends_at_ms.map(|ms| ms as i64),
            label,
            remaining_sec,
            running,
        });
    }

    // After the session is stored, not before: `on_focus_stopped` clears what
    // the painter reads, and running it first would let the write above put a
    // session straight back.
    //
    // `can_stop` falls from true to false exactly once per session, when it
    // ends — a pause leaves it true, so this is the stop edge and nothing else.
    if state.was_stoppable.swap(can_stop, Ordering::SeqCst) && !can_stop {
        on_focus_stopped(&app);
    }

    if let Ok(mut slot) = state.snapshot.lock() {
        *slot = Some(snapshot.clone());
    }
    let _ = app.emit_to(PANEL_LABEL, "focus:state", snapshot);

    if let Ok(slot) = state.toggle_item.lock() {
        if let Some(item) = slot.as_ref() {
            let _ = item.set_text(if running {
                "Pause Focus"
            } else {
                "Start Focus"
            });
        }
    }
    {
        let slot = state.stop_item.lock();
        if let Ok(slot) = slot {
            if let Some(item) = slot.as_ref() {
                let _ = item.set_enabled(can_stop);
            }
        }
    }
}

/// Opens the popover under the tray icon, or closes it if it is already up.
///
/// The icon's rectangle arrives in physical pixels; the panel is centred on it
/// and clamped so it cannot hang off either edge of the screen.
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
