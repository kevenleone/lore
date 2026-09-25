// A collection id is its folder path, so every surface that shows a collection
// has to decide how much of that path to print. These two split it, and live
// here rather than beside the sidebar tree because the task selectors need them
// too.

/** The folder's own name — `Projects` out of `Work/Projects`. */
export function leafName(path: string): string {
    return path.slice(path.lastIndexOf('/') + 1);
}

/** The path of the folder it sits in, or '' at the vault root. */
export function parentOf(path: string): string {
    const slash = path.lastIndexOf('/');

    return slash === -1 ? '' : path.slice(0, slash);
}
