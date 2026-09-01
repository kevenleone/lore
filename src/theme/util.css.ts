// Reusable interaction classes. Inline styles can't express :hover, so the
// prototype's `style-hover` rows map to these vanilla-extract classes.

import { style } from "@vanilla-extract/css";

/** Sidebar / list rows: subtle grey hover (prototype `background:#f0f0f2`). */
export const hoverable = style({
  selectors: { "&:hover": { background: "var(--hover, #f0f0f2)" } },
});

/** Related cards: hover lightens bg and border (prototype values). */
export const hoverCard = style({
  selectors: {
    "&:hover": { background: "var(--surface2, #fafafa)", borderColor: "var(--border, #e4e4ea)" },
  },
});

/** Source chips in chat. */
export const hoverChip = style({
  selectors: {
    "&:hover": { background: "var(--surface2, #fafafa)", borderColor: "var(--border, #e4e4ea)" },
  },
});
