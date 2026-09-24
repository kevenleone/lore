// @vitest-environment jsdom

// `[[target]]` drawn in the body. The decoration is a view concern only, so
// what these assert is what the reader sees — never the document, which must
// come back out as the same Markdown that went in.
//
// The click itself is covered in `markdown/wikilinkDecoration.test.ts`, against
// the ranges the handler tests a position against: driving a real ProseMirror
// click needs `elementFromPoint` and a layout engine, and jsdom has neither.

import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Item } from '../../store/types';

import { useStore } from '../../store/useStore';
import { BlockEditor } from './BlockEditor';

const MOUNT_TIMEOUT = { timeout: 10_000 };

Range.prototype.getBoundingClientRect = () => new DOMRect();
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;

afterEach(cleanup);

const item = (id: string, path: string): Item => ({
    createdAt: '2026-09-01T00:00:00.000Z',
    flags: {},
    id,
    path,
    related: [],
    tags: [],
    title: id,
    type: 'note',
    updatedAt: '2026-09-01T00:00:00.000Z',
});

let openLinkedItem: ReturnType<typeof vi.fn>;

beforeEach(() => {
    openLinkedItem = vi.fn();
    useStore.setState({
        items: [item('linear-id', 'Work/linear.md')],
        openLinkedItem,
    });
});

async function mount(markdown: string) {
    const view = render(<BlockEditor onChange={vi.fn()} value={markdown} />);

    await waitFor(
        () => expect(view.container.querySelector('.ProseMirror')).not.toBeNull(),
        MOUNT_TIMEOUT,
    );

    return view.container;
}

const links = (container: HTMLElement) =>
    [...container.querySelectorAll('[data-wikilink]')] as HTMLElement[];

describe('wikilinks in the body', () => {
    it('draws one that resolves as a link', async () => {
        const container = await mount('As [[linear]] does it.');

        expect(links(container)).toHaveLength(1);
        expect(links(container)[0].getAttribute('data-wikilink')).toBe('linear-id');
    });

    it('leaves the brackets on screen, so the target stays editable', async () => {
        const container = await mount('As [[linear]] does it.');

        expect(container.textContent).toContain('[[linear]]');
    });

    it('draws one that resolves to nothing without making it clickable', async () => {
        const container = await mount('See [[not-written-yet]].');

        expect(links(container)).toHaveLength(0);
        expect(container.textContent).toContain('[[not-written-yet]]');
    });

    it('resolves through an alias', async () => {
        const container = await mount('As [[linear|they do]] does it.');

        expect(links(container)[0].getAttribute('data-wikilink')).toBe('linear-id');
    });

    it('resolves through a heading', async () => {
        const container = await mount('As [[linear#Pricing]] does it.');

        expect(links(container)[0].getAttribute('data-wikilink')).toBe('linear-id');
    });

    it('draws nothing inside a fenced block, which is showing the syntax', async () => {
        const container = await mount('```\n[[linear]]\n```');

        expect(links(container)).toHaveLength(0);
    });

    it('draws nothing inside a backtick span', async () => {
        const container = await mount('Write `[[linear]]` to link.');

        expect(links(container)).toHaveLength(0);
    });

    it('draws each of several in one paragraph', async () => {
        useStore.setState({
            items: [item('linear-id', 'linear.md'), item('kroll-id', 'kroll.md')],
        });

        const container = await mount('Both [[linear]] and [[kroll]].');

        expect(links(container).map((node) => node.getAttribute('data-wikilink'))).toEqual([
            'linear-id',
            'kroll-id',
        ]);
    });
});
