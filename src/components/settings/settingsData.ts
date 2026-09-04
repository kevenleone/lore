// Data shared between the settings panes and the surfaces built from the same
// definitions — the shortcut set (the list in frame 1c and the map in 1d) and
// the calendar accounts (the Calendar pane and the calendar view's legend).
// It lives apart from `panes.tsx` so neither importer pulls in the other.

import type { Switches } from '../../store/types';

/** Shared with the keyboard map, so the two takes cannot disagree. */
export interface ShortcutGroup {
    name: string;
    rows: { keys: string[]; label: string }[];
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        name: 'Global',
        rows: [
            { keys: ['⌥', 'Space'], label: 'Quick capture' },
            { keys: ['⌥', '⇧', 'C'], label: 'Capture the current browser tab' },
            { keys: ['⌥', '⇧', 'S'], label: 'Capture selected text' },
            { keys: ['⌥', '⇧', 'F'], label: 'Start or pause a focus session' },
            { keys: ['⌥', '⇧', 'L'], label: 'Open the knowledge base' },
        ],
    },
    {
        name: 'Capture window',
        rows: [
            { keys: ['⏎'], label: 'Save' },
            { keys: ['⌘', '⏎'], label: 'Save and keep going' },
            { keys: ['⇥'], label: 'Cycle capture type' },
            { keys: ['#'], label: 'Add a tag' },
            { keys: ['⌘', 'L'], label: 'Pick a collection' },
            { keys: ['esc'], label: 'Dismiss' },
        ],
    },
    {
        name: 'Knowledge base',
        rows: [
            { keys: ['⌘', 'K'], label: 'Search everything' },
            { keys: ['⌘', 'J'], label: 'Ask Lore' },
            { keys: ['⌘', '⌥', 'S'], label: 'Toggle the sidebar' },
            { keys: ['⌘', 'D'], label: 'Flag item' },
            { keys: ['⌘', '⇧', 'C'], label: 'Share' },
            { keys: ['↑', '↓'], label: 'Next / previous item' },
            { keys: ['⌘', '3'], label: 'Calendar view' },
        ],
    },
];

/** Shared with the calendar view's legend. No backend behind them yet. */
export const CALENDAR_ACCOUNTS: {
    color: string;
    key: keyof Switches;
    meta: string;
    name: string;
}[] = [
    {
        color: '#8a92b8',
        key: 'calWork',
        meta: 'rowan@shaw.studio · 4 calendars',
        name: 'Work — Google',
    },
    {
        color: '#a88f6e',
        key: 'calPersonal',
        meta: 'rowan@icloud.com · 2 calendars',
        name: 'Personal — iCloud',
    },
    { color: '#82a896', key: 'calShared', meta: 'Read-only invite', name: 'Studio shared' },
];
