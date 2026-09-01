// Row hover, and the Compact-density rule that keeps the tag row out of the way
// until the row is hovered (Settings → Look & Feel → List density).

import { style } from "@vanilla-extract/css";

export const listRow = style({});

/** Tag chips under an item's subtitle. */
export const tagRow = style({
  display: "flex",
  gap: 5,
  marginTop: 6,
  flexWrap: "wrap",
});

/** Compact hides that row until the row it belongs to is hovered. */
export const tagRowCompact = style([
  tagRow,
  {
    display: "none",
    selectors: {
      [`${listRow}:hover &`]: { display: "flex" },
    },
  },
]);
