import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Item } from './types';

import { getRepository } from '../data';
import { EMPTY_FILTERS } from './types';
import { useStore } from './useStore';

const item = (id: string, over: Partial<Item> = {}): Item => ({
    createdAt: '2026-09-01T00:00:00.000Z',
    flags: {},
    id,
    related: [],
    tags: [],
    title: id,
    type: 'note',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...over,
});

const ITEMS = [item('a'), item('b'), item('c'), item('d')];
const ORDER = ITEMS.map((entry) => entry.id);

let updateItem: ReturnType<typeof vi.fn>;
let deleteItem: ReturnType<typeof vi.fn>;

beforeEach(() => {
    updateItem = vi.fn().mockResolvedValue(undefined);
    deleteItem = vi.fn().mockResolvedValue(undefined);
    Object.assign(getRepository(), {
        deleteItem,
        listBoards: vi.fn().mockResolvedValue({}),
        listCollections: vi.fn().mockResolvedValue([]),
        listItems: vi.fn().mockResolvedValue(ITEMS),
        updateItem,
    });
    useStore.setState({
        checkedIds: [],
        collections: [],
        filters: EMPTY_FILTERS,
        items: ITEMS,
        search: '',
        searchResults: null,
        sort: 'newest',
        toasts: [],
        view: { kind: 'all', val: null },
    });
});

describe('ticking rows', () => {
    it('adds and removes one at a time', () => {
        useStore.getState().toggleChecked('a');
        useStore.getState().toggleChecked('c');

        expect(useStore.getState().checkedIds).toEqual(['a', 'c']);

        useStore.getState().toggleChecked('a');

        expect(useStore.getState().checkedIds).toEqual(['c']);
    });

    it('reaches from the last tick to the shift-clicked row, inclusive', () => {
        useStore.getState().toggleChecked('a');
        useStore.getState().checkRange('c', ORDER);

        expect(useStore.getState().checkedIds).toEqual(['a', 'b', 'c']);
    });

    it('reaches backwards too', () => {
        useStore.getState().toggleChecked('d');
        useStore.getState().checkRange('b', ORDER);

        expect(useStore.getState().checkedIds.sort()).toEqual(['b', 'c', 'd']);
    });

    it('is an ordinary tick when there is nothing to reach back to', () => {
        useStore.getState().checkRange('c', ORDER);

        expect(useStore.getState().checkedIds).toEqual(['c']);
    });

    it('lets go of everything when the view changes', () => {
        useStore.getState().toggleChecked('a');
        useStore.getState().selectView('inbox');

        expect(useStore.getState().checkedIds).toEqual([]);
    });
});

describe('bulk edits', () => {
    it('tags every ticked item and skips the ones that already have it', async () => {
        useStore.setState({
            checkedIds: ['a', 'b'],
            items: [item('a', { tags: ['product'] }), item('b'), item('c')],
        });

        await useStore.getState().bulkAddTag('#Product');

        // Normalised, and `a` is left alone rather than written again.
        expect(updateItem).toHaveBeenCalledTimes(1);
        expect(updateItem.mock.calls[0][0]).toBe('b');
        expect(updateItem.mock.calls[0][1].tags).toEqual(['product']);
    });

    it('refreshes once for the whole set, not once per item', async () => {
        useStore.setState({ checkedIds: ['a', 'b', 'c'] });

        await useStore.getState().bulkMove('work');

        expect(updateItem).toHaveBeenCalledTimes(3);
        expect(getRepository().listItems).toHaveBeenCalledTimes(1);
    });

    it('drops the ticks once the change is made', async () => {
        useStore.setState({ checkedIds: ['a', 'b'] });

        await useStore.getState().bulkStar(true);

        expect(useStore.getState().checkedIds).toEqual([]);
    });

    it('ignores a tick on an item the list is no longer showing', async () => {
        // Ticked, then filtered away. Acting on it would be acting unseen.
        useStore.setState({
            checkedIds: ['a', 'b'],
            filters: { ...EMPTY_FILTERS, tags: ['keep'] },
            items: [item('a'), item('b', { tags: ['keep'] })],
        });

        await useStore.getState().bulkStar(true);

        expect(updateItem).toHaveBeenCalledTimes(1);
        expect(updateItem.mock.calls[0][0]).toBe('b');
    });

    it('does not delete a ticked item that has been filtered away', async () => {
        useStore.setState({
            checkedIds: ['a', 'b'],
            filters: { ...EMPTY_FILTERS, tags: ['keep'] },
            items: [item('a'), item('b', { tags: ['keep'] })],
        });

        await useStore.getState().bulkDelete();

        expect(deleteItem).toHaveBeenCalledTimes(1);
        expect(deleteItem).toHaveBeenCalledWith('b');
    });

    it('says so when one of them fails rather than looking like it worked', async () => {
        Object.assign(getRepository(), {
            updateItem: vi.fn().mockRejectedValue(new Error('the vault is read-only')),
        });
        useStore.setState({ checkedIds: ['a'] });

        await useStore.getState().bulkStar(true);

        expect(useStore.getState().toasts[0].message).toBe('the vault is read-only');
    });
});
