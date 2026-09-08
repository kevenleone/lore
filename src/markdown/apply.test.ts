import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { applyDocument, diffBlocks } from './apply';
import { guard } from './fragility';
import { parse } from './parse';
import { schema } from './schema';
import { toDocument } from './to-prosemirror';

const FIXTURE_DIR = join(import.meta.dirname, 'fixtures');
const fixtures = readdirSync(FIXTURE_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => [name, readFileSync(join(FIXTURE_DIR, name), 'utf8')] as const);

const NOTHING_DIRTY: ReadonlySet<number> = new Set();

function open(body: string) {
    const parsed = parse(body);
    const guarded = { ...parsed, blocks: guard(parsed.blocks) };
    return { doc: toDocument(guarded), parsed: guarded };
}

describe('applyDocument', () => {
    // Dirtiness comes from the document, not from diffing generated Markdown.
    it.each(fixtures)('%s: an untouched document writes back unchanged', (_name, text) => {
        const { doc, parsed } = open(text);
        expect(applyDocument(parsed, doc, NOTHING_DIRTY)).toBe(text);
    });

    it('keeps original bytes of untouched blocks even when they would normalise', () => {
        const body = '* one\n* two\n\n    indented code\n\nprose\n';
        const { doc, parsed } = open(body);
        expect(applyDocument(parsed, doc, NOTHING_DIRTY)).toBe(body);
    });

    it('regenerates only the blocks marked dirty', () => {
        const body = '* one\n* two\n\nprose\n';
        const { doc, parsed } = open(body);
        const written = applyDocument(parsed, doc, new Set([1]));

        // The list keeps its `*` markers; only the dirty paragraph is rewritten.
        expect(written.startsWith('* one\n* two')).toBe(true);
        expect(written).toContain('prose');
    });

    it('falls back to a whole rewrite when the block count changes', () => {
        const { parsed } = open('one\n\ntwo\n');
        const shorter = schema.node('doc', null, [
            schema.node('paragraph', null, [schema.text('only')]),
        ]);
        expect(applyDocument(parsed, shorter, NOTHING_DIRTY)).toBe('only');
    });

    it('writes an unknown block back as its source, dirty or not', () => {
        const body = '<div>raw</div>\n\ntext\n';
        const { doc, parsed } = open(body);
        expect(applyDocument(parsed, doc, new Set([0, 1]))).toBe(body);
    });
});

describe('diffBlocks', () => {
    it('reports nothing for an unchanged document', () => {
        const { doc } = open('one\n\ntwo\n');
        expect(diffBlocks(doc, doc)).toEqual([]);
    });

    it('reports the index of a replaced block', () => {
        const { doc } = open('one\n\ntwo\n');
        const edited = schema.node('doc', null, [
            doc.child(0),
            schema.node('paragraph', null, [schema.text('changed')]),
        ]);
        expect(diffBlocks(doc, edited)).toEqual([1]);
    });

    it('signals lost correspondence when the block count changes', () => {
        const { doc } = open('one\n\ntwo\n');
        const shorter = schema.node('doc', null, [doc.child(0)]);
        expect(diffBlocks(doc, shorter)).toBeNull();
    });
});
