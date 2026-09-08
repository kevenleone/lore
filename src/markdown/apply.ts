import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

import type { ParsedBody } from './types';

import { serialize } from './serialize';
import { generateBlock } from './to-mdast';

export type DirtyBlocks = ReadonlySet<number>;

export function applyDocument(
    parsed: ParsedBody,
    doc: ProseMirrorNode,
    dirty: DirtyBlocks,
): string {
    if (doc.childCount !== parsed.blocks.length) return rewriteAll(doc);

    return serialize(parsed, (_block, index) =>
        dirty.has(index) ? generateBlock(doc.child(index)) : undefined,
    );
}

/**
 * Changed block indices, or `null` when the count changed and correspondence is
 * lost. Identity, not text: a generator normalises unconditionally, so
 * comparing generated Markdown against the original would mark every block
 * dirty the moment the file was opened.
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
