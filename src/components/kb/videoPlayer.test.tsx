// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Item } from '../../store/types';

import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { DetailPane } from './DetailPane';

const video = (id: string, title: string): Item => ({
    createdAt: '2026-09-21T10:00:00.000Z',
    flags: {},
    id,
    related: [],
    snippet: 'Video by Benjamin D’Elia',
    tags: [],
    title,
    type: 'link',
    updatedAt: '2026-09-21T10:00:00.000Z',
    url: `https://player.vimeo.com/video/${id}`,
});

const FIRST = video('1084537', 'Wiz Cloud');
const SECOND = video('2084537', 'Wiz Code');

const show = (item: Item): void => {
    act(() => useStore.setState({ detail: item, selectedId: item.id }));
};

beforeEach(async () => {
    useStore.setState({ prefs: DEFAULT_PREFS });
    await useStore.getState().refresh();
    useStore.setState((state) => ({ items: [FIRST, SECOND, ...state.items] }));
});

afterEach(cleanup);

describe('a video link', () => {
    it('shows one player however often the selection moves between videos', () => {
        show(FIRST);
        render(<DetailPane />);

        show(SECOND);
        show(FIRST);
        show(SECOND);

        expect(screen.getAllByRole('button', { name: /^Play / })).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'Play Wiz Code' })).toBeTruthy();
    });
});
