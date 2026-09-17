use std::ptr::NonNull;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

use block2::RcBlock;
use objc2::rc::Retained;
use objc2_app_kit::{
    NSButton, NSView, NSViewFrameDidChangeNotification, NSWindow, NSWindowButton,
    NSWindowStyleMask, NSWindowTitleVisibility,
};
use objc2_foundation::{NSNotification, NSNotificationCenter, NSOperationQueue};
use tauri::{Manager, WebviewWindow, Window};

/// The height `TitleBar` gives the bar until it has measured its own, which it
/// does as soon as it mounts. Matches the `h-[46px]` the component starts with.
const DEFAULT_BAR_HEIGHT: f64 = 46.0;

/// The bar height the window buttons are currently centred in.
///
/// AppKit lays the titlebar out again whenever it likes, dropping the frames set
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
    follow_titlebar_layout(window);
}

/// A re-centring is queued and has not run yet.
static QUEUED: AtomicBool = AtomicBool::new(false);

/// Re-centres the buttons after every titlebar layout pass.
///
/// AppKit puts the buttons back where it wants them on its own layout passes,
/// not only on a resize, and most of those raise no window event. Their frames
/// report each move; the fix is queued on the main queue so it lands after
/// AppKit's pass, not inside it, where the pass would undo it again.
fn follow_titlebar_layout(window: &Window) {
    let Some(ns_window) = ns_window(window) else {
        return;
    };
    let Some(TitlebarViews {
        buttons,
        titlebar,
        container,
    }) = titlebar_views(ns_window)
    else {
        return;
    };

    let handle = window.clone();
    let block = RcBlock::new(move |_: NonNull<NSNotification>| {
        if QUEUED.swap(true, Ordering::SeqCst) {
            return;
        }
        let handle = handle.clone();
        let run = RcBlock::new(move || {
            QUEUED.store(false, Ordering::SeqCst);
            restore_button_position(&handle);
        });
        // SAFETY: the main queue runs the block on the main thread AppKit needs.
        unsafe { NSOperationQueue::mainQueue().addOperationWithBlock(&run) };
    });

    let center = NSNotificationCenter::defaultCenter();
    let views = [container, titlebar].into_iter().chain(
        buttons
            .into_iter()
            .map(|button| Retained::into_super(Retained::into_super(button))),
    );
    for view in views {
        view.setPostsFrameChangedNotifications(true);
        // SAFETY: the object is an NSView, the notification is posted on the
        // main thread, and the observer lives as long as the app.
        let observer = unsafe {
            center.addObserverForName_object_queue_usingBlock(
                Some(NSViewFrameDidChangeNotification),
                Some(&view),
                None,
                &block,
            )
        };
        std::mem::forget(observer);
    }
}

fn restore_button_position(window: &Window) {
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

    let Some(TitlebarViews {
        buttons,
        titlebar,
        container,
    }) = titlebar_views(ns_window)
    else {
        return;
    };

    let mut frame = container.frame();
    frame.size.height = height;
    // The frame's origin is its bottom-left, so the bar hangs from the top.
    frame.origin.y = ns_window.frame().size.height - height;
    if container.frame() != frame {
        container.setFrame(frame);
    }

    let titlebar_y = titlebar.frame().origin.y;

    for button in &buttons {
        let mut origin = button.frame().origin;
        // Half the bar up from the container's bottom edge is its middle.
        origin.y = height / 2.0 - button.frame().size.height / 2.0 - titlebar_y;
        if button.frame().origin != origin {
            button.setFrameOrigin(origin);
        }
    }
}

struct TitlebarViews {
    buttons: Vec<Retained<NSButton>>,
    /// The `NSTitlebarView` the buttons sit in.
    titlebar: Retained<NSView>,
    /// The `NSTitlebarContainerView` spanning the top of the frame.
    container: Retained<NSView>,
}

fn titlebar_views(ns_window: &NSWindow) -> Option<TitlebarViews> {
    let buttons: Vec<_> = [
        NSWindowButton::CloseButton,
        NSWindowButton::MiniaturizeButton,
        NSWindowButton::ZoomButton,
    ]
    .into_iter()
    .filter_map(|button| ns_window.standardWindowButton(button))
    .collect();

    // SAFETY: reading a view's superview, on the main thread.
    let titlebar = unsafe { buttons.first()?.superview()? };
    let container = unsafe { titlebar.superview()? };
    Some(TitlebarViews {
        buttons,
        titlebar,
        container,
    })
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
