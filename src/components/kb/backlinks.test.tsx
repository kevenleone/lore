// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Item, ItemMeta } from '../../store/types';

import { getRepository } from '../../data';
import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { DetailPane } from './DetailPane';

const TARGET_ID = 'i2';
const SOURCE_ID = 'i1';

const meta = (backlinks: Item[]): ItemMeta => ({
    backlinks,
    modifiedAt: '2026-09-21T10:00:00.000Z',
    path: 'target.md',
    size: 0,
    words: 0,
});

const open = async (backlinks: Item[]): Promise<void> => {
    const detail = await getRepository().getItem(TARGET_ID);
    useStore.setState({ detail, itemMeta: meta(backlinks), selectedId: TARGET_ID });
    render(<DetailPane />);
};

beforeEach(async () => {
    useStore.setState({ prefs: DEFAULT_PREFS });
    await useStore.getState().refresh();
});

afterEach(cleanup);

describe('backlinks in the document body', () => {
    it('lists the items that link here and opens one on click', async () => {
        const source = (await getRepository().getItem(SOURCE_ID))!;
        await open([source]);

        const section = screen.getByText('Backlinks').parentElement!.parentElement!;
        expect(within(section).getByText('linked from elsewhere')).toBeTruthy();

        fireEvent.click(within(section).getByRole('button', { name: new RegExp(source.title) }));
        expect(useStore.getState().selectedId).toBe(SOURCE_ID);
    });

    it('renders nothing when no item links here', async () => {
        await open([]);

        expect(screen.queryByText('Backlinks')).toBeNull();
    });
});
