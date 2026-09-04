// Hover, focus and animation states for the two focus surfaces — the parts of
// `Lore Settings.dc.html` frames 1e/1f that inline styles cannot express.

import { keyframes, style } from '@vanilla-extract/css';

/**
 * Room the popover window leaves around its card. The window is transparent, so
 * the drop shadow is drawn by CSS and has to fit inside this gap — anything that
 * spills past it is cut off square by the window edge.
 */
export const PANEL_MARGIN = 20;

const popIn = keyframes({
    from: { opacity: 0, transform: 'translateY(-6px) scale(.98)' },
    to: { opacity: 1, transform: 'translateY(0) scale(1)' },
});

const fadeIn = keyframes({
    from: { opacity: 0 },
    to: { opacity: 1 },
});

/** The design's `ringPulse` — the "session running" dot. */
const ringPulse = keyframes({
    '0%, 100%': { opacity: 0.55 },
    '50%': { opacity: 1 },
});

export const popover = style({
    animation: `${popIn} .14s cubic-bezier(.2,.8,.3,1)`,
    background: 'var(--surface, #fff)',
    border: '1px solid var(--border, #ececef)',
    borderRadius: 15,
    boxShadow: 'var(--float-shadow, 0 30px 70px -18px rgba(20,20,40,.44))',
    overflow: 'hidden',
    position: 'absolute',
    right: 14,
    top: 52,
    width: 332,
    zIndex: 40,
});

/**
 * The menu-bar popover's own window. The window itself is transparent and
 * undecorated, so the card — and the margin its shadow needs — are drawn here.
 */
export const panelSurface = style({
    animation: `${popIn} .12s cubic-bezier(.2,.8,.3,1)`,
    background: 'var(--surface, #fff)',
    border: '1px solid var(--border, #ececef)',
    borderRadius: 15,
    // Kept inside PANEL_MARGIN on every side, offset included.
    boxShadow: '0 8px 24px -6px rgba(20,20,40,.38), 0 2px 6px rgba(0,0,0,.10)',
    color: 'var(--text, #1a1a1f)',
    fontFamily: "-apple-system, 'SF Pro Text', system-ui, 'Segoe UI', sans-serif",
    overflow: 'hidden',
    position: 'relative',
    // A popover is chrome, not a document: dragging across it should not leave
    // half its labels selected.
    userSelect: 'none',
});

/**
 * Holds the card away from the window edges so its shadow has somewhere to fall.
 *
 * The gap is padding on a wrapper that is only as tall as its contents, not a
 * margin on the card: a margin inside the full-height `#root` adds to the
 * document instead of fitting inside it, which made the popover scroll its own
 * contents by exactly that gap whenever the pointer crossed it.
 */
export const panelWindow = style({
    boxSizing: 'border-box',
    height: 'auto',
    padding: PANEL_MARGIN,
    width: '100%',
});

export const surface = style({
    animation: `${fadeIn} .16s ease`,
    background: 'var(--surface, #fff)',
    display: 'flex',
    flexDirection: 'column',
    inset: 0,
    position: 'absolute',
    zIndex: 25,
});

export const pulseDot = style({
    animation: `${ringPulse} 1.8s ease-in-out infinite`,
    background: 'var(--ac)',
    borderRadius: '50%',
    height: 6,
    width: 6,
});

export const transportButton = style({
    alignItems: 'center',
    background: 'var(--surface3, #f1f1f3)',
    border: 'none',
    borderRadius: 11,
    color: 'var(--text2, #6b6b76)',
    cursor: 'pointer',
    display: 'inline-flex',
    fontFamily: 'inherit',
    justifyContent: 'center',
    padding: 0,
    selectors: { '&:hover': { filter: 'brightness(.96)' } },
});

export const queueRow = style({
    alignItems: 'flex-start',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    gap: 10,
    padding: '10px 11px',
    selectors: { '&:hover': { background: 'var(--hover, #f0f0f2)' } },
});

/** The title-bar chip that opens the popover. */
export const focusChip = style({
    alignItems: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'inline-flex',
    fontFamily: 'inherit',
    fontSize: 12,
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 640,
    gap: 6,
    height: 30,
    padding: '0 9px',
    selectors: { '&:hover': { background: 'var(--hover, #f0f0f2)' } },
});

/** The popover's corner button into the full Focus surface. */
export const expandButton = style({
    alignItems: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 7,
    color: 'var(--faint, #a8a8b0)',
    cursor: 'pointer',
    display: 'flex',
    height: 26,
    justifyContent: 'center',
    padding: 0,
    position: 'absolute',
    right: 8,
    selectors: { '&:hover': { background: 'var(--hover, #f0f0f2)' } },
    top: 8,
    width: 26,
    zIndex: 1,
});
