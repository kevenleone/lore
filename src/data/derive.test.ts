import { describe, expect, it } from 'vitest';

import { deriveSnippet } from './derive';

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
