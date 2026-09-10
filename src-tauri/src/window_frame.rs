use objc2_app_kit::{NSWindow, NSWindowButton, NSWindowStyleMask, NSWindowTitleVisibility};
use tauri::WebviewWindow;

/// Gives a `decorations: false` window the system's own corners and shadow.
///
/// Clearing the decorations also clears the `Titled` style mask, and macOS
/// draws an untitled window as a square, shadowless box — which is why Lore's
/// edges look drawn-on beside a native app. Putting `Titled` back, with the
/// titlebar transparent and `FullSizeContentView` so the webview still reaches
/// the frame, buys the system radius and shadow without giving the window a
/// titlebar to show. The three standard buttons are hidden because `TitleBar`
/// draws its own in the place they would take.
pub fn adopt_system_frame(window: &WebviewWindow) {
    let Ok(handle) = window.ns_window() else {
        eprintln!(
            "lore: no NSWindow behind {}; its frame stays square",
            window.label()
        );
        return;
    };

    // SAFETY: the handle is the window's own NSWindow, and `setup` runs on the
    // main thread, which is where AppKit requires every call below.
    let ns_window: &NSWindow = unsafe { &*(handle as *const NSWindow) };

    ns_window.setStyleMask(
        ns_window.styleMask() | NSWindowStyleMask::Titled | NSWindowStyleMask::FullSizeContentView,
    );
    ns_window.setTitlebarAppearsTransparent(true);
    ns_window.setTitleVisibility(NSWindowTitleVisibility::Hidden);

    for button in [
        NSWindowButton::CloseButton,
        NSWindowButton::MiniaturizeButton,
        NSWindowButton::ZoomButton,
    ] {
        if let Some(button) = ns_window.standardWindowButton(button) {
            button.setHidden(true);
        }
    }
}
