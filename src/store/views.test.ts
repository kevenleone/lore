import { describe, expect, it } from 'vitest';

import type { Collection, Item } from './types';

import { SEED_ITEMS, SEED_TAG_ORDER } from './seed';
import { EMPTY_FILTERS } from './types';
import {
    activeFilterCount,
    applyFilters,
    collectionCount,
    detailFlags,
    filterByView,
    localDateKey,
    matchesFilters,
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
        expect(c.inbox).toBe(SEED_ITEMS.filter((i) => i.flags.inbox).length);
        expect(c.today).toBe(SEED_ITEMS.filter((i) => i.flags.today).length);
        expect(c.starred).toBe(SEED_ITEMS.filter((i) => i.flags.starred).length);
    });
});

describe('filterByView', () => {
    it('filters by collection and sorts newest first', () => {
        const reading = filterByView(SEED_ITEMS, { kind: 'collection', val: 'reading' });
        expect(reading.every((i) => i.collectionId === 'reading')).toBe(true);
        for (let k = 1; k < reading.length; k++) {
            expect(reading[k - 1].createdAt >= reading[k].createdAt).toBe(true);
        }
    });

    it('filters by tag', () => {
        const design = filterByView(SEED_ITEMS, { kind: 'tag', val: 'design' });
        expect(design.every((i) => i.tags.includes('design'))).toBe(true);
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

        const byTitle = sortItems(SEED_ITEMS, 'title').map((i) => i.title);
        expect(byTitle).toEqual([...byTitle].sort((a, b) => a.localeCompare(b)));
    });
});

describe('tagCounts', () => {
    it('respects the seed order and counts occurrences', () => {
        const tags = tagCounts(SEED_ITEMS, SEED_TAG_ORDER);
        const names = tags.map((t) => t.name);
        expect(names.slice(0, SEED_TAG_ORDER.length)).toEqual(
            SEED_TAG_ORDER.filter((t) => names.includes(t)),
        );
        const design = tags.find((t) => t.name === 'design');
        expect(design?.count).toBe(SEED_ITEMS.filter((i) => i.tags.includes('design')).length);
    });
});

describe('collectionCount', () => {
    it('counts items in a collection', () => {
        expect(collectionCount(SEED_ITEMS, 'work')).toBe(
            SEED_ITEMS.filter((i) => i.collectionId === 'work').length,
        );
    });
});

describe('viewTitle', () => {
    it('maps each view kind to a label', () => {
        expect(viewTitle({ kind: 'all', val: null }, COLLECTIONS)).toBe('All Items');
        expect(viewTitle({ kind: 'starred', val: null }, COLLECTIONS)).toBe('Flagged');
        expect(viewTitle({ kind: 'collection', val: 'work' }, COLLECTIONS)).toBe('Work');
        expect(viewTitle({ kind: 'tag', val: 'design' }, COLLECTIONS)).toBe('#design');
    });
});

describe('detailFlags', () => {
    const link = SEED_ITEMS.find((i) => i.type === 'link')!;
    const code = SEED_ITEMS.find((i) => i.type === 'code')!;

    it('shows a preview only when there is an image; code blocks for code', () => {
        expect(detailFlags(link, true, 2).showPreview).toBe(false);
        expect(detailFlags({ ...link, image: 'https://x/i.png' }, true, 2).showPreview).toBe(true);
        expect(detailFlags(code, true, 0).detIsCode).toBe(true);
    });

    it('hides AI sections when aiAssist is off', () => {
        const f = detailFlags(link, false, 2);
        expect(f.showSummary).toBe(false);
        expect(f.showRelated).toBe(false);
    });
});

describe('relatedItems', () => {
    it('resolves related ids to items, dropping unknowns', () => {
        const item: Item = { ...SEED_ITEMS[0], related: ['i2', 'does-not-exist'] };
        const related = relatedItems(item, SEED_ITEMS);
        expect(related.map((r) => r.id)).toEqual(['i2']);
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
        expect(queueItems([note, item('t', { today: true }, 2)]).map((i) => i.id)).toEqual([
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
        expect(queue.map((i) => i.id)).toEqual(['open', 'done']);
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
        expect(filtered.map((i) => i.title)).toEqual(
            sorted.filter((i) => i.type === 'note' || i.type === 'link').map((i) => i.title),
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
