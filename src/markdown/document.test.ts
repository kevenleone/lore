// Phase 1: the mdast ↔ document mapping, and the fragility gate that decides
// which blocks are safe to model at all. All DOM-free.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { guard, isRoundTrippable } from './fragility';
import { parse } from './parse';
import { schema } from './schema';
import { generateBlocks } from './to-mdast';
import { toDocument } from './to-prosemirror';

const FIXTURE_DIR = join(import.meta.dirname, 'fixtures');
const fixtures = readdirSync(FIXTURE_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => [name, readFileSync(join(FIXTURE_DIR, name), 'utf8')] as const);

const docFor = (markdown: string) => toDocument(parse(markdown));
const firstBlockOf = (markdown: string) => generateBlocks(docFor(markdown))[0];

describe('schema', () => {
    it('builds without a DOM', () => {
        expect(Object.keys(schema.nodes)).toContain('unknownBlock');
        expect(Object.keys(schema.marks)).toEqual(
            expect.arrayContaining(['bold', 'code', 'italic', 'link', 'strike']),
        );
    });
});

describe('mdast to document', () => {
    it.each(fixtures)('%s converts without throwing', (_name, text) => {
        expect(() => docFor(text)).not.toThrow();
    });

    it('gives an empty body one editable paragraph', () => {
        const doc = docFor('');
        expect(doc.childCount).toBe(1);
        expect(doc.firstChild?.type.name).toBe('paragraph');
    });

    it('keeps unmodellable blocks as source-carrying atoms', () => {
        const doc = docFor('<div>raw</div>\n\ntext\n');
        expect(doc.firstChild?.type.name).toBe('unknownBlock');
        expect(doc.firstChild?.attrs.source).toBe('<div>raw</div>');
    });

    it('maps a GFM checkbox list to a task list, not a bullet list', () => {
        const doc = docFor('- [ ] open\n- [x] done\n');
        expect(doc.firstChild?.type.name).toBe('taskList');
        expect(doc.firstChild?.firstChild?.attrs.checked).toBe(false);
        expect(doc.firstChild?.lastChild?.attrs.checked).toBe(true);
    });

    it('maps an unchecked-free list to a bullet list', () => {
        expect(docFor('- one\n- two\n').firstChild?.type.name).toBe('bulletList');
    });
});

describe('document to markdown', () => {
    it.each([
        ['# Heading', '# Heading'],
        ['plain text', 'plain text'],
        ['> quoted', '> quoted'],
        ['- one\n- two', '- one\n- two'],
        ['1. one\n2. two', '1. one\n2. two'],
        ['- [ ] open', '- [ ] open'],
        ['```js\nconst x = 1;\n```', '```js\nconst x = 1;\n```'],
        ['**bold** and _italic_', '**bold** and _italic_'],
        ['`code` span', '`code` span'],
        ['~~struck~~', '~~struck~~'],
        ['[text](https://example.com)', '[text](https://example.com)'],
    ])('regenerates %j', (input, expected) => {
        expect(firstBlockOf(input)).toBe(expected);
    });

    it('returns an unknown block byte for byte', () => {
        const source = '$$\n\\sum_{i=1}^{n} x_i\n$$';
        expect(firstBlockOf(source)).toBe(source);
    });
});

describe('fragility gate', () => {
    it('rejects blocks the schema cannot regenerate faithfully', () => {
        const [math] = parse('$$\n\\sum x\n$$\n').blocks;
        expect(isRoundTrippable(math)).toBe(false);
    });

    it('rejects content the schema would silently drop', () => {
        // Regression: images were deleted outright by the converter and an
        // idempotence-based gate happily approved it.
        const [withImage] = parse('Text with ![alt](img.png) inline.').blocks;
        expect(isRoundTrippable(withImage)).toBe(false);

        const [withHtml] = parse('A <span>html</span> inline.').blocks;
        expect(isRoundTrippable(withHtml)).toBe(false);

        const [withFootnote] = parse('Ref[^a] here.\n\n[^a]: note\n').blocks;
        expect(isRoundTrippable(withFootnote)).toBe(false);
    });

    it('allows pure reformatting through', () => {
        // `*emphasis*` becomes `_emphasis_`: different bytes, same meaning.
        const [emphasis] = parse('Some *emphasis* here.').blocks;
        expect(isRoundTrippable(emphasis)).toBe(true);
    });

    it('accepts ordinary prose and headings', () => {
        for (const source of ['Just prose.', '# A heading', '- a\n- b']) {
            const [block] = parse(source).blocks;
            expect(isRoundTrippable(block), source).toBe(true);
        }
    });

    it('downgrades rather than drops', () => {
        const parsed = parse('$$\nx\n$$\n\nprose\n');
        const guarded = guard(parsed.blocks);
        expect(guarded.map((b) => b.type)).toEqual(['unknown', 'paragraph']);
        expect(guarded[0].source).toBe('$$\nx\n$$');
    });

    it('never loses a block', () => {
        for (const [name, text] of fixtures) {
            const parsed = parse(text);
            const guarded = guard(parsed.blocks);
            expect(guarded.length, name).toBe(parsed.blocks.length);
            expect(
                guarded.map((b) => b.source),
                name,
            ).toEqual(parsed.blocks.map((b) => b.source));
        }
    });
});
