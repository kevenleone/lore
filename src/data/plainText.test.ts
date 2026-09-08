import { describe, expect, it } from 'vitest';

import { deriveTitle, firstPlainLine, markdownToPlainText } from './plainText';

const plain = (markdown: string) => markdownToPlainText(markdown).trim();

describe('markdownToPlainText', () => {
    it.each([
        ['# Heading', 'Heading'],
        ['### Deep heading', 'Deep heading'],
        ['**bold**', 'bold'],
        ['*italic*', 'italic'],
        ['_italic_', 'italic'],
        ['***both***', 'both'],
        ['~~struck~~', 'struck'],
        ['`code`', 'code'],
        ['> quoted', 'quoted'],
        ['- item', 'item'],
        ['1. item', 'item'],
        ['- [ ] todo', 'todo'],
        ['- [x] done', 'done'],
        ['[text](https://example.com)', 'text'],
        ['![alt](image.png)', 'alt'],
        ['[text][ref]', 'text'],
        ['[[some note]]', 'some note'],
        ['[[note|alias]]', 'alias'],
        ['[[note#heading]]', 'note'],
        ['<span>html</span>', 'html'],
        ['escaped \\*not emphasis\\*', 'escaped *not emphasis*'],
    ])('%j becomes %j', (input, expected) => {
        expect(plain(input)).toBe(expected);
    });

    it('handles nesting', () => {
        expect(plain('**bold with [a link](url) inside**')).toBe('bold with a link inside');
        expect(plain('- **item** with `code`')).toBe('item with code');
    });

    it('drops code fences but keeps their contents', () => {
        expect(plain('```js\nconst x = 1;\n```')).toBe('const x = 1;');
    });

    it('leaves ordinary prose alone', () => {
        const prose = 'Costs $5, uses a * for footnotes, and 2 < 3.';
        expect(plain(prose)).toBe(prose);
    });

    it('never returns Markdown syntax for the shapes it handles', () => {
        const messy = '## A **heading** with [link](x) and `code`';
        expect(plain(messy)).not.toMatch(/[#*`[\]]/);
    });
});

describe('firstPlainLine', () => {
    it('skips blank lines', () => {
        expect(firstPlainLine('\n\n# Title\n\nbody')).toBe('Title');
    });

    it('is empty for empty input', () => {
        expect(firstPlainLine('')).toBe('');
        expect(firstPlainLine('\n\n')).toBe('');
    });
});

describe('deriveTitle', () => {
    it('drops the Markdown that made it a heading', () => {
        expect(deriveTitle('# Groceries\n\nmilk')).toBe('Groceries');
        expect(deriveTitle('## A subheading')).toBe('A subheading');
    });

    it('drops inline syntax too', () => {
        expect(deriveTitle('**Important** thing')).toBe('Important thing');
        expect(deriveTitle('- [ ] a task')).toBe('a task');
    });

    it('skips leading blank lines', () => {
        expect(deriveTitle('\n\nReal first line')).toBe('Real first line');
    });

    it('caps the length', () => {
        expect(deriveTitle('x'.repeat(200))).toHaveLength(80);
    });

    it('is empty when there is nothing to title', () => {
        expect(deriveTitle('')).toBe('');
    });
});
