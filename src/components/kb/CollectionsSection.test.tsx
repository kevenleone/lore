// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Item } from '../../store/types';

import { useStore } from '../../store/useStore';
import { CollectionsSection } from './CollectionsSection';

const COLLECTIONS = [
    { color: '#5b5bd6', id: 'c1', name: 'emitsignal' },
    { color: '#82a896', id: 'c2', name: 'guidelines' },
];

function item(id: string, collectionId: string): Item {
    return {
        collectionId,
        createdAt: '2026-09-08T12:00:00.000Z',
        flags: {},
        id,
        related: [],
        tags: [],
        title: id,
        type: 'note',
        updatedAt: '2026-09-08T12:00:00.000Z',
    };
}

function mount() {
    useStore.setState({
        collections: COLLECTIONS,
        items: [item('a', 'c1'), item('b', 'c1'), item('c', 'c2')],
    });
    return render(<CollectionsSection />);
}

afterEach(() => {
    cleanup();
    useStore.setState({ collections: [], items: [] });
});

describe('CollectionsSection', () => {
    it('counts the items filed in each collection', () => {
        mount();

        expect(screen.getByText('emitsignal')).toBeTruthy();
        expect(screen.getByText('2')).toBeTruthy();
        expect(screen.getByText('1')).toBeTruthy();
    });

    it('keeps the row actions out of the flow, so the count stays flush right', () => {
        // The actions cannot be display:none — they must stay in the tab order
        // — and anything that only hides them still takes the space, which is
        // what pushed every count inboard of the shortcuts above it.
        const { container } = mount();

        const actions = container.querySelector('[aria-label="Rename emitsignal"]')?.parentElement;
        expect(actions?.className).toContain('absolute');
    });

    it('leaves the actions reachable by keyboard while they are invisible', () => {
        mount();

        // Present in the DOM rather than rendered only on hover: a keyboard
        // user has no hover to give.
        expect(screen.getByRole('button', { name: 'Rename emitsignal' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Delete emitsignal' })).toBeTruthy();
    });
});
