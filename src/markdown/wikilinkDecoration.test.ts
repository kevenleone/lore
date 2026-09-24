// The ranges a wikilink occupies in the document.
//
// These are what the click handler tests a position against, so getting them
// wrong means clicking a link either does nothing or opens the wrong note.

import { describe, expect, it } from 'vitest';

import type { Item } from '../store/types';

import { parse } from './parse';
import { toDocument } from './to-prosemirror';
import { findWikilinks } from './wikilinkDecoration';

const ITEM: Item = {
    createdAt: '2026-09-01T00:00:00.000Z',
    flags: {},
    id: 'linear-id',
    path: 'Work/linear.md',
    related: [],
    tags: [],
    title: 'Linear',
    type: 'note',
    updatedAt: '2026-09-01T00:00:00.000Z',
};

const resolve = (target: string): Item | null => (target.toLowerCase() === 'linear' ? ITEM : null);

const find = (markdown: string) => {
    const doc = toDocument(parse(markdown));

    return { doc, found: findWikilinks(doc, resolve) };
};

describe('findWikilinks', () => {
    it('spans the whole link, brackets included', () => {
        const { doc, found } = find('As [[linear]] does it.');

        expect(found).toHaveLength(1);
        expect(doc.textBetween(found[0].from, found[0].to)).toBe('[[linear]]');
    });

    it('carries the id of the item it resolves to', () => {
        expect(find('As [[linear]] does it.').found[0].id).toBe('linear-id');
    });

    it('reports an unresolved target rather than dropping it', () => {
        const { found } = find('See [[not-written-yet]].');

        expect(found).toHaveLength(1);
        expect(found[0].id).toBeNull();
    });

    it('spans each of two links in one paragraph separately', () => {
        const { doc, found } = find('Both [[linear]] and [[kroll]].');

        expect(found.map((entry) => doc.textBetween(entry.from, entry.to))).toEqual([
            '[[linear]]',
            '[[kroll]]',
        ]);
    });

    it('finds one in a list item, not only a paragraph', () => {
        const { doc, found } = find('- as [[linear]] does\n');

        expect(doc.textBetween(found[0].from, found[0].to)).toBe('[[linear]]');
    });

    it('finds one in a heading', () => {
        expect(find('# About [[linear]]\n').found[0].id).toBe('linear-id');
    });

    it('skips a fenced block entirely', () => {
        expect(find('```\n[[linear]]\n```\n').found).toEqual([]);
    });

    it('skips an inline code span', () => {
        expect(find('Write `[[linear]]` to link.').found).toEqual([]);
    });

    it('still finds the real link beside a fenced example', () => {
        const { doc, found } = find('```\n[[kroll]]\n```\n\nReally [[linear]].\n');

        expect(found).toHaveLength(1);
        expect(doc.textBetween(found[0].from, found[0].to)).toBe('[[linear]]');
    });

    it('resolves through an alias while spanning the whole link', () => {
        const { doc, found } = find('As [[linear|they do]] does it.');

        expect(found[0].id).toBe('linear-id');
        expect(doc.textBetween(found[0].from, found[0].to)).toBe('[[linear|they do]]');
    });

    it('resolves through a heading', () => {
        expect(find('As [[linear#Pricing]] does it.').found[0].id).toBe('linear-id');
    });

    it('finds nothing in a document with no links', () => {
        expect(find('Just prose, and an [ordinary](link).').found).toEqual([]);
    });
});
