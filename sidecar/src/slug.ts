// Filenames. A note's file is named after its title, which is what makes the
// vault browsable outside Lore — but the title is not the identity, `id` is.
// Retitling therefore does not rename the file: renames churn git history and
// break inbound wikilinks, so they only happen when explicitly asked for.

const MAX_STEM = 80;

/** Characters no major filesystem tolerates, plus the ones that confuse shells. */
// eslint-disable-next-line no-control-regex -- control characters are exactly what this strips
const UNSAFE = /[\u0000-\u001f<>:"/\\|?*]+/g;

/** Reserved on Windows even with an extension, so never emit them bare. */
const RESERVED = new Set([
    'aux',
    'con',
    'nul',
    'prn',
    ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`),
    ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`),
]);

/** Lexicographically sortable, time-ordered id. Keeps the vault listing stable. */
export function newId(): string {
    const time = Date.now().toString(36).padStart(9, '0');
    const rand = Math.random().toString(36).slice(2, 12).padEnd(10, '0');

    return `${time}${rand}`.toUpperCase();
}

export function slugify(title: string): string {
    const base = title
        .normalize('NFKD')
        // Strip combining marks so "café" becomes "cafe" rather than "café".
        .replace(/[̀-ͯ]/g, '')
        .replace(UNSAFE, ' ')
        .replace(/['’`]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, MAX_STEM)
        // A trailing dash can appear after the slice.
        .replace(/-+$/, '');

    if (!base || RESERVED.has(base)) {
        return base ? `${base}-note` : '';
    }

    return base;
}

/**
 * A stem that is unique among `taken`. Falls back to a short id when the title
 * slugs to nothing at all (emoji-only titles, CJK that NFKD leaves unmapped).
 */
export function uniqueStem(title: string, id: string, taken: ReadonlySet<string>): string {
    const base = slugify(title) || `untitled-${id.slice(-6).toLowerCase()}`;

    if (!taken.has(base)) {
        return base;
    }

    for (let n = 2; n < 1000; n += 1) {
        const candidate = `${base}-${n}`;

        if (!taken.has(candidate)) {
            return candidate;
        }
    }

    // Pathological: fall back to something guaranteed unique.
    return `${base}-${id.slice(-6).toLowerCase()}`;
}
