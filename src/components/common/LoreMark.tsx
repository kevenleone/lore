// Lore's logo mark — `Lore App Icons.dc.html` § "21 — Open seal": a ring drawn
// as one stroke that stops and becomes a leaf, wrapped around a serif L.

import type { CSSProperties } from 'react';

interface LoreMarkProps {
    /** Defaults to `currentColor` so the mark inherits the surrounding text. */
    color?: string;
    size?: number;
    style?: CSSProperties;
}

export function LoreMark({ color = 'currentColor', size = 22, style }: LoreMarkProps) {
    // Below 22px the leaf collapses into the ring's own stroke, so it is dropped.
    const showLeaf = size >= 22;

    return (
        <svg height={size} style={{ display: 'block', ...style }} viewBox="0 0 64 64" width={size}>
            <path
                d="M32 9a23 23 0 1 1-19 10"
                fill="none"
                stroke={color}
                strokeLinecap="round"
                strokeWidth={ringWeight(size)}
            />
            {showLeaf ? <path d="M13 19C21 19 27 14 28 6 20 6 14 11 13 19Z" fill={color} /> : null}
            <path
                d="M25.2 22 H33.2 V23.5 H31.5 V39.2 H36.9 V37.1 H38.8 V42 H26.6 L27.1 23.5 H25.2 Z"
                fill={color}
            />
        </svg>
    );
}

/**
 * The design file redraws the ring heavier as the mark shrinks (2.6 on the dock
 * tile, then 3 / 4 / 5.4 at 40 / 28 / 18px) so the stroke survives rasterising.
 */
function ringWeight(size: number): number {
    if (size >= 64) {
        return 2.6;
    }

    if (size >= 34) {
        return 3;
    }

    if (size >= 22) {
        return 4;
    }

    return 5.4;
}

/** The serif wordmark that sits beside the mark. */
export const WORDMARK_FONT = "'Instrument Serif', Georgia, serif";
