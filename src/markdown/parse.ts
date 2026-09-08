// Body text → blocks that remember their own source.

import type { Root, RootContent } from 'mdast';

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import type { Block, BlockKind, ParsedBody } from './types';

/**
 * Top-level node types the editor models. Anything else becomes an `unknown`
 * block: preserved byte-for-byte, shown as raw Markdown, never regenerated.
 *
 * `html` is deliberately absent. A body may contain arbitrary HTML a person or
 * another tool wrote, and round-tripping it through a rich-text model is how
 * markup gets silently rewritten.
 */
const MODELLED: ReadonlySet<string> = new Set([
    'blockquote',
    'code',
    'heading',
    'list',
    'paragraph',
    'table',
    'thematicBreak',
]);

/**
 * Block conventions remark does not know about, which it therefore hands back
 * as ordinary paragraphs: `$$` math and `:::` directives, both common in
 * Obsidian vaults.
 *
 * They survive untouched — a paragraph nobody edits is written from `source` —
 * but modelling one as editable prose would let the generator escape the `$`
 * and `\` on the first keystroke and destroy it. Structural type alone cannot
 * tell them apart from prose, so they are matched on the opening delimiter.
 *
 * This list is not a heuristic about arbitrary text: it names specific block
 * syntaxes. The general guard — regenerate, re-parse, compare — needs the
 * generator and belongs with it in Phase 1.
 */
const FENCED_PARAGRAPH = /^(?:\$\$|:::)/;

const processor = unified().use(remarkParse).use(remarkGfm);

/**
 * Splits a body into blocks plus the literal text around them.
 *
 * Offsets come from mdast's own `position`, so the slices are exact. Every
 * character of `body` lands in exactly one of `prefix`, a block's `source`, a
 * separator, or `suffix` — which is what makes `serialize(parse(x)) === x` hold
 * by construction rather than by careful re-rendering.
 */
export function parse(body: string): ParsedBody {
    const root = toAst(body);
    const blocks: Block[] = [];
    const separators: string[] = [];

    let cursor = 0;
    let prefix = '';

    for (const node of root.children) {
        const start = node.position?.start.offset;
        const end = node.position?.end.offset;
        // A node without position cannot be sliced, so it cannot be preserved.
        // remark always sets it for parsed (as opposed to synthesised) trees.
        if (start === undefined || end === undefined) continue;

        const gap = body.slice(cursor, start);
        if (blocks.length === 0) prefix = gap;
        else separators.push(gap);

        blocks.push(toBlock(node, body.slice(start, end)));
        cursor = end;
    }

    return { blocks, prefix, separators, suffix: body.slice(cursor) };
}

export function toAst(body: string): Root {
    return processor.parse(body) as Root;
}

function toBlock(node: RootContent, source: string): Block {
    const modelled =
        MODELLED.has(node.type) &&
        !(node.type === 'paragraph' && FENCED_PARAGRAPH.test(source.trimStart()));
    return {
        node: modelled ? node : null,
        source,
        type: (modelled ? node.type : 'unknown') satisfies BlockKind,
    };
}
