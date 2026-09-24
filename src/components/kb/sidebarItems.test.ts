import { describe, expect, it } from 'vitest';

import { DEFAULT_PREFS } from '../../store/types';
import { hiddenSurfaces, isSurfaceVisible, OPTIONAL_SURFACES, toggleSurface } from './sidebarItems';

describe('what is optional', () => {
    it('ships with nothing put away, so an upgrade changes no one’s sidebar', () => {
        expect(DEFAULT_PREFS.hiddenSurfaces).toEqual([]);
    });

    it('never offers to hide a library view — they are how you reach your notes', () => {
        const ids = OPTIONAL_SURFACES.map((surface) => surface.id);

        for (const view of ['all', 'inbox', 'notes', 'links', 'files']) {
            expect(ids).not.toContain(view);
        }
    });

    it('names each surface once', () => {
        const ids = OPTIONAL_SURFACES.map((surface) => surface.id);

        expect(new Set(ids).size).toBe(ids.length);
    });

    it('says what each one is, so the choice is not made blind', () => {
        expect(OPTIONAL_SURFACES.every((surface) => surface.summary.length > 0)).toBe(true);
    });
});

describe('isSurfaceVisible', () => {
    it('shows everything when nothing is hidden', () => {
        expect(isSurfaceVisible('graph', [])).toBe(true);
    });

    it('hides what was put away', () => {
        expect(isSurfaceVisible('graph', ['graph'])).toBe(false);
    });

    it('leaves the others alone', () => {
        expect(isSurfaceVisible('calendar', ['graph'])).toBe(true);
    });
});

describe('toggleSurface', () => {
    it('puts one away', () => {
        expect(toggleSurface('graph', [])).toEqual(['graph']);
    });

    it('brings it back', () => {
        expect(toggleSurface('graph', ['graph'])).toEqual([]);
    });

    it('keeps an id this version does not know, the way the vault files do', () => {
        expect(toggleSurface('graph', ['timeline'])).toEqual(['timeline', 'graph']);
        expect(toggleSurface('graph', ['timeline', 'graph'])).toEqual(['timeline']);
    });

    it('does not mutate what it was given', () => {
        const hidden = ['graph'];

        toggleSurface('calendar', hidden);

        expect(hidden).toEqual(['graph']);
    });
});

describe('hiddenSurfaces', () => {
    it('lists them in the order the sidebar shows them, not the order hidden', () => {
        expect(hiddenSurfaces(['graph', 'tasks']).map((surface) => surface.id)).toEqual([
            'tasks',
            'graph',
        ]);
    });

    it('ignores an id from another version', () => {
        expect(hiddenSurfaces(['timeline'])).toEqual([]);
    });

    it('is empty when nothing is put away', () => {
        expect(hiddenSurfaces([])).toEqual([]);
    });
});
