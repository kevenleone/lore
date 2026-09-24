// Which node titles to draw, and how they are shortened.
//
// Every dot carrying its name is what makes a graph readable at all — a field
// of unlabelled dots says only that the vault has links, not which. But every
// name at every zoom is unreadable overlap, so the set thins out as the picture
// is pulled back, keeping the nodes that carry the most meaning.

export type LabelDetail = 'all' | 'focus' | 'hubs';

/** Longest title drawn before it is cut; beyond this labels start colliding. */
const MAX_LABEL = 28;

/**
 * Screen pixels between neighbouring dots at which each tier becomes legible.
 *
 * Measured as room-per-node rather than as a zoom level: the zoom that fits a
 * twelve-note vault on screen is nothing like the one that fits two thousand,
 * so a threshold on zoom means something different in every vault. What decides
 * whether a name can be read is how much space it has beside its neighbours.
 */
const ALL_AT = 58;
const HUBS_AT = 26;

export function labelDetailFor(spacing: number): LabelDetail {
    if (spacing >= ALL_AT) {
        return 'all';
    }

    return spacing >= HUBS_AT ? 'hubs' : 'focus';
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
