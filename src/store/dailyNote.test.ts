import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Item } from './types';

import { getRepository } from '../data';
import { dayKey } from './tasks';
import { DEFAULT_PREFS } from './types';
import { useStore } from './useStore';

const TODAY = dayKey(new Date());

const note = (title: string): Item => ({
    createdAt: '2026-09-01T00:00:00.000Z',
    flags: {},
    id: `id-${title}`,
    related: [],
    tags: [],
    title,
    type: 'note',
    updatedAt: '2026-09-01T00:00:00.000Z',
});

let createItem: ReturnType<typeof vi.fn>;

beforeEach(() => {
    createItem = vi.fn(async (input) => ({ ...note(input.title), id: 'created' }));
    Object.assign(getRepository(), {
        createItem,
        listBoards: vi.fn().mockResolvedValue({}),
        listCollections: vi.fn().mockResolvedValue([]),
        listItems: vi.fn().mockResolvedValue([]),
    });
    useStore.setState({
        items: [],
        prefs: DEFAULT_PREFS,
        selectedId: null,
        toasts: [],
        view: { kind: 'inbox', val: null },
    });
});

describe('openDailyNote', () => {
    it("writes today's note named for the day", async () => {
        await useStore.getState().openDailyNote();

        expect(createItem).toHaveBeenCalledTimes(1);
        expect(createItem.mock.calls[0][0].title).toBe(TODAY);
        expect(createItem.mock.calls[0][0].type).toBe('note');
    });

    it('opens the one already there instead of writing a second', async () => {
        const existing = note(TODAY);

        useStore.setState({ items: [existing] });

        await useStore.getState().openDailyNote();

        expect(createItem).not.toHaveBeenCalled();
        expect(useStore.getState().selectedId).toBe(existing.id);
    });

    it("does not mistake yesterday's note for today's", async () => {
        useStore.setState({ items: [note('2020-01-01')] });

        await useStore.getState().openDailyNote();

        expect(createItem).toHaveBeenCalledTimes(1);
    });

    it('files it where the preference says', async () => {
        useStore.setState({ prefs: { ...DEFAULT_PREFS, dailyNoteCollection: 'journal' } });

        await useStore.getState().openDailyNote();

        expect(createItem.mock.calls[0][0].collectionId).toBe('journal');
    });

    it('leaves it at the vault root when no collection is chosen', async () => {
        await useStore.getState().openDailyNote();

        expect(createItem.mock.calls[0][0].collectionId).toBeUndefined();
    });

    it('leaves whatever view was open, so the note is actually on screen', async () => {
        useStore.setState({ items: [note(TODAY)] });

        await useStore.getState().openDailyNote();

        expect(useStore.getState().view).toEqual({ kind: 'all', val: null });
    });

    it('says so when the vault refuses the write', async () => {
        Object.assign(getRepository(), {
            createItem: vi.fn().mockRejectedValue(new Error('the vault is read-only')),
        });

        await useStore.getState().openDailyNote();

        expect(useStore.getState().toasts[0].message).toBe('the vault is read-only');
    });
});
