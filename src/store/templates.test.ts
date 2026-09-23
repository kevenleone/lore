import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Item, Template } from './types';

import { getRepository } from '../data';
import { dayKey } from './tasks';
import { DEFAULT_PREFS } from './types';
import { useStore } from './useStore';

const TODAY = dayKey(new Date());

const template = (over: Partial<Template> = {}): Template => ({
    body: '## Agenda\n',
    name: 'Meeting',
    tags: ['meeting'],
    type: 'note',
    ...over,
});

let createItem: ReturnType<typeof vi.fn>;
let listTemplates: ReturnType<typeof vi.fn>;

beforeEach(() => {
    createItem = vi.fn(async (input): Promise<Item> => ({
        ...input,
        createdAt: '2026-09-01T00:00:00.000Z',
        id: 'created',
        updatedAt: '2026-09-01T00:00:00.000Z',
    }));
    listTemplates = vi.fn().mockResolvedValue([template()]);
    Object.assign(getRepository(), {
        createItem,
        listBoards: vi.fn().mockResolvedValue({}),
        listCollections: vi.fn().mockResolvedValue([]),
        listItems: vi.fn().mockResolvedValue([]),
        listTemplates,
    });
    useStore.setState({
        items: [],
        prefs: DEFAULT_PREFS,
        templates: [template()],
        toasts: [],
    });
});

describe('loadTemplates', () => {
    it('reads what the vault has', async () => {
        useStore.setState({ templates: [] });

        await useStore.getState().loadTemplates();

        expect(useStore.getState().templates).toEqual([template()]);
    });

    it('leaves the list empty rather than failing when the vault has no folder', async () => {
        Object.assign(getRepository(), {
            listTemplates: vi.fn().mockRejectedValue(new Error('ENOENT')),
        });

        await useStore.getState().loadTemplates();

        expect(useStore.getState().templates).toEqual([]);
    });
});

describe('createFromTemplate', () => {
    it('writes the item the template describes', async () => {
        await useStore.getState().createFromTemplate('Meeting');

        expect(createItem).toHaveBeenCalledTimes(1);
        expect(createItem.mock.calls[0][0]).toMatchObject({
            body: '## Agenda\n',
            tags: ['meeting'],
            title: 'Meeting',
            type: 'note',
        });
    });

    it("falls back to one of Lore's own in a vault with none", async () => {
        useStore.setState({ templates: [] });

        await useStore.getState().createFromTemplate('Weekly Review');

        expect(createItem.mock.calls[0][0].title).toMatch(/^Week of \d{4}-\d{2}-\d{2}$/);
        expect(createItem.mock.calls[0][0].tags).toEqual(['review']);
    });

    it('does nothing at all when the template is gone', async () => {
        await useStore.getState().createFromTemplate('Deleted');

        expect(createItem).not.toHaveBeenCalled();
        expect(useStore.getState().toasts).toEqual([]);
    });

    it('says so when the vault refuses the write', async () => {
        Object.assign(getRepository(), {
            createItem: vi.fn().mockRejectedValue(new Error('the vault is read-only')),
        });

        await useStore.getState().createFromTemplate('Meeting');

        expect(useStore.getState().toasts[0].message).toBe('the vault is read-only');
    });
});

describe("today's note from a template", () => {
    it('takes the body and the tags, and keeps the day as the title', async () => {
        useStore.setState({ prefs: { ...DEFAULT_PREFS, dailyNoteTemplate: 'Meeting' } });

        await useStore.getState().openDailyNote();

        expect(createItem.mock.calls[0][0]).toMatchObject({
            body: '## Agenda\n',
            tags: ['meeting'],
            title: TODAY,
        });
    });

    it('writes a blank note when the named template is no longer there', async () => {
        useStore.setState({ prefs: { ...DEFAULT_PREFS, dailyNoteTemplate: 'Deleted' } });

        await useStore.getState().openDailyNote();

        expect(createItem.mock.calls[0][0]).toMatchObject({ body: '', tags: [], title: TODAY });
    });

    it('stays a plain note when no template is chosen', async () => {
        await useStore.getState().openDailyNote();

        expect(createItem.mock.calls[0][0].body).toBe('');
    });
});
