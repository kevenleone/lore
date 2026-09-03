// Hover / disabled states for the onboarding card. Inline styles can't express
// `:hover`, so the design's `style-hover` attributes become classes here.

import { style } from '@vanilla-extract/css';

const BUTTON_BASE = {
    alignItems: 'center',
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    fontFamily: 'inherit',
    fontSize: 14,
    gap: 9,
    height: 42,
    justifyContent: 'center',
    width: '100%',
} as const;

/** Apple / Google rows — the design brightens them on hover. */
export const socialButton = style({
    ...BUTTON_BASE,
    selectors: {
        '&:hover': { filter: 'brightness(1.35)' },
    },
});

/** Accent-filled call to action. */
export const primaryButton = style({
    ...BUTTON_BASE,
    background: 'var(--ac)',
    border: 'none',
    color: '#fff',
    fontWeight: 600,
    gap: 8,
    selectors: {
        '&:disabled': { cursor: 'not-allowed', opacity: 0.45 },
        '&:hover:not(:disabled)': { filter: 'brightness(1.18)' },
    },
});

/** Outlined secondary action (Resend link). */
export const ghostButton = style({
    ...BUTTON_BASE,
    background: 'var(--surface, #fff)',
    border: '1px solid var(--dash, #d2d2dc)',
    color: 'var(--text, #2c2c34)',
    fontWeight: 560,
    gap: 8,
    selectors: {
        '&:hover': { background: 'var(--surface2, #fafafa)' },
    },
});

/** Text-only "back" affordance under the primary action. */
export const quietButton = style({
    alignItems: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: 10,
    color: 'var(--text2, #6b6b76)',
    cursor: 'pointer',
    display: 'flex',
    fontFamily: 'inherit',
    fontSize: 13.5,
    height: 38,
    justifyContent: 'center',
    marginTop: 6,
    selectors: {
        '&:hover': { background: 'var(--sel, #f4f4f6)', color: 'var(--text, #1a1a1f)' },
    },
    width: '100%',
});

/** The dashed "continue without an account" card. */
export const anonCardRow = style({
    alignItems: 'flex-start',
    border: '1px dashed var(--dash, #cdced7)',
    borderRadius: 11,
    cursor: 'pointer',
    display: 'flex',
    gap: 11,
    padding: '12px 13px',
    selectors: {
        '&:hover': { background: 'var(--surface2, #fafafa)', borderColor: 'var(--ac)' },
    },
});
