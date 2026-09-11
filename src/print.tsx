// The print window: an offscreen webview that renders one document as paper,
// so Rust can run a print operation over it and write a PDF.
//
// It deliberately does not import `theme/bootstrap`. Bootstrap paints the
// user's chosen theme, and a PDF should not come out black because the app is
// in dark mode — this window is always the light map.

import ReactDOM from 'react-dom/client';

import type { PrintPayload } from './components/print/PrintDocument';

import { PrintDocument } from './components/print/PrintDocument';
import { PRINT_DOCUMENT, PRINT_READY } from './lib/exportPdf';
import { waitForPaint } from './lib/printReady';
import { loadPersisted } from './store/persisted';
import { DEFAULT_LIGHT_THEME } from './theme/themes';
import { paintTheme } from './theme/tokens';
import './theme/tailwind.css';

paintTheme({
    accent: loadPersisted().prefs.accent,
    mode: 'light',
    themeId: DEFAULT_LIGHT_THEME,
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

async function listen(): Promise<void> {
    const { emit, listen: onEvent } = await import('@tauri-apps/api/event');

    await onEvent<PrintPayload>(PRINT_DOCUMENT, (event) => {
        // Not StrictMode: its double render would mount every image twice, and
        // the readiness wait below would race the second pass.
        root.render(<PrintDocument {...event.payload} />);

        // Two frames, then the bounded wait for fonts and images: one frame
        // gets React's commit painted, the second gets the layout it caused.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                void waitForPaint().then(() => emit(PRINT_READY));
            });
        });
    });
}

void listen();
