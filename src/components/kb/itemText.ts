// Row text shared by the three library layouts.

import type { Item } from '../../store/types';

import { typeMeta } from '../../store/typeMeta';

/**
 * Fallback for queries too short to send to the index. It can only see what
 * `listItems()` returns — titles, tags and the derived preview — never bodies.
 */
export function matchesSearch(item: Item, q: string): boolean {
    const hay =
        `${item.title} ${item.domain ?? ''} ${item.snippet ?? ''} ${item.summary ?? ''} ${item.tags.join(' ')}`.toLowerCase();
    return hay.includes(q);
}

export function subtitle(item: Item): string {
    return item.domain || item.snippet || typeMeta(item.type).label;
}
