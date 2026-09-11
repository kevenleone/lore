// Driving the print window from the window that asked for the export.
//
// The print window is a real webview parked offscreen rather than a hidden one:
// WebKit throttles layout, rAF and image decoding for a window that has never
// been shown, and a throttled webview reports itself ready and then prints a
// blank page. Showing it at -30000 makes it a live view nobody can see. It is
// `decorations: false`, so AppKit does not pull the frame back onto a screen
// the way it does for titled windows.

import type { PrintPayload } from '../components/print/PrintDocument';

/** Where the print window is parked while it works. */
const OFFSCREEN = -30_000;

/** The ceiling on the renderer half — the native half has its own. */
const READY_TIMEOUT_MS = 10_000;

/** A cold listener after a reload gets one more chance at the payload. */
const RETRY_MS = 500;

export const PRINT_DOCUMENT = 'print:document';
export const PRINT_READY = 'print:ready';

/**
 * One print operation at a time. There is a single print window and a single
 * NSPrintOperation behind it, so a second export would render its document over
 * the first one's half-printed page.
 */
let running = false;

type Listen = typeof import('@tauri-apps/api/event').listen;

export async function exportPdf(payload: PrintPayload, destination: string): Promise<void> {
    if (running) throw new Error('An export is already running.');
    running = true;

    const { emit, listen } = await import('@tauri-apps/api/event');
    const { invoke } = await import('@tauri-apps/api/core');
    const { PhysicalPosition } = await import('@tauri-apps/api/dpi');
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');

    const printWindow = await WebviewWindow.getByLabel('print');
    if (!printWindow) {
        running = false;
        throw new Error('The print window is not available.');
    }

    try {
        await printWindow.setPosition(new PhysicalPosition(OFFSCREEN, OFFSCREEN));
        await printWindow.show();

        await ready(listen, () => void emit(PRINT_DOCUMENT, payload));
        await invoke('export_webview_pdf', { destination, label: 'print' });
    } finally {
        await printWindow.hide();
        running = false;
    }
}

/** A PDF's default name: the title, made safe for a filename. */
export function pdfFileName(title: string): string {
    const safe = title
        .replace(/[/\\:*?"<>|]/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/^\.+/, '')
        .trim()
        .slice(0, 120)
        .trim();
    return `${safe || 'Untitled'}.pdf`;
}

/** Opens the native save panel. Resolves to null when the user cancels. */
export async function pickPdfPath(title: string): Promise<null | string> {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const picked = await save({
        // A bare filename, not a path, so macOS reuses the folder the user
        // saved to last — which is what a second export expects.
        defaultPath: pdfFileName(title),
        filters: [{ extensions: ['pdf'], name: 'PDF' }],
        title: 'Export as PDF',
    });
    return typeof picked === 'string' ? picked : null;
}

/**
 * Sends the payload and waits for the print window to say it has finished
 * laying out. The listener is attached and awaited before the payload goes out,
 * so a fast reply cannot land before anything is listening for it.
 */
async function ready(listen: Listen, send: () => void): Promise<void> {
    let arrived = (): void => {};
    const laidOut = new Promise<void>((resolve) => {
        arrived = resolve;
    });

    const unlisten = await listen(PRINT_READY, () => arrived());

    // A window that has only just loaded may not have its own listener up yet,
    // and the first payload would then land on nothing. One retry costs a
    // re-render of a page that has not been printed, which is free.
    send();
    const retry = setTimeout(send, RETRY_MS);

    let expire: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
        expire = setTimeout(
            () => reject(new Error('Preparing the document timed out.')),
            READY_TIMEOUT_MS,
        );
    });

    try {
        await Promise.race([laidOut, timedOut]);
    } finally {
        clearTimeout(retry);
        clearTimeout(expire);
        unlisten();
    }
}
