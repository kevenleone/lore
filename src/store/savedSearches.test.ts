import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SavedSearch } from './types';

import { getRepository } from '../data';
import { EMPTY_FILTERS } from './types';
import { useStore } from './useStore';

const saved = (over: Partial<SavedSearch> = {}): SavedSearch => ({
    filters: { ...EMPTY_FILTERS, tags: ['product'] },
    id: 's1',
    name: 'Product reading',
    query: 'linear',
    view: { kind: 'inbox', val: null },
    ...over,
});

beforeEach(() => {
    useStore.setState({
        activeSavedSearchId: null,
        filters: EMPTY_FILTERS,
        savedSearches: [],
        search: '',
        toasts: [],
        view: { kind: 'all', val: null },
    });
    Object.assign(getRepository(), { saveSavedSearches: vi.fn().mockResolvedValue(undefined) });
});

describe('saveSearch', () => {
    it('names whatever the library is currently showing', async () => {
        useStore.setState({
            filters: { ...EMPTY_FILTERS, tags: ['product'] },
            search: 'linear',
            view: { kind: 'inbox', val: null },
        });

        await useStore.getState().saveSearch('  Product reading  ');

        const [entry] = useStore.getState().savedSearches;

        expect(entry.name).toBe('Product reading');
        expect(entry.query).toBe('linear');
        expect(entry.view).toEqual({ kind: 'inbox', val: null });
        expect(entry.filters.tags).toEqual(['product']);
    });

    it('writes the whole list to the vault, not just the new one', async () => {
        const saveSavedSearches = vi.fn().mockResolvedValue(undefined);

        Object.assign(getRepository(), { saveSavedSearches });
        useStore.setState({ savedSearches: [saved()] });

        await useStore.getState().saveSearch('Second');

        expect(saveSavedSearches).toHaveBeenCalledTimes(1);
        expect(saveSavedSearches.mock.calls[0][0].map((s: SavedSearch) => s.name)).toEqual([
            'Product reading',
            'Second',
        ]);
    });

    it('refuses a name that is only whitespace', async () => {
        await useStore.getState().saveSearch('   ');

        expect(useStore.getState().savedSearches).toHaveLength(0);
    });

    it('puts the list back when the vault refuses the write', async () => {
        Object.assign(getRepository(), {
            saveSavedSearches: vi.fn().mockRejectedValue(new Error('the vault is read-only')),
        });

        await useStore.getState().saveSearch('Product reading');

        expect(useStore.getState().savedSearches).toEqual([]);
        expect(useStore.getState().toasts[0].message).toBe('the vault is read-only');
    });
});

describe('applySavedSearch', () => {
    it('puts the view, the filters and the query back together', () => {
        useStore.setState({ savedSearches: [saved()] });

        useStore.getState().applySavedSearch('s1');

        expect(useStore.getState().view).toEqual({ kind: 'inbox', val: null });
        expect(useStore.getState().filters.tags).toEqual(['product']);
        expect(useStore.getState().search).toBe('linear');
    });

    it('ignores an id the vault no longer has', () => {
        useStore.setState({ savedSearches: [saved()] });

        useStore.getState().applySavedSearch('gone');

        expect(useStore.getState().view).toEqual({ kind: 'all', val: null });
        expect(useStore.getState().search).toBe('');
    });
});

describe('leaving a saved search', () => {
    beforeEach(() => {
        useStore.setState({ savedSearches: [saved()] });
        useStore.getState().applySavedSearch('s1');
    });

    it('drops the filters and the query it brought when another view is picked', () => {
        useStore.getState().selectView('inbox');

        expect(useStore.getState().filters).toEqual(EMPTY_FILTERS);
        expect(useStore.getState().search).toBe('');
        expect(useStore.getState().activeSavedSearchId).toBeNull();
    });

    it('lets go on the way to a collection or a tag too', () => {
        useStore.getState().selectView('tag', 'design');

        expect(useStore.getState().filters).toEqual(EMPTY_FILTERS);
        expect(useStore.getState().view).toEqual({ kind: 'tag', val: 'design' });
    });

    it('leaves hand-set filters alone, which have always composed with the view', () => {
        // Out of the saved search first, then filter by hand.
        useStore.getState().selectView('all');
        useStore.setState({ filters: { ...EMPTY_FILTERS, tags: ['design'] } });

        useStore.getState().selectView('inbox');

        expect(useStore.getState().filters.tags).toEqual(['design']);
    });

    it('swaps cleanly from one saved search to another', () => {
        useStore.setState({
            savedSearches: [
                saved(),
                saved({
                    filters: { ...EMPTY_FILTERS, tags: ['design'] },
                    id: 's2',
                    name: 'Design',
                    query: '',
                    view: { kind: 'starred', val: null },
                }),
            ],
        });

        useStore.getState().applySavedSearch('s2');

        expect(useStore.getState().activeSavedSearchId).toBe('s2');
        expect(useStore.getState().filters.tags).toEqual(['design']);
        expect(useStore.getState().view).toEqual({ kind: 'starred', val: null });
        expect(useStore.getState().search).toBe('');
    });

    it('stops being in one that is deleted', async () => {
        await useStore.getState().deleteSavedSearch('s1');

        expect(useStore.getState().activeSavedSearchId).toBeNull();
    });
});

describe('deleteSavedSearch', () => {
    it('removes just the one named', async () => {
        useStore.setState({ savedSearches: [saved(), saved({ id: 's2', name: 'Second' })] });

        await useStore.getState().deleteSavedSearch('s1');

        expect(useStore.getState().savedSearches.map((entry) => entry.id)).toEqual(['s2']);
    });
});
