// The keystroke path: a live document written back over the body it came from.
//
// Which blocks get regenerated is decided by *what the user touched*, never by
// comparing generated Markdown against the original. That distinction is the
// whole design: a generator normalises unconditionally — `*` bullets become
// `-`, indented code becomes fenced, `> [!note]` picks up an escape — so a
// block judged "changed" because its regenerated form differs from its source
// would be rewritten the moment the file was opened.
//
// ProseMirror nodes are persistent, so an untouched top-level block is
// reference-identical across transactions. That identity is the dirty signal.

import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

import type { ParsedBody } from './types';

import { serialize } from './serialize';
import { generateBlock } from './to-mdast';

/** Which top-level blocks the user has edited since the body was read. */
export type DirtyBlocks = ReadonlySet<number>;

export function applyDocument(
    parsed: ParsedBody,
    doc: ProseMirrorNode,
    dirty: DirtyBlocks,
): string {
    // A document that no longer lines up with the parse — blocks split, merged
    // or deleted — has no per-block correspondence left to preserve.
    if (doc.childCount !== parsed.blocks.length) return rewriteAll(doc);

    return serialize(parsed, (_block, index) =>
        dirty.has(index) ? generateBlock(doc.child(index)) : undefined,
    );
}

/**
 * The blocks that differ between two documents, by node identity. Returns
 * `null` when the block count changed, meaning correspondence is lost and the
 * body must be rewritten whole.
 */
export function diffBlocks(before: ProseMirrorNode, after: ProseMirrorNode): null | number[] {
    if (before.childCount !== after.childCount) return null;

    const changed: number[] = [];
    for (let index = 0; index < after.childCount; index += 1) {
        if (before.child(index) !== after.child(index)) changed.push(index);
    }
    return changed;
}

function rewriteAll(doc: ProseMirrorNode): string {
    const parts: string[] = [];
    doc.forEach((child) => {
        const markdown = generateBlock(child);
        if (markdown) parts.push(markdown);
    });
    return parts.join('\n\n');
}
