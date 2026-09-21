import { PLATFORM, type Platform } from './platform';

export interface HotkeyCommand {
    /** Which Keyboard Shortcuts section lists it; unlisted commands still fire. */
    group?: 'main' | 'views';
    /** `+`-joined keys; `Mod` is ⌘ on a Mac and Ctrl everywhere else. */
    hotkey: string;
    id: string;
    label: string;
}

/**
 * Every in-app chord. On a Mac the menu bar in `app_menu.rs` owns the ones it
 * lists — `hotkeys.test.ts` keeps its accelerators equal to these — and the
 * renderer fires them everywhere else.
 */
export const HOTKEYS = [
    { group: 'main', hotkey: 'Mod+K', id: 'search', label: 'Search or run a command' },
    { group: 'main', hotkey: 'Mod+N', id: 'capture', label: 'Capture drawer' },
    {
        group: 'main',
        hotkey: 'Mod+Shift+E',
        id: 'export-pdf',
        label: 'Export the open item as PDF',
    },
    { group: 'main', hotkey: 'Alt+Shift+F', id: 'focus', label: 'Start or pause a focus session' },
    { group: 'main', hotkey: 'Mod+J', id: 'chat', label: 'Ask Lore' },
    { group: 'main', hotkey: 'Mod+B', id: 'sidebar', label: 'Toggle the sidebar' },
    { group: 'main', hotkey: 'Mod+L', id: 'properties', label: 'Toggle the properties panel' },
    { group: 'main', hotkey: 'Mod+Comma', id: 'settings', label: 'Open Settings' },
    {
        group: 'main',
        hotkey: 'Escape',
        id: 'close',
        label: 'Close the capture drawer or the open item',
    },
    { hotkey: 'Mod+A', id: 'select-all', label: 'Select all' },
    { group: 'views', hotkey: 'Mod+1', id: 'view-all', label: 'Everything' },
    { group: 'views', hotkey: 'Mod+2', id: 'view-inbox', label: 'Inbox' },
    { group: 'views', hotkey: 'Mod+3', id: 'view-notes', label: 'Notes' },
    { group: 'views', hotkey: 'Mod+4', id: 'view-links', label: 'Links' },
    { group: 'views', hotkey: 'Mod+5', id: 'view-files', label: 'Files' },
    { group: 'views', hotkey: 'Mod+6', id: 'view-tasks', label: 'Tasks' },
    { group: 'views', hotkey: 'Mod+7', id: 'view-calendar', label: 'Calendar' },
] as const satisfies readonly HotkeyCommand[];

export type HotkeyId = (typeof HOTKEYS)[number]['id'];

const MAC_KEYS: Record<string, string> = {
    Alt: '⌥',
    Comma: ',',
    Command: '⌘',
    Control: '⌃',
    Enter: '⏎',
    Escape: 'esc',
    Meta: '⌘',
    Mod: '⌘',
    Shift: '⇧',
};

const OTHER_KEYS: Record<string, string> = {
    Comma: ',',
    Command: 'Win',
    Control: 'Ctrl',
    Escape: 'Esc',
    Meta: 'Win',
    Mod: 'Ctrl',
};

/** The chord as one label: `⌘⇧E` on a Mac, `Ctrl+Shift+E` everywhere else. */
export function formatHotkey(hotkey: string, platform: Platform = PLATFORM): string {
    return hotkeyKeys(hotkey, platform).join(platform === 'mac' ? '' : '+');
}

export function hotkeyCommandFor(
    event: KeyboardEvent,
    platform: Platform = PLATFORM,
): HotkeyId | undefined {
    return HOTKEYS.find((command) => matchesHotkey(event, command.hotkey, platform))?.id;
}

export function hotkeyFor(id: HotkeyId): string {
    return HOTKEYS.find((command) => command.id === id)?.hotkey ?? '';
}

/** One key cap per key, the way this platform names them: `⌘ ⇧ E` or `Ctrl Shift E`. */
export function hotkeyKeys(hotkey: string, platform: Platform = PLATFORM): string[] {
    const names = platform === 'mac' ? MAC_KEYS : OTHER_KEYS;
    return hotkey.split('+').map((key) => names[key] ?? key);
}

/**
 * Compares `event.code`, not `event.key`: on a Mac a held ⌥ turns F into ƒ,
 * and the physical key is what the menu bar's accelerators match too.
 */
export function matchesHotkey(
    event: KeyboardEvent,
    hotkey: string,
    platform: Platform = PLATFORM,
): boolean {
    const keys = hotkey.split('+');
    const key = keys[keys.length - 1];
    const has = (modifier: string) => keys.includes(modifier);
    const mod = has('Mod');
    const meta = has('Meta') || has('Command') || (mod && platform === 'mac');
    const control = has('Control') || (mod && platform !== 'mac');

    return (
        event.code === codeFor(key) &&
        event.metaKey === meta &&
        event.ctrlKey === control &&
        event.altKey === has('Alt') &&
        event.shiftKey === has('Shift')
    );
}

function codeFor(key: string): string {
    if (/^[A-Z]$/.test(key)) return `Key${key}`;
    if (/^\d$/.test(key)) return `Digit${key}`;
    return key;
}
