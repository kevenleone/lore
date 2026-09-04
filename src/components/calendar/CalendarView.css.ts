// Hover and drag states for the calendar view (`Lore Settings.dc.html` 1g).

import { style } from '@vanilla-extract/css';

export const toolbarButton = style({
    alignItems: 'center',
    background: 'var(--surface3, #f1f1f3)',
    border: 'none',
    borderRadius: 7,
    color: 'var(--text2, #6b6b76)',
    cursor: 'pointer',
    display: 'inline-flex',
    fontFamily: 'inherit',
    height: 26,
    justifyContent: 'center',
    padding: 0,
    selectors: { '&:hover': { filter: 'brightness(.96)' } },
    width: 26,
});

/** An unscheduled task in the left rail, waiting to be dragged onto the week. */
export const unscheduledCard = style({
    alignItems: 'flex-start',
    background: 'var(--surface, #fff)',
    border: '1px solid var(--border, #e6e6ea)',
    borderRadius: 9,
    cursor: 'grab',
    display: 'flex',
    gap: 8,
    padding: '8px 9px',
    selectors: {
        '&:active': { cursor: 'grabbing' },
        '&:hover': { borderColor: 'var(--ac-border, #dedee5)' },
    },
});

/** A day column that a drag is currently over. */
export const dropTarget = style({
    background: 'var(--ac-tint, #eeeef2)',
});

export const eventBlock = style({
    borderRadius: 8,
    cursor: 'pointer',
    display: 'flex',
    left: 4,
    overflow: 'hidden',
    position: 'absolute',
    right: 4,
    selectors: { '&:hover': { filter: 'brightness(.97)' } },
    zIndex: 4,
});

export const monthCell = style({
    borderLeft: '1px solid var(--border, #ececef)',
    borderTop: '1px solid var(--border, #ececef)',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minHeight: 0,
    minWidth: 0,
    overflow: 'hidden',
    padding: '6px 7px',
});
