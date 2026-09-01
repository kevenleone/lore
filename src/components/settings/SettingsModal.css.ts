// Hover and focus states for the settings sheet — the `style-hover` attributes
// from `Lore Settings.dc.html`, which inline styles can't express.

import { keyframes, style } from "@vanilla-extract/css";

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const sheetIn = keyframes({
  from: { opacity: 0, transform: "translate(-50%, -50%) scale(.97)" },
  to: { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
});

export const scrim = style({
  position: "absolute",
  inset: 0,
  zIndex: 20,
  background: "var(--scrim, rgba(20,20,30,.36))",
  backdropFilter: "blur(2px)",
  WebkitBackdropFilter: "blur(2px)",
  animation: `${fadeIn} .14s ease`,
});

export const sheet = style({
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 30,
  width: "min(1000px, calc(100% - 64px))",
  height: "min(700px, calc(100% - 64px))",
  background: "var(--surface, #fff)",
  color: "var(--text, #1a1a1f)",
  borderRadius: 16,
  border: "1px solid rgba(0,0,0,.06)",
  boxShadow: "0 40px 90px -24px rgba(16,16,32,.5), 0 8px 20px rgba(0,0,0,.09)",
  overflow: "hidden",
  display: "flex",
  animation: `${sheetIn} .16s cubic-bezier(.2,.8,.3,1)`,
});

/** A pane entry in the left rail. */
export const navItem = style({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 8px",
  border: "none",
  background: "transparent",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "inherit",
  textAlign: "left",
  width: "100%",
  selectors: {
    "&:hover": { background: "var(--hover, #f0f0f2)" },
  },
});

/** Label + description + control, separated by a hairline. */
export const settingsRow = style({
  display: "flex",
  alignItems: "flex-start",
  gap: 16,
  padding: "13px 0",
  borderBottom: "1px solid var(--border-soft, #f0f0f2)",
});

/** Outlined pill: actions and the menu-shaped choosers. */
export const pillButton = style({
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  flex: "none",
  fontSize: 12.5,
  fontFamily: "inherit",
  color: "var(--text2, #6b6b76)",
  background: "var(--surface, #fff)",
  border: "1px solid var(--border, #e4e4ea)",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  selectors: {
    "&:hover:not(:disabled)": { background: "var(--hover, #f0f0f2)" },
    "&:disabled": { cursor: "default" },
  },
});

/** One option inside a segmented control. */
export const segItem = style({
  padding: "5px 11px",
  borderRadius: 7,
  border: "none",
  background: "transparent",
  fontSize: 12.5,
  fontFamily: "inherit",
  cursor: "pointer",
});

/** Close button in the pane header. */
export const iconButton = style({
  width: 28,
  height: 28,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: "var(--text2, #6b6b76)",
  selectors: {
    "&:hover": { background: "var(--hover, #f0f0f2)" },
  },
});

/** Card-shaped radio (appearance swatches, AI location). */
export const choiceCard = style({
  display: "flex",
  gap: 12,
  padding: "13px 14px",
  borderRadius: 12,
  cursor: "pointer",
  background: "transparent",
  fontFamily: "inherit",
  textAlign: "left",
  selectors: {
    "&:hover": { background: "var(--hover, #f0f0f2)" },
  },
});

/** The About pane's link list. */
export const aboutLink = style({
  fontSize: 12.5,
  color: "var(--text2, #6b6b76)",
  background: "var(--surface, #fff)",
  border: "1px solid var(--border, #e4e4ea)",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontFamily: "inherit",
  selectors: {
    "&:hover": { background: "var(--hover, #f0f0f2)", color: "var(--text, #1a1a1f)" },
  },
});
