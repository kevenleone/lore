// Which Lore this bundle belongs to. The mode is fixed at build time by
// `vite.config.ts`, from the same `lore.modes.json` that `build.rs` and the
// sidecar read — see `src-tauri/src/mode.rs` for the Rust half.
//
// Production has no label and no accent, so every marker in the UI is written
// as `APP_MODE.label ? … : null` and drops out of a production bundle.

import modes from '../../lore.modes.json';
import { formatHotkey, hotkeyKeys } from './hotkeys';
import { IS_MAC } from './platform';

export interface AppMode {
    /** The colour a dev or agent build tints itself with; `null` in production. */
    accent: null | string;
    captureShortcut: string;
    /** `DEV` / `AGENT`, or `null` in production. */
    label: null | string;
    mode: LoreMode;
    productName: string;
}

export type LoreMode = 'agent' | 'dev' | 'prod';

const config = modes[__LORE_MODE__];

export const APP_MODE: AppMode = {
    accent: config.accent,
    captureShortcut: IS_MAC ? config.captureShortcut.macos : config.captureShortcut.default,
    label: config.label,
    mode: __LORE_MODE__,
    productName: config.productName,
};

/** The capture shortcut as one label: `⌥Space` on a Mac, `Ctrl+Alt+Space` elsewhere. */
export function captureShortcut(): string {
    return formatHotkey(APP_MODE.captureShortcut);
}

/** The same shortcut split into keys, for the shortcut table's separate chips. */
export function captureShortcutKeys(): string[] {
    return hotkeyKeys(APP_MODE.captureShortcut);
}
