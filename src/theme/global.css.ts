// Global resets, scrollbar styling, and the caret-blink keyframe — ported from
// the prototype's <helmet><style>. Accent is applied at runtime as the `--ac`
// CSS variable on the app root (see App.tsx), exactly as the prototype did.

import { globalStyle, keyframes } from '@vanilla-extract/css';

export const FONT_STACK = "-apple-system,'SF Pro Text',system-ui,'Segoe UI',sans-serif";

export const blinkCaret = keyframes({
    '0%,48%': { opacity: 1 },
    '49%,100%': { opacity: 0 },
});

globalStyle('*', { boxSizing: 'border-box' });

// Nothing in Lore scrolls the page itself: every pane, sheet and drawer is
// sized to the window and scrolls its own content. Saying so here keeps the
// document from ever being scrolled out from under the app — a drawer sliding
// in from off-screen briefly overflows to the right, and an engine that scrolls
// to reach a focused field inside it would drag the whole window sideways. It
// also covers the frameless windows, which are sized to their content and must
// not become scrollable over a one-pixel rounding difference.
globalStyle('html, body, #root', {
    height: '100%',
    margin: 0,
    overflow: 'hidden',
    padding: 0,
});

globalStyle('body', {
    // Transparent so the frameless capture window can float; the main window
    // paints its own opaque background on the app root.
    background: 'transparent',
    color: 'var(--text, #1a1a1f)',
    fontFamily: FONT_STACK,
    textRendering: 'optimizeLegibility',
    WebkitFontSmoothing: 'antialiased',
});

globalStyle('::-webkit-scrollbar', { height: 10, width: 10 });
globalStyle('::-webkit-scrollbar-thumb', {
    background: 'var(--scrollbar, rgba(0,0,0,.16))',
    backgroundClip: 'padding-box',
    border: '2px solid transparent',
    borderRadius: 8,
});
globalStyle('::-webkit-scrollbar-thumb:hover', {
    background: 'var(--scrollbar-hover, rgba(0,0,0,.28))',
    backgroundClip: 'padding-box',
});
globalStyle('::-webkit-scrollbar-track', { background: 'transparent' });
