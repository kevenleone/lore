import { describe, expect, it } from 'vitest';

import type { Collection } from '../../store/types';

import { collectionRows, leafName, parentOf, renamedTo, toggleCollapsed } from './collectionTree';

const make = (...ids: string[]): Collection[] => ids.map((id) => ({ color: '#888', id, name: id }));

const shown = (ids: string[], collapsed: string[] = []) =>
    collectionRows(make(...ids), collapsed).map((row) => row.collection.id);

describe('collectionRows', () => {
    it('leaves a flat vault flat, all at depth zero', () => {
        const rows = collectionRows(make('Reading', 'Work'), []);

        expect(rows.map((row) => row.depth)).toEqual([0, 0]);
        expect(rows.every((row) => !row.hasChildren)).toBe(true);
    });

    it('indents by how deep the folder is', () => {
        const rows = collectionRows(make('A', 'A/B', 'A/B/C'), []);

        expect(rows.map((row) => row.depth)).toEqual([0, 1, 2]);
    });

    it('shows the folder’s own name, not its whole path', () => {
        const rows = collectionRows(make('Work', 'Work/Projects'), []);

        expect(rows.map((row) => row.name)).toEqual(['Work', 'Projects']);
    });

    it('marks a parent as having children', () => {
        const rows = collectionRows(make('Work', 'Work/Projects'), []);

        expect(rows[0].hasChildren).toBe(true);
        expect(rows[1].hasChildren).toBe(false);
    });

    it('does not call a grandparent childless when only grandchildren exist', () => {
        const rows = collectionRows(make('A', 'A/B', 'A/B/C'), []);

        expect(rows.map((row) => row.hasChildren)).toEqual([true, true, false]);
    });

    it('hides what is inside a collapsed folder', () => {
        expect(shown(['Work', 'Work/Projects'], ['Work'])).toEqual(['Work']);
    });

    it('keeps the collapsed folder itself visible', () => {
        expect(shown(['Work', 'Work/Projects'], ['Work'])).toContain('Work');
    });

    it('hides a whole branch, not only its first level', () => {
        expect(shown(['A', 'A/B', 'A/B/C'], ['A'])).toEqual(['A']);
    });

    it('hides a grandchild when the middle is collapsed', () => {
        expect(shown(['A', 'A/B', 'A/B/C'], ['A/B'])).toEqual(['A', 'A/B']);
    });

    it('leaves a sibling with a similar name alone', () => {
        expect(shown(['Work', 'Work/Projects', 'Workshop'], ['Work'])).toEqual([
            'Work',
            'Workshop',
        ]);
    });

    it('handles an empty vault', () => {
        expect(collectionRows([], [])).toEqual([]);
    });
});

describe('leafName', () => {
    it('is the whole name at the root', () => {
        expect(leafName('Work')).toBe('Work');
    });

    it('is the last part when nested', () => {
        expect(leafName('Work/Projects/Alpha')).toBe('Alpha');
    });
});

describe('parentOf', () => {
    it('is empty at the vault root', () => {
        expect(parentOf('Work')).toBe('');
    });

    it('is everything before the last slash', () => {
        expect(parentOf('Work/Projects/Alpha')).toBe('Work/Projects');
    });
});

describe('renamedTo', () => {
    it('keeps a nested folder where it is', () => {
        expect(renamedTo('Work/Projects', 'Ideas')).toBe('Work/Ideas');
    });

    it('renames a root folder plainly', () => {
        expect(renamedTo('Work', 'Research')).toBe('Research');
    });

    it('takes a typed path at its word, which is how a folder moves', () => {
        expect(renamedTo('Work/Projects', 'Archive/Old')).toBe('Archive/Old');
    });

    it('trims what was typed', () => {
        expect(renamedTo('Work/Projects', '  Ideas  ')).toBe('Work/Ideas');
    });

    it('gives back nothing for an empty name, so the caller can refuse it', () => {
        expect(renamedTo('Work/Projects', '   ')).toBe('');
    });
});

describe('toggleCollapsed', () => {
    it('shuts one', () => {
        expect(toggleCollapsed('Work', [])).toEqual(['Work']);
    });

    it('opens it again', () => {
        expect(toggleCollapsed('Work', ['Work'])).toEqual([]);
    });

    it('does not mutate what it was given', () => {
        const collapsed = ['Work'];

        toggleCollapsed('Other', collapsed);

        expect(collapsed).toEqual(['Work']);
    });
});
