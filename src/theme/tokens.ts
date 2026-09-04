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
    '--float-shadow': '0 30px 72px -20px rgba(24,24,48,.42), 0 6px 16px rgba(0,0,0,.07)',
    '--hover': '#f0f0f2',
    '--kbd-bg': '#ffffff',
    '--kbd-border': '#e2e2e7',
    '--knob': '#ffffff',
    '--scrim': 'rgba(20,20,30,.36)',
    '--scrollbar': 'rgba(0,0,0,.16)',
    '--scrollbar-hover': 'rgba(0,0,0,.28)',
    '--seg-shadow': '0 1px 2px rgba(0,0,0,.08)',
    '--sel': '#f4f4f6',
    '--sheet-shadow': '0 40px 90px -24px rgba(16,16,32,.5), 0 8px 20px rgba(0,0,0,.09)',
    '--surface': '#ffffff',
    '--surface-glass': 'rgba(255,255,255,.82)',
    '--surface2': '#fafafa',
    '--surface3': '#f1f1f3',
    '--swatch-border': 'rgba(0,0,0,.07)',
    '--text': '#1a1a1f',
    '--text2': '#6b6b76',
    '--text3': '#9a9aa5',
    '--titlebar': 'rgba(252,252,253,.86)',
    '--track-off': '#d9d9e0',
    '--type-code-bg': '#eef0f3',
    '--type-code-fg': '#5b6472',
    '--type-image-bg': '#f7ecef',
    '--type-image-fg': '#a86b7c',
    '--type-link-bg': '#ecedfb',
    '--type-link-fg': '#5b5bd6',
    '--type-note-bg': '#f6f1e8',
    '--type-note-fg': '#9e7b46',
    '--type-task-bg': '#e8f2ec',
    '--type-task-fg': '#4d855f',
};

export const DARK_TOKENS: Record<string, string> = {
    '--ac-border': 'rgba(184,186,201,.42)',
    '--ac-tint': 'rgba(184,186,201,.20)',
    '--border': '#34343d',
    '--border-soft': '#2c2c34',
    '--canvas': '#15151a',
    '--dash': '#3e3e48',
    '--faint': '#646470',
    '--float-shadow': '0 30px 72px -20px rgba(0,0,0,.66), 0 6px 16px rgba(0,0,0,.40)',
    '--hover': '#2f2f38',
    '--kbd-bg': '#2c2c34',
    '--kbd-border': '#3c3c46',
    '--knob': '#f4f4f8',
    '--scrim': 'rgba(6,6,10,.5)',
    '--scrollbar': 'rgba(255,255,255,.18)',
    '--scrollbar-hover': 'rgba(255,255,255,.30)',
    '--seg-shadow': '0 1px 2px rgba(0,0,0,.45)',
    '--sel': 'rgba(184,186,201,.16)',
    '--sheet-shadow': '0 40px 90px -24px rgba(0,0,0,.72), 0 8px 20px rgba(0,0,0,.44)',
    '--surface': '#1f1f25',
    '--surface-glass': 'rgba(38,38,46,.82)',
    '--surface2': '#26262d',
    '--surface3': '#2c2c34',
    '--swatch-border': 'rgba(255,255,255,.10)',
    '--text': '#f1f1f5',
    '--text2': '#a6a6b0',
    '--text3': '#7a7a85',
    '--titlebar': 'rgba(33,33,40,.86)',
    '--track-off': '#3d3d47',
    '--type-code-bg': 'rgba(139,152,173,.18)',
    '--type-code-fg': '#a9b4c4',
    '--type-image-bg': 'rgba(200,140,160,.16)',
    '--type-image-fg': '#d29fb0',
    '--type-link-bg': 'rgba(122,122,230,.20)',
    '--type-link-fg': '#a3a3f0',
    '--type-note-bg': 'rgba(190,150,90,.16)',
    '--type-note-fg': '#d3ac72',
    '--type-task-bg': 'rgba(110,180,140,.16)',
    '--type-task-fg': '#7fc39a',
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
