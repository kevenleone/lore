import type { Root, RootContent } from 'mdast';

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import type { Block, BlockKind, ParsedBody } from './types';

/** Everything else becomes an `unknown` block and is never regenerated. */
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
 * `$$` math and `:::` directives parse as ordinary paragraphs, so only the
 * delimiter distinguishes them. Editing one as prose would escape its `$` and
 * `\` and destroy it; the AST comparison in fragility.ts cannot see this,
 * because escaping preserves meaning at the tree level.
 */
const FENCED_PARAGRAPH = /^(?:\$\$|:::)/;

const processor = unified().use(remarkParse).use(remarkGfm);

/**
 * Every character lands in exactly one of `prefix`, a block's `source`, a
 * separator or `suffix`, so `serialize(parse(x)) === x` holds by construction.
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
