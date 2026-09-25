// Turning the flat list of collection paths into sidebar rows.
//
// The engine answers with paths — `Work`, `Work/Projects` — sorted as strings,
// which is already depth-first order. All that is left is working out how far to
// indent each one, which have children, and which are hidden inside a parent
// somebody has collapsed.

import type { Collection } from '../../store/types';

export interface CollectionRow {
    collection: Collection;
    /** 0 for a folder at the vault root. */
    depth: number;
    /** Whether anything nests inside it, so it gets a disclosure control. */
    hasChildren: boolean;
    /**
     * What the row is labelled: the folder's own name, without its parents,
     * since the indent already says where it sits.
     */
    name: string;
}

export function collectionRows(
    collections: readonly Collection[],
    collapsed: readonly string[],
): CollectionRow[] {
    const shut = new Set(collapsed);

    return collections
        .filter((collection) => !hasCollapsedAncestor(collection.id, shut))
        .map((collection) => ({
            collection,
            depth: collection.id.split('/').length - 1,
            hasChildren: collections.some((other) => isChildOf(other.id, collection.id)),
            // Structure comes from the id, which is the path; the label comes
            // from the name, which is what the collection is called.
            name: leafName(collection.name),
        }));
}

/** The folder's own name — `Projects` out of `Work/Projects`. */
export function leafName(id: string): string {
    return id.slice(id.lastIndexOf('/') + 1);
}

/** The path of the folder it sits in, or '' at the vault root. */
export function parentOf(id: string): string {
    const slash = id.lastIndexOf('/');

    return slash === -1 ? '' : id.slice(0, slash);
}

/**
 * Renaming shows only the folder's own name, so what comes back is a leaf and
 * has to be put back under the same parent. A name that already carries a path
 * is taken at its word, which is how a folder is moved.
 */
export function renamedTo(id: string, typed: string): string {
    const name = typed.trim();

    if (!name || name.includes('/')) {
        return name;
    }

    const parent = parentOf(id);

    return parent ? `${parent}/${name}` : name;
}

export function toggleCollapsed(id: string, collapsed: readonly string[]): string[] {
    return collapsed.includes(id) ? collapsed.filter((entry) => entry !== id) : [...collapsed, id];
}

function hasCollapsedAncestor(id: string, shut: ReadonlySet<string>): boolean {
    let parent = parentOf(id);

    while (parent) {
        if (shut.has(parent)) {
            return true;
        }

        parent = parentOf(parent);
    }

    return false;
}

/** Direct child only: `Work/Projects` is a child of `Work`, `Work/A/B` is not. */
function isChildOf(id: string, parent: string): boolean {
    return parentOf(id) === parent;
}
