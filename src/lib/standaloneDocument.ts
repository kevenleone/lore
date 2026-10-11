export interface SplitBody {
    /** What an editor shows: the body without the blank space around it. */
    core: string;
    /** The blank lines between the frontmatter and the first line of text. */
    lead: string;
    /** The whitespace the file ends with. */
    tail: string;
}

export interface SplitDocument {
    body: string;
    /** The byte-order mark and frontmatter block, exactly as they are on disk. */
    prefix: string;
}

export interface StandaloneDocument {
    /** Milliseconds since the epoch; null where the filesystem keeps no birth time. */
    created: null | number;
    /** Milliseconds since the epoch; null when the file has gone. */
    modified: null | number;
    name: string;
    path: string;
    text: string;
}

/** What `write_document` rejects with when the file is not the one last read. */
export const CHANGED_ON_DISK = 'changed_on_disk';

// The engine's `splitFrontmatter`, as one expression: an opening fence is
// `---` and nothing else on its line. The two must agree on where the body
// starts, or a key the engine patches lands in what this side calls the body.
const PREFIX = /^\uFEFF?(?:---\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$))?/;

export function joinFrontmatter(prefix: string, body: string): string {
    return prefix + body;
}

/** The window's own file; the host decides which one, never the caller. */
export async function readDocument(): Promise<StandaloneDocument> {
    const { invoke } = await import('@tauri-apps/api/core');

    return invoke<StandaloneDocument>('read_document');
}

export async function revealDocument(): Promise<void> {
    const { invoke } = await import('@tauri-apps/api/core');

    await invoke('reveal_document');
}

/**
 * The body as an editor holds it, and the whitespace around it that an editor
 * would normalise away. Saving puts the three back together, so typing in the
 * middle of a file never changes how it starts or ends.
 */
export function splitBody(body: string): SplitBody {
    const lead = /^\s*\n/.exec(body)?.[0] ?? '';
    const rest = body.slice(lead.length);
    const tail = /\s*$/.exec(rest)?.[0] ?? '';

    return { core: rest.slice(0, rest.length - tail.length), lead, tail };
}

/**
 * The frontmatter is cut off as text rather than parsed: a body edit writes it
 * back as it was read, and a block that is never parsed cannot lose a key it
 * does not know.
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
