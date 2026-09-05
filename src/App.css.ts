// Drawer entrance and exit — the item detail drawer and the capture drawer —
// as keyframes rather than a two-state transition. The panel's resting style is
// the open position, so a run that is throttled away (hidden window) leaves it
// open rather than stranded off-screen; only the exit needs `forwards`, and it
// is unmounted right after.

import { keyframes, style } from '@vanilla-extract/css';

/** Drawer slide, matched by the scrim fade and by the unmount timer. */
export const DRAWER_MS = 240;

/** Decelerating, so the panel arrives rather than stops. */
const EASE = 'cubic-bezier(.32,.72,0,1)';

const slideIn = keyframes({
    from: { transform: 'translateX(100%)' },
    to: { transform: 'translateX(0)' },
});

const slideOut = keyframes({
    from: { transform: 'translateX(0)' },
    to: { transform: 'translateX(100%)' },
});

const fadeIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

const fadeOut = keyframes({ from: { opacity: 1 }, to: { opacity: 0 } });

export const drawerIn = style({ animation: `${slideIn} ${DRAWER_MS}ms ${EASE}` });

export const drawerOut = style({ animation: `${slideOut} ${DRAWER_MS}ms ${EASE} forwards` });

export const scrimIn = style({ animation: `${fadeIn} ${DRAWER_MS}ms ease` });

export const scrimOut = style({ animation: `${fadeOut} ${DRAWER_MS}ms ease forwards` });
