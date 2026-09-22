import { describe, expect, it } from 'vitest';

import type { Collection, Item } from './types';

import { SEED_ITEMS } from './seed';
import { EMPTY_FILTERS } from './types';
import {
    activeFilterCount,
    applyFilters,
    collectionCount,
    detailBodyField,
    detailFlags,
    filterByView,
    localDateKey,
    matchesFilters,
    matchesView,
    queueItems,
    relatedItems,
    sortItems,
    tagCounts,
    viewCounts,
    viewTitle,
} from './views';

const COLLECTIONS: Collection[] = [
    { color: '#8a92b8', id: 'reading', name: 'Reading List' },
    { color: '#a88f6e', id: 'work', name: 'Work' },
];

describe('viewCounts', () => {
    it('counts all/inbox/today/starred from flags', () => {
        const c = viewCounts(SEED_ITEMS);

        expect(c.all).toBe(SEED_ITEMS.length);
        expect(c.inbox).toBe(SEED_ITEMS.filter((item) => item.flags.inbox).length);
        expect(c.today).toBe(SEED_ITEMS.filter((item) => item.flags.today).length);
        expect(c.starred).toBe(SEED_ITEMS.filter((item) => item.flags.starred).length);
    });
});

describe('filterByView', () => {
    it('filters by collection and sorts newest first', () => {
        const reading = filterByView(SEED_ITEMS, { kind: 'collection', val: 'reading' });

        expect(reading.every((item) => item.collectionId === 'reading')).toBe(true);

        for (let k = 1; k < reading.length; k++) {
            expect(reading[k - 1].createdAt >= reading[k].createdAt).toBe(true);
        }
    });

    it('filters by tag', () => {
        const design = filterByView(SEED_ITEMS, { kind: 'tag', val: 'design' });

        expect(design.every((item) => item.tags.includes('design'))).toBe(true);
        expect(design.length).toBeGreaterThan(0);
    });

    it("returns everything for the 'all' view", () => {
        expect(filterByView(SEED_ITEMS, { kind: 'all', val: null })).toHaveLength(
            SEED_ITEMS.length,
        );
    });
});

describe('sortItems', () => {
    it('sorts newest/oldest by createdAt and title alphabetically', () => {
        const newest = sortItems(SEED_ITEMS, 'newest');
        const oldest = sortItems(SEED_ITEMS, 'oldest');

        expect(newest[0].id).toBe(oldest[oldest.length - 1].id);

        const byTitle = sortItems(SEED_ITEMS, 'title').map((item) => item.title);

        expect(byTitle).toEqual([...byTitle].sort((left, right) => left.localeCompare(right)));
    });
});

describe('tagCounts', () => {
    it('lists tags alphabetically and counts occurrences', () => {
        const tags = tagCounts(SEED_ITEMS);
        const names = tags.map((tag) => tag.name);

        expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right)));

        const design = tags.find((tag) => tag.name === 'design');

        expect(design?.count).toBe(SEED_ITEMS.filter((item) => item.tags.includes('design')).length);
    });
});

describe('collectionCount', () => {
    it('counts items in a collection', () => {
        expect(collectionCount(SEED_ITEMS, 'work')).toBe(
            SEED_ITEMS.filter((item) => item.collectionId === 'work').length,
        );
    });
});

describe('the type views', () => {
    it('sort every item into exactly one Library row', () => {
        const rows = ['notes', 'links', 'files'] as const;

        for (const item of SEED_ITEMS) {
            const matched = rows.filter((kind) => matchesView(item, { kind, val: null }));

            // A task has no Library row of its own — it has the Tasks surface.
            expect(matched.length, `${item.title} (${item.type})`).toBe(
                item.type === 'task' ? 0 : 1,
            );
        }
    });

    it('counts each type view off the same rule it filters by', () => {
        const c = viewCounts(SEED_ITEMS);

        for (const kind of ['notes', 'links', 'files'] as const) {
            expect(c[kind], kind).toBe(
                SEED_ITEMS.filter((item) => matchesView(item, { kind, val: null })).length,
            );
        }
    });
});

describe('viewTitle', () => {
    it('maps each view kind to a label', () => {
        expect(viewTitle({ kind: 'all', val: null }, COLLECTIONS)).toBe('Everything');
        expect(viewTitle({ kind: 'notes', val: null }, COLLECTIONS)).toBe('Notes');
        expect(viewTitle({ kind: 'links', val: null }, COLLECTIONS)).toBe('Links');
        expect(viewTitle({ kind: 'files', val: null }, COLLECTIONS)).toBe('Files');
        expect(viewTitle({ kind: 'starred', val: null }, COLLECTIONS)).toBe('Starred');
        expect(viewTitle({ kind: 'collection', val: 'work' }, COLLECTIONS)).toBe('Work');
        expect(viewTitle({ kind: 'tag', val: 'design' }, COLLECTIONS)).toBe('#design');
    });
});

describe('detailFlags', () => {
    const link = SEED_ITEMS.find((item) => item.type === 'link')!;
    const code = SEED_ITEMS.find((item) => item.type === 'code')!;

    it('shows a preview only when there is an image; code blocks for code', () => {
        expect(detailFlags(link, true, 2).showPreview).toBe(false);
        expect(detailFlags({ ...link, image: 'https://x/i.png' }, true, 2).showPreview).toBe(true);
        expect(detailFlags(code, true, 0).detIsCode).toBe(true);
    });

    it('hides AI sections when aiAssist is off', () => {
        const f = detailFlags(link, false, 2);

        expect(f.showSummary).toBe(false);
        expect(f.showRelated).toBe(false);
        expect(detailFlags(link, false, 0, 1).showBacklinks).toBe(false);
    });

    it('shows backlinks only when something links here', () => {
        expect(detailFlags(link, true, 0, 1).showBacklinks).toBe(true);
        expect(detailFlags(link, true, 2, 0).showBacklinks).toBe(false);
        expect(detailFlags(link, true, 2).showBacklinks).toBe(false);
    });
});

describe('relatedItems', () => {
    it('resolves related ids to items, dropping unknowns', () => {
        const item: Item = { ...SEED_ITEMS[0], related: ['i2', 'does-not-exist'] };
        const related = relatedItems(item, SEED_ITEMS);

        expect(related.map((item) => item.id)).toEqual(['i2']);
    });
});

describe('queueItems', () => {
    const at = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
    const item = (id: string, flags: Item['flags'], hoursAgo: number): Item => ({
        createdAt: at(hoursAgo),
        flags,
        id,
        related: [],
        tags: [],
        title: id,
        type: 'task',
        updatedAt: at(hoursAgo),
    });

    it('takes everything flagged for Today, not only tasks', () => {
        const note: Item = { ...item('n', { today: true }, 1), type: 'note' };

        expect(queueItems([note, item('t', { today: true }, 2)]).map((item) => item.id)).toEqual([
            't',
            'n',
        ]);
    });

    it('leaves out anything not in Today', () => {
        expect(queueItems([item('a', {}, 1), item('b', { inbox: true }, 2)])).toEqual([]);
    });

    it('keeps ticked-off rows, sunk to the bottom', () => {
        const queue = queueItems([
            item('done', { done: true, today: true }, 5),
            item('open', { today: true }, 1),
        ]);

        expect(queue.map((item) => item.id)).toEqual(['open', 'done']);
    });
});

describe('matchesFilters', () => {
    const item: Item = {
        collectionId: 'work',
        createdAt: '2026-03-04T10:00:00.000Z',
        flags: {},
        id: 'x1',
        related: [],
        tags: ['design', 'ai'],
        title: 'A note',
        type: 'note',
        updatedAt: '2026-03-04T10:00:00.000Z',
    };
    const day = localDateKey(item.createdAt);

    it('passes everything when nothing is filtered', () => {
        expect(matchesFilters(item, EMPTY_FILTERS)).toBe(true);
    });

    it('treats values within a facet as OR', () => {
        expect(matchesFilters(item, { ...EMPTY_FILTERS, tags: ['ai', 'rust'] })).toBe(true);
        expect(matchesFilters(item, { ...EMPTY_FILTERS, tags: ['rust'] })).toBe(false);
        expect(matchesFilters(item, { ...EMPTY_FILTERS, categories: ['note', 'task'] })).toBe(true);
        expect(matchesFilters(item, { ...EMPTY_FILTERS, categories: ['task'] })).toBe(false);
    });

    it('treats separate facets as AND', () => {
        const filters = { ...EMPTY_FILTERS, categories: ['note' as const], tags: ['rust'] };

        expect(matchesFilters(item, filters)).toBe(false);
    });

    it('matches collections, and excludes unfiled items', () => {
        expect(matchesFilters(item, { ...EMPTY_FILTERS, collectionIds: ['work'] })).toBe(true);
        expect(matchesFilters(item, { ...EMPTY_FILTERS, collectionIds: ['reading'] })).toBe(false);

        const unfiled = { ...item, collectionId: undefined };

        expect(matchesFilters(unfiled, { ...EMPTY_FILTERS, collectionIds: ['work'] })).toBe(false);
    });

    it('bounds the date range inclusively on both ends', () => {
        expect(matchesFilters(item, { ...EMPTY_FILTERS, from: day, to: day })).toBe(true);
        expect(matchesFilters(item, { ...EMPTY_FILTERS, from: '2026-03-05' })).toBe(false);
        expect(matchesFilters(item, { ...EMPTY_FILTERS, to: '2026-03-03' })).toBe(false);
    });
});

describe('applyFilters', () => {
    it('returns the list untouched when no facet is set', () => {
        expect(applyFilters(SEED_ITEMS, EMPTY_FILTERS)).toBe(SEED_ITEMS);
    });

    it('preserves the incoming order', () => {
        const sorted = sortItems(SEED_ITEMS, 'title');
        const filtered = applyFilters(sorted, { ...EMPTY_FILTERS, categories: ['note', 'link'] });

        expect(filtered.map((item) => item.title)).toEqual(
            sorted.filter((item) => item.type === 'note' || item.type === 'link').map((item) => item.title),
        );
    });
});

describe('activeFilterCount', () => {
    it('counts every set value and each date bound', () => {
        expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
        expect(
            activeFilterCount({
                categories: ['note'],
                collectionIds: [],
                from: '2026-01-01',
                tags: ['ai', 'design'],
                to: '2026-02-01',
            }),
        ).toBe(5);
    });
});

describe('detailBodyField', () => {
    const item = (over: Partial<Item>): Item => ({
        createdAt: '',
        flags: {},
        id: 'i1',
        related: [],
        tags: [],
        title: 'T',
        type: 'link',
        updatedAt: '',
        ...over,
    });

    it.each(['code', 'link', 'note', 'task'] as const)('edits the body of a %s', (type) => {
        expect(detailBodyField(item({ type }))).toBe('body');
    });

    it('sends a link to its body, not to the blurb the page gave it', () => {
        expect(detailBodyField(item({ description: 'D' }))).toBe('body');
    });

    it('edits nothing on a document fetched from an origin', () => {
        const source = {
            fetched: '',
            kind: 'github' as const,
            raw: 'https://raw.githubusercontent.com/e/e/HEAD/README.md',
            ref: 'HEAD',
        };

        expect(detailBodyField(item({ body: '# doc', source }))).toBeNull();
    });

    it('has nothing to edit on an image', () => {
        expect(detailBodyField(item({ type: 'image' }))).toBeNull();
    });
});
