// Painting a theme onto a window. Components reference `var(--surface)` and
// friends rather than hard-coded hex, so the Appearance pane repaints the whole
// app by swapping the token map; theme/themes.ts holds the maps themselves.

export type { Appearance } from '../store/types';
import type { Appearance } from '../store/types';
import type { ThemeId } from './themes';

import { themeById } from './themes';

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

export interface PaintOptions {
    accent: string;
    mode: 'dark' | 'light';
    themeId: ThemeId;
}

/** Writes a theme's token set onto an element's inline style. */
export function applyTokens(el: HTMLElement, id: ThemeId, mode: 'dark' | 'light'): void {
    const theme = themeById(id, mode);
    for (const [k, v] of Object.entries(theme.tokens)) el.style.setProperty(k, v);
    el.style.colorScheme = theme.mode;
}

/**
 * Paints a theme and its accent onto the document root.
 *
 * Everything resolves `var(--surface)` and friends against this element, so it
 * is the single place a window's appearance is decided — including `body` and
 * the scrollbars, which sit outside the React tree.
 */
export function paintTheme({ accent, mode, themeId }: PaintOptions): void {
    const root = document.documentElement;
    applyTokens(root, themeId, mode);
    root.style.setProperty('--ac', resolveAccent(accent, mode));
}

/**
 * The design lifts a too-dark accent on a dark ground so it stays legible —
 * Graphite (#393A4A) becomes Slate blue (#7d80a0).
 */
export function resolveAccent(accent: string, theme: 'dark' | 'light'): string {
    return theme === 'dark' && REL_LUM(accent) < 0.34 ? '#7d80a0' : accent;
}
