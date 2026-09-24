import { describe, expect, it } from 'vitest';

import type { Item } from '../store/types';

import { resolveWikilink, wikilinkParts } from './wikilinks';

const item = (id: string, path: string): Item => ({
    createdAt: '2026-09-01T00:00:00.000Z',
    flags: {},
    id,
    path,
    related: [],
    tags: [],
    title: id,
    type: 'note',
    updatedAt: '2026-09-01T00:00:00.000Z',
});

const ITEMS = [item('one', 'Work/linear.md'), item('two', 'kroll.md')];

describe('wikilinkParts', () => {
    it('takes a bare target as both the target and the label', () => {
        expect(wikilinkParts('linear')).toEqual({ label: 'linear', target: 'linear' });
    });

    it('shows the alias and resolves the target', () => {
        expect(wikilinkParts('linear|how they ship')).toEqual({
            label: 'how they ship',
            target: 'linear',
        });
    });

    it('drops a heading from the target', () => {
        expect(wikilinkParts('linear#Pricing')).toEqual({ label: 'linear', target: 'linear' });
    });

    it('keeps a pipe inside an alias', () => {
        expect(wikilinkParts('linear|a|b').label).toBe('a|b');
    });

    it('trims the space people leave inside the brackets', () => {
        expect(wikilinkParts(' linear ').target).toBe('linear');
    });
});

describe('resolveWikilink', () => {
    it('matches the filename stem, not the folder', () => {
        expect(resolveWikilink('linear', ITEMS)?.id).toBe('one');
    });

    it('does not care about case', () => {
        expect(resolveWikilink('LiNeAr', ITEMS)?.id).toBe('one');
    });

    it('falls back to an id, so a hand-written one works', () => {
        expect(resolveWikilink('two', ITEMS)?.id).toBe('two');
    });

    it('answers nothing for a note that is not written yet', () => {
        expect(resolveWikilink('not-a-note', ITEMS)).toBeNull();
    });

    it('answers nothing for an empty target', () => {
        expect(resolveWikilink('   ', ITEMS)).toBeNull();
    });

    it('ignores an item the store has no path for', () => {
        const pathless = { ...item('three', ''), path: undefined };

        expect(resolveWikilink('three', [pathless])?.id).toBe('three');
    });
});
