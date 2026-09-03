// Lore's semantic colour tokens, ported from `Lore Settings.dc.html`'s
// `themeVars()`. Components reference them as `var(--surface)` etc. rather than
// hard-coded hex, so the Look & Feel pane's Light / Dark / Auto switch repaints
// the whole app. `--ac` (accent) is set separately in App.tsx.

export type { Appearance } from '../store/types';
import type { Appearance } from '../store/types';

export const LIGHT_TOKENS: Record<string, string> = {
    '--ac-border': '#dedee5',
    '--ac-tint': '#eeeef2',
    '--border': '#ececef',
    '--border-soft': '#f0f0f2',
    '--canvas': '#e7e5df',
    '--dash': '#d2d2dc',
    '--faint': '#a8a8b0',
    '--hover': '#f0f0f2',
    '--kbd-bg': '#ffffff',
    '--kbd-border': '#e2e2e7',
    '--scrim': 'rgba(20,20,30,.36)',
    '--sel': '#f4f4f6',
    '--surface': '#ffffff',
    '--surface2': '#fafafa',
    '--surface3': '#f1f1f3',
    '--text': '#1a1a1f',
    '--text2': '#6b6b76',
    '--text3': '#9a9aa5',
    '--track-off': '#d9d9e0',
};

export const DARK_TOKENS: Record<string, string> = {
    '--ac-border': 'rgba(184,186,201,.42)',
    '--ac-tint': 'rgba(184,186,201,.20)',
    '--border': '#34343d',
    '--border-soft': '#2c2c34',
    '--canvas': '#15151a',
    '--dash': '#3e3e48',
    '--faint': '#646470',
    '--hover': '#2f2f38',
    '--kbd-bg': '#2c2c34',
    '--kbd-border': '#3c3c46',
    '--scrim': 'rgba(6,6,10,.5)',
    '--sel': 'rgba(184,186,201,.16)',
    '--surface': '#1f1f25',
    '--surface2': '#26262d',
    '--surface3': '#2c2c34',
    '--text': '#f1f1f5',
    '--text2': '#a6a6b0',
    '--text3': '#7a7a85',
    '--track-off': '#3d3d47',
};

/** Resolves `auto` against the OS setting. */
export function effectiveTheme(appearance: Appearance): 'dark' | 'light' {
    if (appearance !== 'auto') return appearance;
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const REL_LUM = (hex: string): number => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return 1;
    const n = parseInt(m[1], 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

/** Writes the token set for `theme` onto an element's inline style. */
export function applyTokens(el: HTMLElement, theme: 'dark' | 'light'): void {
    const tokens = theme === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;
    for (const [k, v] of Object.entries(tokens)) el.style.setProperty(k, v);
    el.style.colorScheme = theme;
}

/**
 * The design lifts a too-dark accent on a dark ground so it stays legible —
 * Graphite (#393A4A) becomes Slate blue (#7d80a0).
 */
export function resolveAccent(accent: string, theme: 'dark' | 'light'): string {
    return theme === 'dark' && REL_LUM(accent) < 0.34 ? '#7d80a0' : accent;
}
