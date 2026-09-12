// Printing a webview straight to a PDF file.
//
// macOS will paginate a WKWebView for a printer, and a print operation whose
// job disposition is "save" writes that pagination to a file instead. That is
// the whole trick: the renderer lays the document out as paper, and AppKit does
// the page breaking, the text (which stays selectable) and the file.

use std::{sync::mpsc, time::Duration};

use tauri::AppHandle;

/// How long AppKit gets to paginate and write the file.
const PRINT_TIMEOUT: Duration = Duration::from_secs(30);

/// Writes the given window's current page to `destination` as a PDF.
///
/// `with_webview` only queues its closure onto the main thread and returns, so
/// the result comes back over a channel. The wait must not happen on the main
/// thread — that would block the very thread the closure needs — which is why
/// it is handed to `spawn_blocking` rather than awaited here.
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

        let (sender, receiver) = mpsc::channel::<Result<(), String>>();

        window
            .with_webview(move |webview| {
                let _ = sender.send(print_to_file(&webview, &destination));
            })
            .map_err(|e| e.to_string())?;

        tauri::async_runtime::spawn_blocking(move || {
            receiver
                .recv_timeout(PRINT_TIMEOUT)
                .unwrap_or_else(|_| Err("Writing the PDF timed out.".to_string()))
        })
        .await
        .map_err(|e| e.to_string())?
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app, label, destination);
        Err("Lore can only export a PDF on macOS.".to_string())
    }
}

#[cfg(target_os = "macos")]
fn print_to_file(webview: &tauri::webview::PlatformWebview, destination: &str) -> Result<(), String> {
    use objc2::runtime::ProtocolObject;
    use objc2_app_kit::{
        NSPrintInfo, NSPrintJobSavingURL, NSPrintSaveJob, NSPrintingPaginationMode,
    };
    use objc2_foundation::{NSString, NSURL};
    use objc2_web_kit::WKWebView;

    // Sound only because `with_webview` runs this on the main thread, which is
    // the only thread WKWebView and NSPrintOperation may be touched from.
    unsafe {
        let view: &WKWebView = &*webview.inner().cast();

        let info = NSPrintInfo::new();
        info.setJobDisposition(NSPrintSaveJob);

        // The margins belong here and not to `@page`: WebKit's support for
        // `@page { margin }` is partial, while these are honoured always, and
        // setting both would add them together.
        info.setTopMargin(48.0);
        info.setBottomMargin(48.0);
        info.setLeftMargin(44.0);
        info.setRightMargin(44.0);

        // Both default to on, which would float a two-line note in the middle
        // of the sheet instead of starting it at the top margin.
        info.setHorizontallyCentered(false);
        info.setVerticallyCentered(false);

        // The webview is wider than the printable area, and the default
        // (Automatic) answer to that is to tile the overflow onto further
        // columns of pages — which is how a two-word note printed hundreds of
        // megabytes. Fit scales the page to the paper instead; only the
        // vertical axis may break into more pages.
        info.setHorizontalPagination(NSPrintingPaginationMode::Fit);
        info.setVerticalPagination(NSPrintingPaginationMode::Automatic);

        let url = NSURL::fileURLWithPath(&NSString::from_str(destination));
        info.dictionary()
            .setObject_forKey(&url, ProtocolObject::from_ref(NSPrintJobSavingURL));

        let operation = view.printOperationWithPrintInfo(&info);
        operation.setShowsPrintPanel(false);
        operation.setShowsProgressPanel(false);

        // Paper size is left at the user's default — Letter in the US, A4 in
        // most of the world. Forcing one would be wrong in the other place.
        if operation.runOperation() {
            Ok(())
        } else {
            Err("macOS could not write the PDF.".to_string())
        }
    }
}
