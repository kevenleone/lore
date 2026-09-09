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
