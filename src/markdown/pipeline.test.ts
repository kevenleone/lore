import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { Block } from './types';

import { guard } from './fragility';
import { parse } from './parse';
import { serialize } from './serialize';
import { generateBlock } from './to-mdast';
import { toDocument } from './to-prosemirror';

const FIXTURE_DIR = join(import.meta.dirname, 'fixtures');
const fixtures = readdirSync(FIXTURE_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => [name, readFileSync(join(FIXTURE_DIR, name), 'utf8')] as const);

/** Read a body into the shape the editor would hold it in. */
function open(body: string) {
    const parsed = parse(body);
    const blocks = guard(parsed.blocks);

    return { document: toDocument({ ...parsed, blocks }), parsed: { ...parsed, blocks } };
}

describe('open and save with no edit', () => {
    it.each(fixtures)('%s is unchanged', (_name, text) => {
        const { parsed } = open(text);

        expect(serialize(parsed)).toBe(text);
    });
});

describe('editing one block', () => {
    it.each(fixtures)('%s: only the edited block moves', (name, text) => {
        const { document, parsed } = open(text);
        const index = parsed.blocks.findIndex((block) => block.type !== 'unknown');

        if (index === -1) {
            return;
        } // nothing modelled to edit

        // Regenerate exactly one block from the document, leave the rest alone.
        const node = document.child(index);
        const rewritten = serialize(parsed, (_block, i) =>
            i === index ? generateBlock(node) : undefined,
        );

        const others = parsed.blocks.filter((_b, i) => i !== index);
        let cursor = 0;

        for (const block of others) {
            const at = rewritten.indexOf(block.source, cursor);

            expect(at, `${name}: block source went missing`).toBeGreaterThanOrEqual(0);
            cursor = at + block.source.length;
        }

        expect(rewritten.startsWith(parsed.prefix), name).toBe(true);
        expect(rewritten.endsWith(parsed.suffix), name).toBe(true);
    });
});

describe('tables', () => {
    function only(body: string) {
        const { document, parsed } = open(body);

        return { block: parsed.blocks[0], node: document.child(0) };
    }

    it.each([
        ['a plain table', '| a | b |\n|---|---|\n| 1 | 2 |'],
        ['alignment', '| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |'],
        ['marks and an escaped pipe', '| **a `b`** | c |\n|---|---|\n| `x \\| y` | [l](u) |'],
        ['a table inside a list item', '- item:\n\n  | a | b |\n  |---|---|\n  | 1 | 2 |'],
    ])('models %s as editable', (_name, body) => {
        const { block, node } = only(body);

        expect(block.type).not.toBe('unknown');
        expect(node.type.name).not.toBe('unknownBlock');
    });

    it('writes an edited cell back as a valid table', () => {
        const { node } = only('| a | b |\n|:-:|---|\n| 1 | 2 |');
        const cell = node.child(1).child(0);
        const edited = node.replace(
            node.content.size - node.lastChild!.nodeSize + 2,
            node.content.size - node.lastChild!.nodeSize + cell.nodeSize,
            node.type.schema
                .node('tableCell', cell.attrs, [
                    node.type.schema.node('paragraph', null, [node.type.schema.text('one')]),
                ])
                .slice(0),
        );

        expect(edited.textContent).toBe('abone2');
        expect(parse(generateBlock(edited)).blocks[0].node).toMatchObject({
            align: ['center', null],
            type: 'table',
        });
    });

    it('writes a line break in a cell as <br>, not a row break', () => {
        const { node } = only('| a |\n|---|\n| 1 |');
        const schema = node.type.schema;
        const table = schema.node('table', null, [
            node.child(0),
            schema.node('tableRow', null, [
                schema.node('tableCell', null, [
                    schema.node('paragraph', null, [
                        schema.text('x'),
                        schema.node('hardBreak'),
                        schema.text('y'),
                    ]),
                ]),
            ]),
        ]);

        expect(generateBlock(table)).toContain('| x<br>y |');
    });
});

describe('schema coverage over the corpus', () => {
    // Not an assertion so much as a census: which real-world constructs end up
    // carried as source rather than modelled. A rise here means the editor is
    // getting less useful, and it should be a deliberate choice, not a drift.
    it('downgrades only the constructs we expect', () => {
        const downgraded: string[] = [];

        for (const [name, text] of fixtures) {
            const parsed = parse(text);
            const guarded = guard(parsed.blocks);

            guarded.forEach((block: Block, index) => {
                if (block.type === 'unknown' && parsed.blocks[index].type !== 'unknown') {
                    downgraded.push(`${name}:${parsed.blocks[index].type}`);
                }
            });
        }

        expect(downgraded.sort()).toMatchInlineSnapshot(`
          [
            "footnotes.md:paragraph",
            "reference-links.md:paragraph",
          ]
        `);
    });
});
