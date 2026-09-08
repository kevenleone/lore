// The general guard promised by Phase 0, Finding 1.
//
// A block is safe to model only if converting it into the editor's document and
// generating Markdown back out preserves its *meaning* — compared as syntax
// trees, with positions stripped, so that pure reformatting (`*` to `_`, bullet
// markers, pipe padding) passes while anything that changes structure fails.
//
// This catches the dangerous case: content the schema has no node for. An image
// or a footnote reference in a paragraph would otherwise be dropped or escaped
// on the first keystroke, silently. Blocks that fail are downgraded to
// `unknown` — carried as source, shown as raw Markdown, never regenerated.
//
// It does NOT catch syntax whose meaning *is* its bytes: `$$` math and `:::`
// directives survive an AST comparison intact, because remark reads them as
// prose and escaping them is meaning-preserving at the tree level. Those are
// matched on their delimiter in `parse.ts`. The two guards are complementary
// and both are needed.

import type { Node as MdastNode } from 'mdast';

import type { Block } from './types';

import { parse } from './parse';
import { generateBlock } from './to-mdast';
import { toDocument } from './to-prosemirror';

/**
 * Re-classifies blocks the schema cannot faithfully regenerate. Run after
 * `parse` and before building a document for editing.
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
        // A conversion that throws is, by definition, not safe to model.
        return false;
    }
}

function sameTree(a: MdastNode, b: MdastNode): boolean {
    return JSON.stringify(strip(a)) === JSON.stringify(strip(b));
}

/**
 * A node's meaning, without its source coordinates. `position` differs by
 * construction after regeneration, and list `spread` is layout rather than
 * content, so neither takes part in the comparison.
 */
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
