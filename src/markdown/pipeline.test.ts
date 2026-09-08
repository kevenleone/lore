// The end-to-end guarantee, stated as a test.
//
// Read a body, build the editor document, change exactly one block, write it
// back: every other byte of the file must be identical. This is what keeps
// `git status` quiet on a vault Lore has merely been used in.

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
        if (index === -1) return; // nothing modelled to edit

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

describe('schema coverage over the corpus', () => {
    // Not an assertion so much as a census: which real-world constructs end up
    // carried as source rather than modelled. A rise here means the editor is
    // getting less useful, and it should be a deliberate choice, not a drift.
    it('downgrades only the constructs we expect', () => {
        const downgraded: string[] = [];
        for (const [name, text] of fixtures) {
            const parsed = parse(text);
            const guarded = guard(parsed.blocks);
            guarded.forEach((block: Block, i) => {
                if (block.type === 'unknown' && parsed.blocks[i].type !== 'unknown') {
                    downgraded.push(`${name}:${parsed.blocks[i].type}`);
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
