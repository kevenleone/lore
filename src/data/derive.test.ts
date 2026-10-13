import { describe, expect, it } from 'vitest';

import { EMPTY_CANVAS_BODY, writeCanvasBody } from '../lib/canvas-body';
import { deriveSearchText, deriveSnippet } from './derive';

const task = (body: string) => deriveSnippet({ body, type: 'task' });

describe('deriveSnippet', () => {
    it('previews a task by its prose, not its checklist', () => {
        expect(task('Ship it.\n\n- [ ] first\n- [x] second')).toBe('Ship it.');
    });

    it('counts the checklist when a task is nothing but subtasks', () => {
        expect(task('- [ ] first\n- [x] second')).toBe('1/2 subtasks · first');
    });

    it('still previews an ordinary body by its first line', () => {
        expect(deriveSnippet({ body: 'Line one\nLine two', type: 'note' })).toBe('Line one');
    });

    it('falls back to a link description, then the url', () => {
        expect(deriveSnippet({ description: 'D', type: 'link', url: 'https://x' })).toBe('D');
        expect(deriveSnippet({ type: 'link', url: 'https://x' })).toBe('https://x');
    });

    it('has nothing to say about an empty body', () => {
        expect(deriveSnippet({ type: 'note' })).toBeUndefined();
    });
});

describe('deriveSnippet strips Markdown', () => {
    const snippet = (body: string) => deriveSnippet({ body, type: 'note' });

    it('shows a heading as prose', () => {
        expect(snippet('## Notes\n\nbody')).toBe('Notes');
    });

    it('drops emphasis and link syntax', () => {
        expect(snippet('**Important**: see [the docs](https://example.com)')).toBe(
            'Important: see the docs',
        );
    });

    it('skips a leading blank line rather than returning empty', () => {
        expect(snippet('\n\nreal content')).toBe('real content');
    });

    it('reads a wikilink as its target', () => {
        expect(snippet('Related to [[some note|that note]]')).toBe('Related to that note');
    });
});

describe('a sketch', () => {
    const body = writeCanvasBody(undefined, {
        appState: {},
        elements: [
            { id: 'a', text: 'API gateway', type: 'text' },
            { id: 'b', strokeColor: '#1e1e1e', type: 'rectangle' },
            { id: 'c', text: 'Queue', type: 'text' },
        ],
    });

    it('is previewed by its labels, never by its scene', () => {
        expect(deriveSnippet({ body, type: 'canvas' })).toBe('API gateway · Queue');
        expect(deriveSnippet({ body: EMPTY_CANVAS_BODY, type: 'canvas' })).toBeUndefined();
    });

    it('is searched by its labels alone', () => {
        expect(deriveSearchText({ body, type: 'canvas' })).toBe('API gateway\nQueue');
        expect(deriveSearchText({ body, type: 'note' })).toContain('strokeColor');
    });
});
