// @vitest-environment jsdom

// The rails are a preference, and a preference nothing reads is a toggle that
// does nothing. These assert both places actually go dark together.

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Collection, Item } from '../../store/types';

import { DEFAULT_PREFS, DEFAULT_SWITCHES } from '../../store/types';
import { useStore } from '../../store/useStore';
import { CollectionsSection } from './CollectionsSection';
import { Sidebar } from './Sidebar';

afterEach(cleanup);

const COLLECTIONS: Collection[] = [
    { color: '#888', id: 'Work', name: 'Work' },
    { color: '#888', id: 'Work/Projects', name: 'Work/Projects' },
];

const task = (id: string, collectionId: string): Item => ({
    collectionId,
    createdAt: '2026-09-01T00:00:00.000Z',
    flags: {},
    id,
    related: [],
    tags: [],
    title: id,
    type: 'task',
    updatedAt: '2026-09-01T00:00:00.000Z',
});

const setup = (sidebarRails: boolean) => {
    useStore.setState({
        collections: COLLECTIONS,
        items: [task('a', 'Work')],
        prefs: {
            ...DEFAULT_PREFS,
            collapsedCollections: [],
            switches: { ...DEFAULT_SWITCHES, sidebarRails },
        },
    });
};

const collectionRails = (root: HTMLElement) =>
    root.querySelectorAll('[aria-hidden="true"].border-l').length;

const boardRail = (root: HTMLElement) => root.querySelectorAll('.border-l').length;

describe('collection rails', () => {
    it('are drawn when the preference is on', () => {
        setup(true);

        expect(collectionRails(render(<CollectionsSection />).container)).toBeGreaterThan(0);
    });

    it('are gone when it is off', () => {
        setup(false);

        expect(collectionRails(render(<CollectionsSection />).container)).toBe(0);
    });

    it('leaves the rows themselves in place either way', () => {
        setup(false);

        const container = render(<CollectionsSection />).container;

        expect(container.textContent).toContain('Projects');
    });

    it('rails the top level too, so the section reads like the boards do', () => {
        setup(true);

        const container = render(<CollectionsSection />).container;
        // `Work` sits at the vault root and still carries one.
        const first = container.querySelector('[aria-hidden="true"]');

        expect(first?.className).toContain('border-l');
    });

    it('keeps the indent when the rails are off, so the tree still reads', () => {
        setup(false);

        const container = render(<CollectionsSection />).container;

        expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
    });
});

describe('the two sections line up', () => {
    // A root collection sat one indent right of a root board, because each
    // section built its own indent out of different pieces. They now share one.
    const wrapper = (root: HTMLElement, label: string) =>
        root
            .querySelector(`[aria-label="${label}"] .flex-col`)
            ?.className.replace(/border-l border-border/, '')
            .trim();

    it('indents the boards and the collections by the same construction', () => {
        setup(true);

        const container = render(<Sidebar onCapture={vi.fn()} />).container;

        expect(wrapper(container, 'Tasks')).toBe(wrapper(container, 'Collections'));
    });
});

describe('the board rail', () => {
    it('follows the same preference, so the two cannot disagree', () => {
        setup(true);

        const on = boardRail(render(<Sidebar onCapture={vi.fn()} />).container);

        cleanup();
        setup(false);

        const off = boardRail(render(<Sidebar onCapture={vi.fn()} />).container);

        expect(on).toBeGreaterThan(off);
    });
});
