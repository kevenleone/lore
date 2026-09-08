// @vitest-environment jsdom

import { cleanup, render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BodyEditor } from './BodyEditor';

// Vitest runs without `globals`, so cleanup is not registered automatically.
afterEach(cleanup);

// ProseMirror measures layout on init; jsdom has no layout engine.
Range.prototype.getBoundingClientRect = () => new DOMRect();
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;

async function mount(markdown: string, onCommit = vi.fn()) {
    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
        errors.push(args.map(String).join(' '));
    });
    const view = render(
        <StrictMode>
            <BodyEditor itemId="item-1" onCommit={onCommit} value={markdown} />
        </StrictMode>,
    );
    await waitFor(() => expect(view.container.querySelector('.ProseMirror')).not.toBeNull());
    spy.mockRestore();
    return { ...view, errors: errors.join('\n'), onCommit };
}

describe('BodyEditor', () => {
    it.each([
        ['an empty body', ''],
        ['plain prose', 'Just some prose.\n'],
        ['a heading and a list', '# Title\n\n- one\n- two\n'],
        ['a fenced code block', '```js\nconst x = 1;\n```\n'],
        ['a table', '| a | b |\n|---|---|\n| 1 | 2 |\n'],
        ['a checkbox list', '- [ ] open\n- [x] done\n'],
        ['a block it only carries', '<div>raw</div>\n\ntext\n'],
    ])('mounts with %s and reports no error', async (_name, markdown) => {
        const { errors } = await mount(markdown);
        expect(errors).not.toMatch(/commandManager|Cannot read properties/);
    });

    it('renders the body', async () => {
        const { container } = await mount('# Title\n\nSome prose.\n');
        expect(container.textContent).toContain('Title');
        expect(container.textContent).toContain('Some prose.');
    });

    it('shows a carried block rather than dropping it', async () => {
        const { container } = await mount('<div>raw</div>\n\ntext\n');
        expect(container.querySelector('[data-unknown-block]')).not.toBeNull();
    });

    it('does not commit merely because a note was opened', async () => {
        // The design rests on this: opening must not look like an edit, or a
        // vault would fill with diffs from notes nobody touched.
        const { onCommit } = await mount('* one\n* two\n\nprose\n');
        expect(onCommit).not.toHaveBeenCalled();
    });

    it('styles blocks, so they do not all render as body text', async () => {
        const { container } = await mount('para\n\n- a\n- b\n\n1. one\n\n> quote\n');
        expect(container.querySelector('ul')?.className).toMatch(/list-disc/);
        expect(container.querySelector('ol')?.className).toMatch(/list-decimal/);
        expect(container.querySelector('blockquote')?.className).toMatch(/border-l-2/);
        expect(container.querySelector('p')?.className).toMatch(/text-title-lg/);
    });

    it('renders a checkbox list as task items the stylesheet can find', async () => {
        // `li[data-checked]` is the selector theme/tailwind.css lays out.
        const { container } = await mount('- [ ] open\n- [x] done\n');
        const items = container.querySelectorAll('li[data-checked]');
        expect(items).toHaveLength(2);
        expect(items[0].getAttribute('data-checked')).toBe('false');
        expect(items[1].getAttribute('data-checked')).toBe('true');
        expect(container.querySelector('li[data-checked] > label')).not.toBeNull();
    });

    it('carries a mixed list as source instead of inventing checkboxes', async () => {
        // One list with mixed items: the schema has no node for that.
        const source = '- a\n- b\n\n- [ ] task\n';
        const { container } = await mount(source);
        const carried = container.querySelector('[data-unknown-block]');
        expect(carried).not.toBeNull();
        expect(carried?.getAttribute('source')).toBe('- a\n- b\n\n- [ ] task');
    });

    it('renders an unmixed list normally', async () => {
        const { container } = await mount('- a\n- b\n');
        expect(container.querySelector('[data-unknown-block]')).toBeNull();
        expect(container.querySelector('ul')?.className).toMatch(/list-disc/);
    });

    it('offers both editing modes', async () => {
        const { getByText } = await mount('text\n');
        expect(getByText('Editor')).toBeTruthy();
        expect(getByText('Raw')).toBeTruthy();
    });
});

describe('BodyEditor in a task body', () => {
    it('mounts with a task prose body', async () => {
        const { container, errors } = await mount('Some prose about the task.\n');
        expect(errors).not.toMatch(/commandManager|Cannot read properties/);
        expect(container.textContent).toContain('Some prose about the task.');
    });
});
