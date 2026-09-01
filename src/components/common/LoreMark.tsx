// Lore's logo mark — a page with a folded corner and a filled dot, ported from
// the `loreMark()` helper shared by every Lore design file.

import type { CSSProperties } from "react";

interface LoreMarkProps {
  size?: number;
  /** Defaults to `currentColor` so the mark inherits the surrounding text. */
  color?: string;
  style?: CSSProperties;
}

export function LoreMark({ size = 22, color = "currentColor", style }: LoreMarkProps) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} style={{ display: "block", ...style }}>
      <path
        d="M7.5 2.75 h11.1 L25 9.1 V29.25 H7.5 Z"
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M18.4 2.9 V9.4 H24.9"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={16.2} cy={19.6} r={3.5} fill={color} />
    </svg>
  );
}

/** The serif wordmark that sits beside the mark. */
export const WORDMARK_FONT = "'Instrument Serif', Georgia, serif";
