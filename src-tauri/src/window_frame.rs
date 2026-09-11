use std::sync::Mutex;

use objc2_app_kit::{NSWindow, NSWindowButton, NSWindowStyleMask, NSWindowTitleVisibility};
use tauri::{Manager, WebviewWindow, Window};

/// The height `TitleBar` gives the bar until it has measured its own, which it
/// does as soon as it mounts. Matches the `h-[46px]` the component starts with.
const DEFAULT_BAR_HEIGHT: f64 = 46.0;

/// The bar height the window buttons are currently centred in.
///
/// AppKit lays the titlebar out again on every resize, dropping the height set
/// here, so the last value the frontend reported has to be kept to re-apply.
pub struct TitleBarHeight(Mutex<f64>);

impl Default for TitleBarHeight {
    fn default() -> Self {
        Self(Mutex::new(DEFAULT_BAR_HEIGHT))
    }
}

/// Gives a `decorations: false` window the system's own frame and controls.
///
/// Clearing the decorations also clears the `Titled` style mask, and macOS
/// draws an untitled window as a square, shadowless box with no window buttons
/// — which is why Lore's edges look drawn-on beside a native app. Putting
/// `Titled` back, with the titlebar transparent and `FullSizeContentView` so
/// the webview still reaches the frame, buys the system radius, the system
/// shadow and the three real traffic lights, which no drawn copy matches: the
/// glyphs on hover, the grey of an unfocused window, ⌥-click, and a green
/// button that takes the window to its own Space.
pub fn adopt_system_frame(window: &Window) {
    let Some(ns_window) = ns_window(window) else {
        return;
    };

    // `Closable` goes back with the rest: dropping the decorations dropped it
    // too, and the system draws a close button it will not let you press.
    ns_window.setStyleMask(
        ns_window.styleMask()
            | NSWindowStyleMask::Titled
            | NSWindowStyleMask::FullSizeContentView
            | NSWindowStyleMask::Closable,
    );
    ns_window.setTitlebarAppearsTransparent(true);
    ns_window.setTitleVisibility(NSWindowTitleVisibility::Hidden);

    center_buttons(window, DEFAULT_BAR_HEIGHT);
}

/// Re-centres the buttons in the height last reported, after AppKit has laid
/// the titlebar out for a new window size.
pub fn restore_button_position(window: &Window) {
    let height = window
        .state::<TitleBarHeight>()
        .0
        .lock()
        .map(|height| *height)
        .unwrap_or(DEFAULT_BAR_HEIGHT);

    center_buttons(window, height);
}

/// Centres the three window buttons in a bar of `height` points.
///
/// The system sizes the titlebar for its own 28pt bar and sits the buttons near
/// the bottom of it, which leaves them riding high over a bar as tall as
/// Lore's. Growing the container view is what makes room for them; their own
/// frames are then set, because AppKit does not centre them in it.
fn center_buttons(window: &Window, height: f64) {
    let Some(ns_window) = ns_window(window) else {
        return;
    };

    // Fullscreen hands the buttons to the auto-hiding titlebar, which places
    // them itself; the bar has no room kept for them there either.
    if ns_window
        .styleMask()
        .contains(NSWindowStyleMask::FullScreen)
    {
        return;
    }

    let buttons: Vec<_> = [
        NSWindowButton::CloseButton,
        NSWindowButton::MiniaturizeButton,
        NSWindowButton::ZoomButton,
    ]
    .into_iter()
    .filter_map(|button| ns_window.standardWindowButton(button))
    .collect();

    let Some(close) = buttons.first() else {
        return;
    };

    // A button sits in an `NSTitlebarView`, itself inside the
    // `NSTitlebarContainerView` that spans the top of the frame.
    // SAFETY: reading a view's superview, on the main thread.
    let views = unsafe {
        close
            .superview()
            .and_then(|titlebar| titlebar.superview().map(|container| (titlebar, container)))
    };

    let Some((titlebar, container)) = views else {
        return;
    };

    let mut frame = container.frame();
    frame.size.height = height;
    // The frame's origin is its bottom-left, so the bar hangs from the top.
    frame.origin.y = ns_window.frame().size.height - height;
    container.setFrame(frame);

    let titlebar_y = titlebar.frame().origin.y;

    for button in &buttons {
        let mut frame = button.frame();
        // Half the bar up from the container's bottom edge is its middle.
        frame.origin.y = height / 2.0 - frame.size.height / 2.0 - titlebar_y;
        button.setFrame(frame);
    }
}

fn ns_window(window: &Window) -> Option<&NSWindow> {
    let handle = window
        .ns_window()
        .inspect_err(|e| eprintln!("lore: no NSWindow behind {}: {e}", window.label()))
        .ok()?;

    // SAFETY: the handle is the window's own NSWindow, and every caller runs on
    // the main thread, which is where AppKit requires these calls.
    Some(unsafe { &*(handle as *const NSWindow) })
}

/// Reports the bar's measured height, so the buttons sit centred in it whatever
/// the Text size preference has done to it.
#[tauri::command]
pub fn set_title_bar_height(window: WebviewWindow, height: f64) {
    if let Ok(mut stored) = window.state::<TitleBarHeight>().0.lock() {
        *stored = height;
    }
    center_buttons(&window.as_ref().window(), height);
}
