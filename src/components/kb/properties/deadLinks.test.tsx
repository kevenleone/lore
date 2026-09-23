// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Item, ItemMeta } from '../../../store/types';

import { DEFAULT_PREFS } from '../../../store/types';
import { useStore } from '../../../store/useStore';
import { RelationshipsSection } from './RelationshipsSection';

const ITEM: Item = {
    createdAt: '2026-09-01T00:00:00.000Z',
    flags: {},
    id: 'i1',
    related: [],
    tags: [],
    title: 'The one doing the linking',
    type: 'note',
    updatedAt: '2026-09-01T00:00:00.000Z',
};

const meta = (unresolved: string[]): ItemMeta => ({
    backlinks: [],
    modifiedAt: '2026-09-21T10:00:00.000Z',
    path: 'source.md',
    size: 0,
    unresolved,
    words: 0,
});

const open = (unresolved: string[]) => {
    useStore.setState({ itemMeta: meta(unresolved), items: [ITEM], prefs: DEFAULT_PREFS });
    render(<RelationshipsSection item={ITEM} />);
};

afterEach(cleanup);

beforeEach(() => {
    useStore.setState({ itemMeta: null, items: [] });
});

describe('dead links in Relationships', () => {
    it('names a link pointing at a note that does not exist yet', () => {
        open(['[[a-note-not-written-yet]]']);

        expect(screen.getByText('a-note-not-written-yet')).toBeTruthy();
        expect(screen.getByText('Not here yet')).toBeTruthy();
    });

    it('shows the missing target rather than the alias it would have read as', () => {
        open(['[[second-brain|Building a Second Brain]]']);

        expect(screen.getByText('second-brain')).toBeTruthy();
        expect(screen.queryByText('Building a Second Brain')).toBeNull();
    });

    it('drops a heading from the target', () => {
        open(['[[some-note#Heading]]']);

        expect(screen.getByText('some-note')).toBeTruthy();
    });

    it('offers no way to unlink one, because nothing could be written back', () => {
        open(['[[a-note-not-written-yet]]']);

        expect(screen.queryByRole('button', { name: /Unlink/ })).toBeNull();
    });

    it('shows no chips when every link resolves', () => {
        open([]);

        expect(screen.queryByText('Not here yet')).toBeNull();
    });
});
