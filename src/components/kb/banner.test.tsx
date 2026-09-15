// @vitest-environment jsdom

// Unsplash's terms require the byline wherever the photo is shown, so it has to
// survive both placements — inline under the metadata, and over the cover.

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { BannerPlacement, Item } from '../../store/types';

import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { DetailPane } from './DetailPane';

afterEach(() => {
    cleanup();
    useStore.setState({ collections: [], detail: null, items: [], prefs: DEFAULT_PREFS });
});

const ITEM: Item = {
    createdAt: '2026-01-01T00:00:00.000Z',
    flags: {},
    id: 'i1',
    image: 'https://images.unsplash.com/photo-1',
    imageCredit: {
        name: 'Jane Doe',
        profileUrl: 'https://unsplash.com/@jane',
        provider: 'unsplash',
    },
    related: [],
    tags: [],
    title: 'A note',
    type: 'note',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

const show = (bannerPlacement: BannerPlacement): void => {
    useStore.setState({
        detail: null,
        items: [ITEM],
        prefs: { ...DEFAULT_PREFS, bannerPlacement },
        selectedId: ITEM.id,
    });
    render(<DetailPane />);
};

describe('the detail pane’s thumbnail', () => {
    it('credits the photographer under the inline image', () => {
        show('inline');

        expect(screen.getByRole('button', { name: 'Jane Doe' })).toBeTruthy();
        expect(screen.getByAltText('A note')).toBeTruthy();
    });

    it('credits the photographer over the cover, and drops the inline image', () => {
        show('cover');

        expect(screen.getByRole('button', { name: 'Jane Doe' })).toBeTruthy();
        expect(screen.queryByAltText('A note')).toBeNull();
    });
});
