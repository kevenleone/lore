// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SavedSearch } from '../../store/types';

import { getRepository } from '../../data';
import { DEFAULT_PREFS, EMPTY_FILTERS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { SavedSearchesSection } from './SavedSearchesSection';

const saved = (over: Partial<SavedSearch> = {}): SavedSearch => ({
    filters: { ...EMPTY_FILTERS, tags: ['product'] },
    id: 's1',
    name: 'Product reading',
    query: '',
    view: { kind: 'inbox', val: null },
    ...over,
});

afterEach(cleanup);

beforeEach(() => {
    useStore.setState({
        filters: EMPTY_FILTERS,
        prefs: DEFAULT_PREFS,
        savedSearches: [],
        search: '',
        view: { kind: 'all', val: null },
    });
    Object.assign(getRepository(), { saveSavedSearches: vi.fn().mockResolvedValue(undefined) });
});

describe('the Saved section', () => {
    it('draws nothing at all when the vault has none', () => {
        render(<SavedSearchesSection />);

        expect(screen.queryByText('Saved')).toBeNull();
    });

    it('lists what the vault carries', () => {
        useStore.setState({ savedSearches: [saved(), saved({ id: 's2', name: 'Design work' })] });
        render(<SavedSearchesSection />);

        expect(screen.getByText('Saved')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Product reading' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Design work' })).toBeTruthy();
    });

    it('restores the view, filters and query on click', () => {
        useStore.setState({ savedSearches: [saved({ query: 'linear' })] });
        render(<SavedSearchesSection />);

        fireEvent.click(screen.getByRole('button', { name: 'Product reading' }));

        expect(useStore.getState().view).toEqual({ kind: 'inbox', val: null });
        expect(useStore.getState().filters.tags).toEqual(['product']);
        expect(useStore.getState().search).toBe('linear');
    });

    it('marks the row current when the library already shows it', () => {
        useStore.setState({
            filters: { ...EMPTY_FILTERS, tags: ['product'] },
            savedSearches: [saved()],
            view: { kind: 'inbox', val: null },
        });
        render(<SavedSearchesSection />);

        expect(
            screen.getByRole('button', { name: 'Product reading' }).getAttribute('aria-current'),
        ).toBe('page');
    });

    it('asks before removing one, and only removes it on the second press', () => {
        useStore.setState({ savedSearches: [saved()] });
        render(<SavedSearchesSection />);

        fireEvent.click(screen.getByRole('button', { name: 'Remove Product reading' }));
        expect(useStore.getState().savedSearches).toHaveLength(1);

        fireEvent.click(screen.getByRole('button', { name: 'Remove Product reading' }));
        expect(useStore.getState().savedSearches).toHaveLength(0);
    });

    it('leaves the search alone when the confirmation is cancelled', () => {
        useStore.setState({ savedSearches: [saved()] });
        render(<SavedSearchesSection />);

        fireEvent.click(screen.getByRole('button', { name: 'Remove Product reading' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(useStore.getState().savedSearches).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Product reading' })).toBeTruthy();
    });
});
