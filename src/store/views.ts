// Pure selectors ported from the prototype's `renderVals` (Lore.dc.html
// lines 490–562). They derive counts, titles, filtered lists, and the
// detail-pane visibility booleans from a plain item/collection list, so they
// are trivially unit-testable.

import type { Collection, Item, SortOrder, TagCount, View } from './types';

export interface ViewCounts {
    all: number;
    inbox: number;
    starred: number;
    today: number;
}

export function collectionCount(items: Item[], collectionId: string): number {
    return items.filter((i) => i.collectionId === collectionId).length;
}

/** Filter to a view and apply the given sort order (default: newest first). */
export function filterByView(items: Item[], view: View, sort: SortOrder = 'newest'): Item[] {
    const filtered = items.filter((i) => matchesView(i, view));
    return sortItems(filtered, sort);
}

/**
 * Apply a view filter to an item list. Shared by the selectors below and by
 * every repository implementation — it lives here rather than in the data layer
 * so the two do not import each other.
 */
export function matchesView(item: Item, view: View): boolean {
    switch (view.kind) {
        case 'all':
            return true;
        case 'collection':
            return item.collectionId === view.val;
        case 'inbox':
            return !!item.flags.inbox;
        case 'starred':
            return !!item.flags.starred;
        case 'tag':
            return !!view.val && item.tags.includes(view.val);
        case 'today':
            return !!item.flags.today;
        default:
            return true;
    }
}

export function sortItems(items: Item[], sort: SortOrder): Item[] {
    const copy = items.slice();
    switch (sort) {
        case 'oldest':
            return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        case 'title':
            return copy.sort((a, b) => a.title.localeCompare(b.title));
        case 'newest':
        default:
            return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
}

/** Tag counts in a fixed display order; tags not in `order` are appended. */
export function tagCounts(items: Item[], order: string[]): TagCount[] {
    const counts = new Map<string, number>();
    for (const item of items) {
        for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    const ordered = order
        .filter((t) => counts.has(t))
        .map((name) => ({ count: counts.get(name)!, name }));
    const seen = new Set(order);
    const rest = [...counts.entries()]
        .filter(([name]) => !seen.has(name))
        .map(([name, count]) => ({ count, name }));
    return [...ordered, ...rest];
}

export function viewCounts(items: Item[]): ViewCounts {
    return {
        all: items.length,
        inbox: items.filter((i) => i.flags.inbox).length,
        starred: items.filter((i) => i.flags.starred).length,
        today: items.filter((i) => i.flags.today).length,
    };
}

export const SORT_LABELS: Record<SortOrder, string> = {
    newest: 'Newest first',
    oldest: 'Oldest first',
    title: 'Title (A–Z)',
};

export interface DetailFlags {
    detIsCode: boolean;
    detIsText: boolean;
    showPoints: boolean;
    showPreview: boolean;
    showRelated: boolean;
    showSummary: boolean;
}

export function collectionFor(item: Item, collections: Collection[]): Collection | null {
    return item.collectionId ? (collections.find((c) => c.id === item.collectionId) ?? null) : null;
}

/** Detail-pane section visibility — mirrors the prototype's `sc-if` gates. */
export function detailFlags(item: Item, showAI: boolean, relatedCount: number): DetailFlags {
    return {
        detIsCode: item.type === 'code',
        detIsText: item.type === 'note' || item.type === 'task',
        showPoints: showAI && !!item.points && item.points.length > 0,
        // Only show a preview when we actually have an image to show.
        showPreview: !!item.image,
        showRelated: showAI && relatedCount > 0,
        showSummary: showAI && !!item.summary,
    };
}

export function isViewActive(
    current: View,
    kind: View['kind'],
    val: null | string = null,
): boolean {
    return current.kind === kind && current.val === val;
}

export function previewLabel(item: Item): string {
    return item.type === 'image' ? 'image' : 'link preview';
}

export function relatedItems(item: Item, all: Item[]): Item[] {
    const byId = new Map(all.map((i) => [i.id, i]));
    return (item.related ?? []).map((id) => byId.get(id)).filter((x): x is Item => !!x);
}

export function viewTitle(view: View, collections: Collection[]): string {
    switch (view.kind) {
        case 'all':
            return 'All Items';
        case 'collection':
            return collections.find((c) => c.id === view.val)?.name ?? 'Collection';
        case 'inbox':
            return 'Inbox';
        case 'starred':
            return 'Flagged';
        case 'tag':
            return `#${view.val}`;
        case 'today':
            return 'Today';
        default:
            return 'All Items';
    }
}
