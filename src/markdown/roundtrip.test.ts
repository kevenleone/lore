// The gate for the whole editor project.
//
// If `serialize(parse(x))` is not `x` byte for byte, an editor built on this
// reformats files it merely opened, and a Git-tracked vault fills with diffs
// nobody asked for. Every fixture here is a shape a real vault contains.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parse } from './parse';
import { replaceBlock, serialize, unknownBlocks } from './serialize';

const FIXTURE_DIR = join(import.meta.dirname, 'fixtures');
const fixtures = readdirSync(FIXTURE_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => [name, readFileSync(join(FIXTURE_DIR, name), 'utf8')] as const);

describe('round trip', () => {
    it.each(fixtures)('%s is byte identical', (_name, text) => {
        expect(serialize(parse(text))).toBe(text);
    });

    it('covers the corpus', () => {
        expect(fixtures.length).toBeGreaterThanOrEqual(20);
    });
});

describe('targeted edits', () => {
    // The git-churn guarantee: editing one block must not move any other byte.
    it.each(fixtures)('%s: rewriting one block leaves the rest alone', (_name, text) => {
        const parsed = parse(text);
        if (parsed.blocks.length < 2) return;

        const index = 1;
        const marker = 'REPLACED';
        const edited = replaceBlock(parsed, index, marker);

        // Everything except the replaced block's own source is still present,
        // in order, unchanged.
        const untouched = parsed.blocks.filter((_b, i) => i !== index).map((b) => b.source);
        let cursor = 0;
        for (const source of untouched) {
            const at = edited.indexOf(source, cursor);
            expect(at).toBeGreaterThanOrEqual(0);
            cursor = at + source.length;
        }
        expect(edited).toContain(marker);
    });
});

describe('unknown blocks', () => {
    it('preserves constructs the editor does not model', () => {
        const text = readFileSync(join(FIXTURE_DIR, 'unmodellable.md'), 'utf8');
        const parsed = parse(text);
        const unknown = unknownBlocks(parsed);

        expect(unknown.length).toBeGreaterThan(0);
        expect(unknown.every((block) => block.node === null)).toBe(true);
        for (const block of unknown) expect(text).toContain(block.source);
        expect(serialize(parsed)).toBe(text);
    });

    it('classifies math and directive fences as unknown, not prose', () => {
        // Both parse as ordinary paragraphs; only the source tells them apart,
        // and regenerating either as prose would corrupt it.
        const parsed = parse('$$\n\\sum x_i\n$$\n\n:::info\nbody\n:::\n');
        expect(parsed.blocks.map((b) => b.type)).toEqual(['unknown', 'unknown']);
    });

    it('still models an ordinary paragraph that merely mentions a dollar sign', () => {
        expect(parse('Costs $5 and $$ is not at the start.').blocks[0].type).toBe('paragraph');
    });

    it('treats raw HTML as unknown rather than remodelling it', () => {
        const text = readFileSync(join(FIXTURE_DIR, 'html-block.md'), 'utf8');
        const parsed = parse(text);
        expect(parsed.blocks[0].type).toBe('unknown');
        expect(parsed.blocks[0].node).toBeNull();
    });
});

describe('structure', () => {
    it('accounts for every character of the body', () => {
        for (const [name, text] of fixtures) {
            const parsed = parse(text);
            const total =
                parsed.prefix.length +
                parsed.suffix.length +
                parsed.blocks.reduce((sum, b) => sum + b.source.length, 0) +
                parsed.separators.reduce((sum, s) => sum + s.length, 0);
            expect(total, name).toBe(text.length);
        }
    });

    it('handles an empty body', () => {
        expect(serialize(parse(''))).toBe('');
        expect(parse('').blocks).toHaveLength(0);
    });
});
