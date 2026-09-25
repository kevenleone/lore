import { describe, expect, it } from 'vitest';

import type { LabelCandidate } from './labels';

import { placeLabels, shortTitle } from './labels';

/** Stands in for a canvas: every character is ten pixels wide. */
const measure = (text: string) => text.length * 10;

const at = (text: string, centreX: number, topY: number, priority = 0): LabelCandidate => ({
    priority,
    text,
    x: centreX,
    y: topY,
});

const names = (placed: { text: string }[]) => placed.map((label) => label.text);

describe('placeLabels', () => {
    it('draws a lone name', () => {
        expect(names(placeLabels([at('One', 0, 0)], measure, 11))).toEqual(['One']);
    });

    it('draws two that are far apart', () => {
        const placed = placeLabels([at('One', 0, 0), at('Two', 500, 0)], measure, 11);

        expect(names(placed).sort()).toEqual(['One', 'Two']);
    });

    it('drops the second of two that would overlap', () => {
        const placed = placeLabels([at('One', 0, 0), at('Two', 5, 0)], measure, 11);

        expect(placed).toHaveLength(1);
    });

    it('keeps the one that matters more when they collide', () => {
        const placed = placeLabels([at('Minor', 0, 0, 1), at('Major', 5, 0, 99)], measure, 11);

        expect(names(placed)).toEqual(['Major']);
    });

    it('lets a name through directly below another, where there is room', () => {
        const placed = placeLabels([at('One', 0, 0), at('Two', 0, 60)], measure, 11);

        expect(placed).toHaveLength(2);
    });

    it('measures width, so a long name blocks what a short one would not', () => {
        const short = placeLabels([at('Ab', 0, 0), at('Cd', 40, 0)], measure, 11);
        const long = placeLabels([at('AbcdefghIj', 0, 0), at('Cd', 40, 0)], measure, 11);

        expect(short).toHaveLength(2);
        expect(long).toHaveLength(1);
    });

    it('places nothing for no candidates', () => {
        expect(placeLabels([], measure, 11)).toEqual([]);
    });

    it('is stable: the same input places the same names', () => {
        const input = [at('One', 0, 0, 2), at('Two', 5, 0, 1), at('Three', 400, 0, 3)];

        expect(names(placeLabels(input, measure, 11))).toEqual(
            names(placeLabels(input, measure, 11)),
        );
    });

    it('does not reorder the caller’s array', () => {
        const input = [at('One', 0, 0, 1), at('Two', 400, 0, 9)];

        placeLabels(input, measure, 11);

        expect(input[0].text).toBe('One');
    });
});

describe('shortTitle', () => {
    it('leaves a short title alone', () => {
        expect(shortTitle('Linear')).toBe('Linear');
    });

    it('cuts a long one rather than letting it hide its neighbours', () => {
        const long = 'Competitive research overview for the whole of next quarter';

        expect(shortTitle(long)).toHaveLength(28);
        expect(shortTitle(long).endsWith('…')).toBe(true);
    });

    it('trims the space around one', () => {
        expect(shortTitle('  Linear  ')).toBe('Linear');
    });

    it('says something for a note with no title at all', () => {
        expect(shortTitle('   ')).toBe('Untitled');
    });
});
