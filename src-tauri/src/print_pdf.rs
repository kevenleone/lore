// Asking a webview for a PDF of itself.
//
// The obvious tool here is a print operation, and it is the wrong one: driven
// over an offscreen webview it paginates without bound — a two-word note came
// out at hundreds of megabytes, still growing, with a core pegged. `createPDF`
// cannot do that, because it does not paginate at all. It answers with the
// whole page as a single continuous sheet, which for a note is what you want to
// read anyway, and makes a runaway impossible rather than merely unlikely.

use std::{sync::mpsc, time::Duration};

use tauri::AppHandle;

/// How long the webview gets to answer with its bytes.
const CAPTURE_TIMEOUT: Duration = Duration::from_secs(30);

/// Writes the given window's current page to `destination` as a PDF.
///
/// `with_webview` only queues its closure onto the main thread and returns, and
/// the capture itself then calls back later on that same thread — so the bytes
/// come home over a channel. The wait must not happen on the main thread, which
/// is why it is handed to `spawn_blocking` rather than awaited here: blocking
/// the main thread would stall the very callback being waited on.
#[tauri::command]
pub async fn export_webview_pdf(
    app: AppHandle,
    label: String,
    destination: String,
) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use tauri::Manager;

        let window = app
            .get_webview_window(&label)
            .ok_or_else(|| "The print window is not available.".to_string())?;

        let (sender, receiver) = mpsc::channel::<Result<Vec<u8>, String>>();

        window
            .with_webview(move |webview| capture_pdf(&webview, sender))
            .map_err(|e| e.to_string())?;

        let bytes = tauri::async_runtime::spawn_blocking(move || {
            receiver
                .recv_timeout(CAPTURE_TIMEOUT)
                .unwrap_or_else(|_| Err("The PDF took too long to render.".to_string()))
        })
        .await
        .map_err(|e| e.to_string())??;

        std::fs::write(&destination, bytes).map_err(|e| e.to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, label, destination);
        Err("Lore can only export a PDF on macOS.".to_string())
    }
}

#[cfg(target_os = "macos")]
fn capture_pdf(
    webview: &tauri::webview::PlatformWebview,
    sender: mpsc::Sender<Result<Vec<u8>, String>>,
) {
    use block2::RcBlock;
    use objc2_foundation::{NSData, NSError};
    use objc2_web_kit::WKWebView;

    // Sound only because `with_webview` runs this on the main thread, which is
    // the only thread a WKWebView may be touched from.
    unsafe {
        let view: &WKWebView = &*webview.inner().cast();

        let handler = RcBlock::new(move |data: *mut NSData, error: *mut NSError| {
            let result = if data.is_null() {
                Err(error
                    .as_ref()
                    .map(|e| e.localizedDescription().to_string())
                    .unwrap_or_else(|| "The webview produced no PDF.".to_string()))
            } else {
                Ok((*data).to_vec())
            };
            // The receiver is gone only if the command already timed out, and
            // there is nothing left to tell.
            let _ = sender.send(result);
        });

        // A null configuration means the whole page rather than a chosen rect,
        // which is the entire point: the document decides its own length.
        view.createPDFWithConfiguration_completionHandler(None, &handler);
    }
}
