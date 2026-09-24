// Which node titles to draw, and how they are shortened.
//
// Every dot carrying its name is what makes a graph readable at all — a field
// of unlabelled dots says only that the vault has links, not which. But every
// name at every zoom is unreadable overlap, so the set thins out as the picture
// is pulled back, keeping the nodes that carry the most meaning.

export type LabelDetail = 'all' | 'focus' | 'hubs';

/** Longest title drawn before it is cut; beyond this labels start colliding. */
const MAX_LABEL = 28;

/** Pixels per graph unit at which each tier of labels becomes legible. */
const ALL_AT = 0.85;
const HUBS_AT = 0.45;

export function labelDetailFor(scale: number): LabelDetail {
    if (scale >= ALL_AT) {
        return 'all';
    }

    return scale >= HUBS_AT ? 'hubs' : 'focus';
}

export function shortTitle(title: string): string {
    const trimmed = title.trim() || 'Untitled';

    return trimmed.length > MAX_LABEL ? `${trimmed.slice(0, MAX_LABEL - 1)}…` : trimmed;
}

/**
 * Whether this node's title is drawn.
 *
 * Anything in focus is always named, whatever the zoom: it is what the pointer
 * is asking about, and an answer that depends on how far out you happen to be
 * is not an answer.
 */
export function showsLabel(
    node: { degree: number },
    detail: LabelDetail,
    inFocus: boolean,
): boolean {
    if (inFocus) {
        return true;
    }

    if (detail === 'all') {
        return true;
    }

    // A hub earns its name at a zoom where a leaf's would only be clutter.
    return detail === 'hubs' && node.degree >= 3;
}
