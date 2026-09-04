// Hover and focus states for the settings sheet — the `style-hover` attributes
// from `Lore Settings.dc.html`, which inline styles can't express.

import { keyframes, style } from '@vanilla-extract/css';

const fadeIn = keyframes({
    from: { opacity: 0 },
    to: { opacity: 1 },
});

const sheetIn = keyframes({
    from: { opacity: 0, transform: 'translate(-50%, -50%) scale(.97)' },
    to: { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
});

export const scrim = style({
    animation: `${fadeIn} .14s ease`,
    backdropFilter: 'blur(2px)',
    background: 'var(--scrim, rgba(20,20,30,.36))',
    inset: 0,
    position: 'absolute',
    WebkitBackdropFilter: 'blur(2px)',
    zIndex: 20,
});

export const sheet = style({
    animation: `${sheetIn} .16s cubic-bezier(.2,.8,.3,1)`,
    background: 'var(--surface, #fff)',
    border: '1px solid var(--border, #ececef)',
    borderRadius: 16,
    boxShadow:
        'var(--sheet-shadow, 0 40px 90px -24px rgba(16,16,32,.5), 0 8px 20px rgba(0,0,0,.09))',
    color: 'var(--text, #1a1a1f)',
    display: 'flex',
    height: 'min(700px, calc(100% - 64px))',
    left: '50%',
    overflow: 'hidden',
    position: 'absolute',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(1000px, calc(100% - 64px))',
    zIndex: 30,
});

/** A pane entry in the left rail. */
export const navItem = style({
    alignItems: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    fontFamily: 'inherit',
    fontSize: 13,
    gap: 10,
    padding: '6px 8px',
    selectors: {
        '&:hover': { background: 'var(--hover, #f0f0f2)' },
    },
    textAlign: 'left',
    width: '100%',
});

/** Label + description + control, separated by a hairline. */
export const settingsRow = style({
    alignItems: 'flex-start',
    borderBottom: '1px solid var(--border-soft, #f0f0f2)',
    display: 'flex',
    gap: 16,
    padding: '13px 0',
});

/** Outlined pill: actions and the menu-shaped choosers. */
export const pillButton = style({
    alignItems: 'center',
    background: 'var(--surface, #fff)',
    border: '1px solid var(--border, #e4e4ea)',
    borderRadius: 8,
    color: 'var(--text2, #6b6b76)',
    cursor: 'pointer',
    display: 'inline-flex',
    flex: 'none',
    fontFamily: 'inherit',
    fontSize: 12.5,
    gap: 7,
    padding: '6px 10px',
    selectors: {
        '&:disabled': { cursor: 'default' },
        '&:hover:not(:disabled)': { background: 'var(--hover, #f0f0f2)' },
    },
});

/** One option inside a segmented control. */
export const segItem = style({
    background: 'transparent',
    border: 'none',
    borderRadius: 7,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12.5,
    padding: '5px 11px',
});

/** Close button in the pane header. */
export const iconButton = style({
    alignItems: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: 'var(--text2, #6b6b76)',
    cursor: 'pointer',
    display: 'flex',
    height: 28,
    justifyContent: 'center',
    selectors: {
        '&:hover': { background: 'var(--hover, #f0f0f2)' },
    },
    width: 28,
});

/** Card-shaped radio (appearance swatches, AI location). */
export const choiceCard = style({
    background: 'transparent',
    borderRadius: 12,
    cursor: 'pointer',
    display: 'flex',
    fontFamily: 'inherit',
    gap: 12,
    padding: '13px 14px',
    selectors: {
        '&:hover': { background: 'var(--hover, #f0f0f2)' },
    },
    textAlign: 'left',
});

/** The About pane's link list. */
export const aboutLink = style({
    background: 'var(--surface, #fff)',
    border: '1px solid var(--border, #e4e4ea)',
    borderRadius: 8,
    color: 'var(--text2, #6b6b76)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12.5,
    padding: '6px 10px',
    selectors: {
        '&:hover': { background: 'var(--hover, #f0f0f2)', color: 'var(--text, #1a1a1f)' },
    },
});
