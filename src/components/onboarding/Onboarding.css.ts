// Hover / disabled states for the onboarding card. Inline styles can't express
// `:hover`, so the design's `style-hover` attributes become classes here.

import { style } from "@vanilla-extract/css";

const BUTTON_BASE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  width: "100%",
  height: 42,
  borderRadius: 10,
  fontSize: 14,
  fontFamily: "inherit",
  cursor: "pointer",
} as const;

/** Apple / Google rows — the design brightens them on hover. */
export const socialButton = style({
  ...BUTTON_BASE,
  selectors: {
    "&:hover": { filter: "brightness(1.35)" },
  },
});

/** Accent-filled call to action. */
export const primaryButton = style({
  ...BUTTON_BASE,
  gap: 8,
  background: "var(--ac)",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  selectors: {
    "&:hover:not(:disabled)": { filter: "brightness(1.18)" },
    "&:disabled": { opacity: 0.45, cursor: "not-allowed" },
  },
});

/** Outlined secondary action (Resend link). */
export const ghostButton = style({
  ...BUTTON_BASE,
  gap: 8,
  background: "var(--surface, #fff)",
  border: "1px solid var(--dash, #d2d2dc)",
  color: "var(--text, #2c2c34)",
  fontWeight: 560,
  selectors: {
    "&:hover": { background: "var(--surface2, #fafafa)" },
  },
});

/** Text-only "back" affordance under the primary action. */
export const quietButton = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: 38,
  marginTop: 6,
  fontSize: 13.5,
  fontFamily: "inherit",
  color: "var(--text2, #6b6b76)",
  background: "transparent",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: "var(--sel, #f4f4f6)", color: "var(--text, #1a1a1f)" },
  },
});

/** The dashed "continue without an account" card. */
export const anonCardRow = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 11,
  padding: "12px 13px",
  border: "1px dashed var(--dash, #cdced7)",
  borderRadius: 11,
  cursor: "pointer",
  selectors: {
    "&:hover": { borderColor: "var(--ac)", background: "var(--surface2, #fafafa)" },
  },
});
