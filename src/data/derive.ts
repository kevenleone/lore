// Fields that are computed from an item's stored content rather than persisted
// alongside it. Every repository runs these on read, so the rule "`snippet` and
// `domain` are derived, never written" holds no matter where the data lives.

import type { Item } from '../store/types';

const SNIPPET_MAX = 200;

/** Best-effort hostname, mirroring `hostOf` in lib/captureActions. */
export function deriveDomain(url: string | undefined): string | undefined {
    if (!url) return undefined;
    try {
        return new URL(url).hostname.replace(/^www\./, '') || undefined;
    } catch {
        return undefined;
    }
}

/**
 * The one-line preview the list pane shows. A link has no body of its own to
 * preview, so it falls back to what the page says about itself, then the URL.
 */
export function deriveSnippet(
    item: Pick<Item, 'body' | 'description' | 'type' | 'url'>,
): string | undefined {
    const body = item.body?.trim();
    if (body) return body.split('\n')[0].slice(0, SNIPPET_MAX);
    if (item.type === 'link') return item.description?.trim() || item.url || undefined;
    return undefined;
}

/**
 * Stamps the derived fields onto a stored item. Callers pass the record as it
 * came out of storage; `domain` is only recomputed when it wasn't stored, so
 * existing rows keep whatever they already had.
 */
export function withDerived(item: Item): Item {
    return {
        ...item,
        domain: item.domain ?? deriveDomain(item.url),
        snippet: deriveSnippet(item),
    };
}

/**
 * Strips the body for list responses. `listItems()` is re-run after every
 * mutation, so shipping every body through it would mean serializing the whole
 * vault on each keystroke-triggered save; `getItem()` is the only method that
 * returns one. Establishing that contract here keeps the eventual move to the
 * file-backed store a transport swap rather than a UI change.
 */
export function withoutBody(item: Item): Item {
    const { body: _body, ...rest } = item;
    return rest;
}
