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

globalStyle('html, body, #root', {
    height: '100%',
    margin: 0,
    padding: 0,
});

// The frameless windows are sized to their content; if a rounding difference
// makes it one pixel too tall, the page must not become scrollable — a popover
// that slides under the pointer is worse than one that clips a hairline.
globalStyle('body:has(> #root > [data-frameless])', {
    overflow: 'hidden',
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
