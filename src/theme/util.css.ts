// Reusable interaction classes. Inline styles can't express :hover, so the
// prototype's `style-hover` rows map to these vanilla-extract classes.

import { style } from "@vanilla-extract/css";

/** Sidebar / list rows: subtle grey hover (prototype `background:#f0f0f2`). */
export const hoverable = style({
  selectors: { "&:hover": { background: "#f0f0f2" } },
});

/** Related cards: hover lightens bg and border (prototype values). */
export const hoverCard = style({
  selectors: {
    "&:hover": { background: "#fafafa", borderColor: "#e0e0e8" },
  },
});

/** Source chips in chat. */
export const hoverChip = style({
  selectors: {
    "&:hover": { background: "#fafafa", borderColor: "#d0d0d8" },
  },
});
