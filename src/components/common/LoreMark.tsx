// Lore's logo mark — a page with a folded corner and a filled dot, ported from
// the `loreMark()` helper shared by every Lore design file.

import type { CSSProperties } from 'react';

interface LoreMarkProps {
    /** Defaults to `currentColor` so the mark inherits the surrounding text. */
    color?: string;
    size?: number;
    style?: CSSProperties;
}

export function LoreMark({ color = 'currentColor', size = 22, style }: LoreMarkProps) {
    return (
        <svg height={size} style={{ display: 'block', ...style }} viewBox="0 0 32 32" width={size}>
            <path
                d="M7.5 2.75 h11.1 L25 9.1 V29.25 H7.5 Z"
                fill="none"
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.4}
            />
            <path
                d="M18.4 2.9 V9.4 H24.9"
                fill="none"
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
            />
            <circle cx={16.2} cy={19.6} fill={color} r={3.5} />
        </svg>
    );
}

/** The serif wordmark that sits beside the mark. */
export const WORDMARK_FONT = "'Instrument Serif', Georgia, serif";
