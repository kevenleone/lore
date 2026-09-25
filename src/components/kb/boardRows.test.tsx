// @vitest-environment jsdom

// The board shortcuts under Tasks. A collection id is a folder path, so the row
// has to choose how much of it to print — and the sidebar is the narrowest place
// in the app, where a full path truncates away the end that identifies it.

import { cleanup, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Collection, Item } from '../../store/types';

import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { Sidebar } from './Sidebar';

afterEach(cleanup);

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

const mount = (collections: Collection[], collectionId: string) => {
    useStore.setState({
        collections,
        items: [task('a', collectionId)],
        prefs: DEFAULT_PREFS,
    });

    // Scoped to the Tasks landmark: the same collection also has a row in
    // Collections, and that one is allowed to read differently.
    return within(
        render(<Sidebar onCapture={vi.fn()} />).getByRole('navigation', {
            name: 'Tasks',
        }),
    );
};

const NESTED: Collection[] = [
    { color: '#888', id: 'Work/Projects/Alpha', name: 'Work/Projects/Alpha' },
];

describe('the board shortcut rows', () => {
    it('are labelled with the folder’s own name', () => {
        const { getByText } = mount(NESTED, 'Work/Projects/Alpha');

        expect(getByText('Alpha')).toBeTruthy();
    });

    it('keep the whole path reachable, for two boards with the same name', () => {
        const { getByText } = mount(NESTED, 'Work/Projects/Alpha');

        expect(getByText('Alpha').getAttribute('title')).toBe('Work/Projects/Alpha');
    });

    it('leave a root-level board with no title to hover, having nothing to add', () => {
        const { getByText } = mount([{ color: '#888', id: 'Work', name: 'Work' }], 'Work');

        expect(getByText('Work').getAttribute('title')).toBeNull();
    });
});
