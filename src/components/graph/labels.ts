// Which node titles to draw, and where.
//
// Every dot carrying its name is what makes a graph readable — a field of
// unlabelled dots says only that the vault has links, not which. But a name is
// far wider than it is tall, and at any zoom where a whole vault fits, most of
// them land on top of each other.
//
// So rather than guess a zoom at which names "become legible", every label is
// measured and laid down only where one actually fits. That is a rule about the
// thing itself, so it holds in a twelve-note vault and in a two-thousand-note
// one without a constant tuned for either.

/** Longest title drawn before it is cut; past this one label hides several. */
const MAX_LABEL = 28;

/** Breathing room around a label, so two that merely miss still read apart. */
const PAD_X = 6;
const PAD_Y = 3;

export interface LabelCandidate {
    /** Higher is laid down first, and so wins a contested spot. */
    priority: number;
    text: string;
    /** Centre of the label, in screen pixels. */
    x: number;
    /** Top of the label, in screen pixels. */
    y: number;
}

export interface PlacedLabel {
    text: string;
    /** Centre, as handed in — the caller draws centred. */
    x: number;
    y: number;
}

interface Box {
    bottom: number;
    left: number;
    right: number;
    top: number;
}

/**
 * Lays out as many names as fit, most important first.
 *
 * `measure` is passed in rather than read off a canvas, so the packing can be
 * tested without one and the caller keeps control of the font.
 */
export function placeLabels(
    candidates: readonly LabelCandidate[],
    measure: (text: string) => number,
    height: number,
): PlacedLabel[] {
    const byPriority = [...candidates].sort((left, right) => right.priority - left.priority);
    const taken: Box[] = [];
    const placed: PlacedLabel[] = [];

    for (const candidate of byPriority) {
        const half = measure(candidate.text) / 2;
        const box = {
            bottom: candidate.y + height + PAD_Y,
            left: candidate.x - half - PAD_X,
            right: candidate.x + half + PAD_X,
            top: candidate.y - PAD_Y,
        };

        if (taken.some((other) => overlaps(box, other))) {
            continue;
        }

        taken.push(box);
        placed.push({ text: candidate.text, x: candidate.x, y: candidate.y });
    }

    return placed;
}

export function shortTitle(title: string): string {
    const trimmed = title.trim() || 'Untitled';

    return trimmed.length > MAX_LABEL ? `${trimmed.slice(0, MAX_LABEL - 1)}…` : trimmed;
}

function overlaps(first: Box, second: Box): boolean {
    return (
        first.left < second.right &&
        first.right > second.left &&
        first.top < second.bottom &&
        first.bottom > second.top
    );
}
