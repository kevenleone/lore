// The hover label's fade-in. Inline styles cannot express keyframes, and the
// bubble must not pop into place — it arrives after a deliberate hover.

import { keyframes, style } from '@vanilla-extract/css';

const fadeIn = keyframes({
    from: { opacity: 0, transform: 'translate(-50%, -3px)' },
    to: { opacity: 1, transform: 'translate(-50%, 0)' },
});

export const bubble = style({
    animation: `${fadeIn} .1s ease-out`,
    background: 'var(--surface, #fff)',
    border: '1px solid var(--border, #ececef)',
    borderRadius: 8,
    boxShadow: 'var(--float-shadow)',
    color: 'var(--text, #1a1a1f)',
    fontSize: 12,
    fontWeight: 500,
    left: '50%',
    // The bubble hangs outside its trigger; anything it covers must stay
    // clickable, or a tooltip under the pointer would swallow the click.
    pointerEvents: 'none',
    position: 'absolute',
    top: 'calc(100% + 7px)',
    transform: 'translateX(-50%)',
    whiteSpace: 'nowrap',
    zIndex: 60,
});
