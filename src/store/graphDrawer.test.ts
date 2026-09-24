import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Item } from './types';

import { getRepository } from '../data';
import { useStore } from './useStore';

const item: Item = {
    createdAt: '2026-09-01T00:00:00.000Z',
    flags: {},
    id: 'one',
    related: [],
    tags: [],
    title: 'One',
    type: 'note',
    updatedAt: '2026-09-01T00:00:00.000Z',
};

beforeEach(() => {
    Object.assign(getRepository(), {
        getItem: vi.fn().mockResolvedValue(item),
        itemMeta: vi.fn().mockResolvedValue(null),
    });
    useStore.setState({
        items: [item],
        mainView: 'graph',
        openAs: null,
        openId: null,
        recentItemIds: [],
        selectedId: null,
    });
});

describe('openItemDrawer', () => {
    it('opens the drawer', () => {
        useStore.getState().openItemDrawer('one');

        expect(useStore.getState().openAs).toBe('drawer');
        expect(useStore.getState().openId).toBe('one');
    });

    it('selects the item, so the pane has something to draw', () => {
        useStore.getState().openItemDrawer('one');

        expect(useStore.getState().selectedId).toBe('one');
    });

    it('leaves the surface where it is — the graph stays behind the drawer', () => {
        useStore.getState().openItemDrawer('one');

        expect(useStore.getState().mainView).toBe('graph');
    });

    it('records the item as recently opened, the way selecting one does', () => {
        useStore.getState().openItemDrawer('one');

        expect(useStore.getState().recentItemIds).toContain('one');
    });

    it('is closed again by the pane’s own close, which the graph does not own', () => {
        useStore.getState().openItemDrawer('one');
        useStore.getState().closeOpenItem();

        expect(useStore.getState().openId).toBeNull();
        expect(useStore.getState().mainView).toBe('graph');
    });
});

describe('expandOpenItem', () => {
    it('goes to the library, which is the only surface that draws a page', () => {
        useStore.getState().openItemDrawer('one');
        useStore.getState().expandOpenItem();

        expect(useStore.getState().openAs).toBe('page');
        expect(useStore.getState().mainView).toBe('library');
    });

    it('keeps the item it was showing', () => {
        useStore.getState().openItemDrawer('one');
        useStore.getState().expandOpenItem();

        expect(useStore.getState().openId).toBe('one');
        expect(useStore.getState().selectedId).toBe('one');
    });
});

describe('selectItem, for contrast', () => {
    it('does go to the library', () => {
        useStore.getState().selectItem('one');

        expect(useStore.getState().mainView).toBe('library');
    });
});
