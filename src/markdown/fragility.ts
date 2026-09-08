import type { Node as MdastNode } from 'mdast';

import type { Block } from './types';

import { parse } from './parse';
import { generateBlock } from './to-mdast';
import { toDocument } from './to-prosemirror';

/**
 * Downgrades blocks the schema cannot regenerate faithfully. Catches content
 * with no node to hold it — an image, a footnote reference — which would
 * otherwise be dropped on the first keystroke. Complements the delimiter match
 * in parse.ts; neither guard subsumes the other.
 */
export function guard(blocks: readonly Block[]): Block[] {
    return blocks.map((block) =>
        block.type === 'unknown' || isRoundTrippable(block)
            ? block
            : { node: null, source: block.source, type: 'unknown' },
    );
}

export function isRoundTrippable(block: Block): boolean {
    if (block.type === 'unknown' || !block.node) return false;

    try {
        const document = toDocument({ blocks: [block], prefix: '', separators: [], suffix: '' });
        const first = document.firstChild;
        if (!first) return false;

        const regenerated = parse(generateBlock(first));
        if (regenerated.blocks.length !== 1) return false;

        const after = regenerated.blocks[0].node;
        return !!after && sameTree(block.node, after);
    } catch {
        return false;
    }
}

function sameTree(a: MdastNode, b: MdastNode): boolean {
    return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

/** `position` always differs after regeneration, and `spread` is layout. */
function strip(node: unknown): unknown {
    if (Array.isArray(node)) return node.map(strip);
    if (!node || typeof node !== 'object') return node;

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
        if (key === 'position' || key === 'spread') continue;
        out[key] = strip(value);
    }
    return out;
}
