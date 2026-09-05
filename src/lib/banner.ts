// A saved link's preview image lands long after its card does. Instead of a
// grey block that pops when the bytes arrive, the card paints a blurred
// gradient derived from the item itself and crossfades the real image over it —
// same composition, no layout shift (`Lore Knowledge Base Views` frame 1b).
//
// The prototype stored a 28-byte hash next to the URL. Nothing in the vault
// format holds one yet, so the palette is hashed from the image URL instead:
// stable for a given item, and different between items, which is all the
// placeholder needs to be.

import type { CSSProperties } from 'react';

import type { Item } from '../store/types';

/** FNV-1a, 32-bit. Small, deterministic, and spreads adjacent URLs apart. */
function hash(seed: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i += 1) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

const hsl = (hue: number, saturation: number, lightness: number): string =>
    `hsl(${((hue % 360) + 360) % 360}, ${saturation}%, ${lightness}%)`;

/**
 * Five colours in one hue family — a mid tone, a highlight, two shadows and a
 * base — matching the shape of the palettes the prototype hard-coded.
 */
export function bannerPalette(seed: string): string[] {
    const h = hash(seed);
    const hue = h % 360;
    // 20–34%: saturated enough to read as a real image, muted enough that five
    // cards side by side do not fight each other.
    const sat = 20 + (h % 15);
    return [
        hsl(hue, sat, 45),
        hsl(hue + 14, sat + 8, 66),
        hsl(hue - 10, sat + 3, 30),
        hsl(hue + 7, sat + 2, 54),
        hsl(hue - 6, sat + 4, 22),
    ];
}

/** The seed an item's placeholder is seeded from — its image, else its identity. */
export function bannerSeed(item: Pick<Item, 'id' | 'image' | 'url'>): string {
    return item.image ?? item.url ?? item.id;
}

/**
 * The placeholder layer itself. `blurred` is the pre-load state: the gradient
 * is over-scaled and blurred so its edges never meet the frame, which is what
 * makes it read as an out-of-focus photo rather than as artwork.
 */
export function bannerStyle(colors: string[], blurred: boolean): CSSProperties {
    const [c0, c1, c2, c3, c4] = colors;
    return {
        background: [
            `radial-gradient(58% 66% at 16% 20%, ${c0} 0%, transparent 64%)`,
            `radial-gradient(54% 62% at 84% 16%, ${c1} 0%, transparent 62%)`,
            `radial-gradient(66% 70% at 26% 92%, ${c2} 0%, transparent 66%)`,
            `radial-gradient(60% 64% at 92% 86%, ${c3} 0%, transparent 64%)`,
            `linear-gradient(146deg, ${c4}, ${c0})`,
        ].join(', '),
        inset: '-14%',
        position: 'absolute',
        ...(blurred ? { filter: 'blur(16px) saturate(1.15)', transform: 'scale(1.08)' } : {}),
    };
}

/** True when the item has a preview image worth reserving a banner for. */
export function hasBanner(item: Item): boolean {
    return !!item.image;
}
