// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Item } from '../../store/types';

import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { CommandMenu } from './CommandMenu';

function item(id: string, title: string, updatedAt = '2026-01-01T00:00:00Z'): Item {
    return {
        createdAt: updatedAt,
        flags: {},
        id,
        related: [],
        tags: [],
        title,
        type: 'note',
        updatedAt,
    };
}

const ITEMS = [
    item('a', 'Meeting notes', '2026-03-01T00:00:00Z'),
    item('b', 'Tauri docs', '2026-02-01T00:00:00Z'),
];

const loadDetail = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
    useStore.setState({
        collections: [],
        commandMenuOpen: true,
        items: ITEMS,
        loadDetail,
        mainView: 'library',
        prefs: DEFAULT_PREFS,
        recentItemIds: [],
        recentSearches: [],
        search: '',
    });
});

afterEach(cleanup);

function activeOption(): HTMLElement | undefined {
    return screen.getAllByRole('option').find((o) => o.getAttribute('aria-selected') === 'true');
}

function input(): HTMLElement {
    return screen.getByRole('combobox');
}

function press(key: string): void {
    fireEvent.keyDown(input(), { key });
}

function type(text: string): void {
    fireEvent.change(input(), { target: { value: text } });
}

describe('CommandMenu', () => {
    it('falls back to recently updated documents before anything was opened', () => {
        render(<CommandMenu />);

        expect(screen.getByText('Recent')).toBeTruthy();
        expect(screen.getAllByRole('option')[0].textContent).toContain('Meeting notes');
    });

    it('filters commands as you type and runs the highlighted one on Enter', () => {
        render(<CommandMenu />);

        type('calen');
        expect(activeOption()?.textContent).toContain('Calendar');
        press('Enter');

        expect(useStore.getState().mainView).toBe('calendar');
        expect(useStore.getState().commandMenuOpen).toBe(false);
    });

    it('moves the highlight with the arrow keys, wrapping at the ends', () => {
        render(<CommandMenu />);

        const options = screen.getAllByRole('option');

        press('ArrowUp');
        expect(activeOption()).toBe(options[options.length - 1]);
        press('ArrowDown');
        expect(activeOption()).toBe(options[0]);
    });

    it('gives collections their own section and leaves document actions out', () => {
        useStore.setState({ collections: [{ color: '#f00', id: 'c1', name: 'Research' }] });
        render(<CommandMenu />);

        expect(screen.getByText('Collections')).toBeTruthy();
        expect(screen.getByRole('option', { name: /Research/ })).toBeTruthy();
        expect(screen.queryByRole('option', { name: /Toggle Properties/ })).toBeNull();
        expect(screen.queryByRole('option', { name: /Export as PDF/ })).toBeNull();
    });

    it('keeps one heading per section while filtering', () => {
        render(<CommandMenu />);

        type('s');

        expect(screen.getAllByText('Actions')).toHaveLength(1);
        expect(screen.getAllByText('Go to')).toHaveLength(1);
    });

    it('closes on Escape', () => {
        render(<CommandMenu />);

        press('Escape');

        expect(useStore.getState().commandMenuOpen).toBe(false);
    });

    it('opens a matching document and remembers the query', () => {
        render(<CommandMenu />);

        type('tau');
        fireEvent.click(screen.getByRole('option', { name: /Tauri docs/ }));

        const state = useStore.getState();

        expect(state.selectedId).toBe('b');
        expect(state.openId).toBe('b');
        expect(state.openAs).toBe('page');
        expect(state.recentItemIds[0]).toBe('b');
        expect(state.recentSearches).toEqual(['tau']);
    });

    it('opens a document as a page even when the preference is the drawer', () => {
        useStore.setState({ prefs: { ...DEFAULT_PREFS, openMode: 'drawer', viewMode: 'cards' } });
        render(<CommandMenu />);

        type('meet');
        fireEvent.click(screen.getByRole('option', { name: /Meeting notes/ }));

        expect(useStore.getState().openAs).toBe('page');
    });

    it('filters the library by the query', () => {
        useStore.setState({ mainView: 'calendar' });
        render(<CommandMenu />);

        type('meet');
        fireEvent.click(screen.getByRole('option', { name: /Filter library by/ }));

        const state = useStore.getState();

        expect(state.search).toBe('meet');
        expect(state.mainView).toBe('library');
    });

    it('lists recent searches and opened documents, and refills the input from a search', () => {
        useStore.setState({ recentItemIds: ['b', 'gone'], recentSearches: ['roadmap'] });
        render(<CommandMenu />);

        expect(screen.getByText('Recent searches')).toBeTruthy();
        expect(screen.getByText('Recently opened')).toBeTruthy();
        expect(screen.queryByText('Recent')).toBeNull();

        fireEvent.click(screen.getByRole('option', { name: /roadmap/ }));

        expect((input() as HTMLInputElement).value).toBe('roadmap');
        expect(useStore.getState().commandMenuOpen).toBe(true);
    });
});

describe('recents', () => {
    it('moves a reopened document to the front without duplicating it', () => {
        useStore.setState({ recentItemIds: ['a', 'b'] });

        useStore.getState().selectItem('b');

        expect(useStore.getState().recentItemIds).toEqual(['b', 'a']);
    });

    it('dedupes searches regardless of case and ignores one-letter queries', () => {
        useStore.setState({ recentSearches: ['Tauri'] });

        useStore.getState().recordRecentSearch('x');
        useStore.getState().recordRecentSearch('  tauri ');

        expect(useStore.getState().recentSearches).toEqual(['tauri']);
    });

    it('caps both lists', () => {
        for (let index = 0; index < 12; index++) {
            useStore.getState().recordRecentItem(`i${index}`);
            useStore.getState().recordRecentSearch(`query ${index}`);
        }

        expect(useStore.getState().recentItemIds).toHaveLength(8);
        expect(useStore.getState().recentSearches).toHaveLength(5);
    });
});

describe('following a link', () => {
    it('keeps a full page a full page', () => {
        useStore.getState().openItemPage('a');

        useStore.getState().openLinkedItem('b');

        const state = useStore.getState();

        expect(state.openId).toBe('b');
        expect(state.openAs).toBe('page');
    });

    it('opens the usual way from a drawer', () => {
        useStore.setState({
            openAs: 'drawer',
            openId: 'a',
            prefs: { ...DEFAULT_PREFS, openMode: 'drawer', viewMode: 'cards' },
        });

        useStore.getState().openLinkedItem('b');

        const state = useStore.getState();

        expect(state.openId).toBe('b');
        expect(state.openAs).toBeNull();
    });
});
