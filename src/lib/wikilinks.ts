// Resolving `[[target]]` against the items the renderer already holds.
//
// The engine resolves the same links for the index; this is the renderer's own
// answer, so the body can be styled without asking the engine about every
// bracket as it is typed.

import type { Item } from '../store/types';

/** `[[target]]`, `[[target|alias]]`, `[[target#heading]]`, anywhere in a line. */
export const WIKILINK = /\[\[([^[\]\n]+)\]\]/g;

export interface WikilinkParts {
    /** What to show: the alias when there is one, else the bare target. */
    label: string;
    /** What to resolve: the target with any alias and heading stripped. */
    target: string;
}

export function fileStem(path: string): string {
    return (path.split('/').pop() ?? '').replace(/\.mdx?$/i, '');
}

/**
 * Item for a `[[target]]`, matched on filename stem and then on id, the same
 * order and the same case-insensitivity the engine uses. Null when the target
 * names nothing — a link to a note not written yet, which is ordinary.
 */
export function resolveWikilink(target: string, items: readonly Item[]): Item | null {
    const wanted = target.trim().toLowerCase();

    if (!wanted) {
        return null;
    }

    const byStem = items.find((item) => item.path && fileStem(item.path).toLowerCase() === wanted);

    if (byStem) {
        return byStem;
    }

    return items.find((item) => item.id.toLowerCase() === wanted) ?? null;
}

/** Splits the inside of a `[[…]]` into what resolves and what is shown. */
export function wikilinkParts(inner: string): WikilinkParts {
    const [beforeAlias, ...aliasParts] = inner.split('|');
    const alias = aliasParts.join('|').trim();
    const target = beforeAlias.split('#')[0].trim();

    return { label: alias || target, target };
}
