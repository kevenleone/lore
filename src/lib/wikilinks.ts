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

interface Lookup {
    byId: Map<string, Item>;
    byStem: Map<string, Item>;
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

    const { byId, byStem } = lookup(items);

    return byStem.get(wanted) ?? byId.get(wanted) ?? null;
}

/**
 * Built once per list and held against it.
 *
 * This runs for every link in a note on every keystroke — the editor redraws
 * its decorations on each change — so scanning the list per link is not an
 * option it can afford. Measured on a 2,000-item vault, a note with a dozen
 * unresolved links cost 11ms a keystroke that way, which is most of a frame
 * before ProseMirror has done anything of its own.
 *
 * Keyed on the array itself: the store replaces it on every refresh, so a stale
 * list can never be read, and a WeakMap lets the old one be collected with it.
 */
const lookups = new WeakMap<readonly Item[], Lookup>();

/** Splits the inside of a `[[…]]` into what resolves and what is shown. */
export function wikilinkParts(inner: string): WikilinkParts {
    const [beforeAlias, ...aliasParts] = inner.split('|');
    const alias = aliasParts.join('|').trim();
    const target = beforeAlias.split('#')[0].trim();

    return { label: alias || target, target };
}

function lookup(items: readonly Item[]): Lookup {
    const cached = lookups.get(items);

    if (cached) {
        return cached;
    }

    const built: Lookup = { byId: new Map(), byStem: new Map() };

    for (const item of items) {
        built.byId.set(item.id.toLowerCase(), item);

        if (item.path) {
            built.byStem.set(fileStem(item.path).toLowerCase(), item);
        }
    }

    lookups.set(items, built);

    return built;
}
