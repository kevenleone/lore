export interface SplitDocument {
    body: string;
    /** The byte-order mark and frontmatter block, exactly as they are on disk. */
    prefix: string;
}

export interface StandaloneDocument {
    /** Milliseconds since the epoch; null when the file has gone. */
    modified: null | number;
    name: string;
    path: string;
    text: string;
}

/** What `write_document` rejects with when the file is not the one last read. */
export const CHANGED_ON_DISK = 'changed_on_disk';

const PREFIX = /^\uFEFF?(?:---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$))?/;

export function joinFrontmatter(prefix: string, body: string): string {
    return prefix + body;
}

/** The window's own file; the host decides which one, never the caller. */
export async function readDocument(): Promise<StandaloneDocument> {
    const { invoke } = await import('@tauri-apps/api/core');

    return invoke<StandaloneDocument>('read_document');
}

/**
 * The frontmatter is cut off as text rather than parsed: this window edits the
 * body only, and a block that is never parsed cannot lose a key it does not
 * know.
 */
export function splitFrontmatter(text: string): SplitDocument {
    const prefix = PREFIX.exec(text)?.[0] ?? '';

    return { body: text.slice(prefix.length), prefix };
}

/** A null `expectedModified` overwrites whatever is on disk. */
export async function writeDocument(
    text: string,
    expectedModified: null | number,
): Promise<null | number> {
    const { invoke } = await import('@tauri-apps/api/core');

    return invoke<null | number>('write_document', { expectedModified, text });
}
