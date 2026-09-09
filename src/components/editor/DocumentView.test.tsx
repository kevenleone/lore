// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DocumentView } from './DocumentView';

const openExternal = vi.hoisted(() => vi.fn());
vi.mock('../../lib/appInfo', () => ({ openExternal }));

afterEach(() => {
    cleanup();
    openExternal.mockReset();
});

const mount = (markdown: string) => render(<DocumentView markdown={markdown} />).container;

describe('DocumentView', () => {
    it('renders headings as headings, not as bold prose', () => {
        const container = mount('# Title\n\n## Section');
        expect(container.querySelector('h1')?.textContent).toBe('Title');
        expect(container.querySelector('h2')?.textContent).toBe('Section');
    });

    it('renders an image, which the editor schema has no node for', () => {
        const image = mount('![shot](https://example.com/a.png)').querySelector('img');
        expect(image?.getAttribute('src')).toBe('https://example.com/a.png');
        expect(image?.getAttribute('alt')).toBe('shot');
    });

    it('renders a GFM table', () => {
        const container = mount('| a | b |\n| - | - |\n| 1 | 2 |');
        expect(container.querySelectorAll('th')).toHaveLength(2);
        expect(container.querySelectorAll('tbody td')).toHaveLength(2);
    });

    it('lifts the images out of raw HTML and drops the markup', () => {
        const container = mount('<p align="center"><img src="https://e.com/logo.png"></p>');
        expect(container.querySelector('img')?.getAttribute('src')).toBe('https://e.com/logo.png');
        expect(container.innerHTML).not.toContain('align="center"');
    });

    it('renders a checklist with disabled boxes', () => {
        const boxes = mount('- [x] done\n- [ ] todo').querySelectorAll('input[type=checkbox]');
        expect(boxes).toHaveLength(2);
        expect((boxes[0] as HTMLInputElement).checked).toBe(true);
        expect((boxes[0] as HTMLInputElement).disabled).toBe(true);
    });

    it('opens a link in the browser rather than navigating the app away', () => {
        const link = mount('[docs](https://example.com/x)').querySelector('a')!;
        fireEvent.click(link);
        expect(openExternal).toHaveBeenCalledWith('https://example.com/x');
    });

    it('keeps a fenced block as text', () => {
        expect(mount('```ts\nconst a = 1;\n```').querySelector('pre')?.textContent).toBe(
            'const a = 1;',
        );
    });

    it('renders nothing for an empty document', () => {
        expect(mount('').textContent).toBe('');
    });
});

describe('GitHub alerts', () => {
    it('titles an alert and drops the marker from the prose', () => {
        const container = mount('> [!IMPORTANT]\n> Dusklight does not provide assets.');
        expect(container.textContent).toContain('Important');
        expect(container.textContent).toContain('Dusklight does not provide assets.');
        expect(container.textContent).not.toContain('[!IMPORTANT]');
    });

    it('reads the marker on its own line too', () => {
        const container = mount('> [!WARNING]\n>\n> One.\n>\n> Two.');
        expect(container.textContent).toContain('Warning');
        expect(container.textContent).not.toContain('[!WARNING]');
        expect(container.querySelectorAll('p')).toHaveLength(3);
    });

    it.each([
        ['note', 'Note'],
        ['tip', 'Tip'],
        ['important', 'Important'],
        ['warning', 'Warning'],
        ['caution', 'Caution'],
    ])('renders a %s alert', (marker, label) => {
        expect(mount(`> [!${marker.toUpperCase()}]\n> Body.`).textContent).toContain(label);
    });

    it('is case-insensitive, as GitHub is', () => {
        expect(mount('> [!note]\n> Body.').textContent).toContain('Note');
    });

    it('keeps inline content beside the marker', () => {
        const link = mount('> [!NOTE]\n> Based on the [decomp](https://x.com).').querySelector('a');
        expect(link?.getAttribute('href')).toBe('https://x.com');
    });

    it('leaves an ordinary blockquote alone', () => {
        const container = mount('> Just a quote.');
        expect(container.querySelector('blockquote')?.textContent).toBe('Just a quote.');
    });

    it('does not treat an unknown marker as an alert', () => {
        const container = mount('> [!SOMETHING]\n> Body.');
        expect(container.querySelector('blockquote')?.textContent).toContain('[!SOMETHING]');
    });
});
