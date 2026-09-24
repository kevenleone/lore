import { describe, expect, it } from 'vitest';

import { labelDetailFor, shortTitle, showsLabel } from './labels';

describe('labelDetailFor', () => {
    it('names everything once the picture is close enough to read', () => {
        expect(labelDetailFor(1.2)).toBe('all');
    });

    it('names only the hubs at a middling zoom', () => {
        expect(labelDetailFor(0.6)).toBe('hubs');
    });

    it('names only what is in focus when pulled right back', () => {
        expect(labelDetailFor(0.1)).toBe('focus');
    });
});

describe('showsLabel', () => {
    it('names whatever is in focus, however far out', () => {
        expect(showsLabel({ degree: 0 }, 'focus', true)).toBe(true);
    });

    it('leaves a lone note unnamed when only hubs are named', () => {
        expect(showsLabel({ degree: 1 }, 'hubs', false)).toBe(false);
    });

    it('names a hub when hubs are named', () => {
        expect(showsLabel({ degree: 3 }, 'hubs', false)).toBe(true);
    });

    it('names everything when everything is named', () => {
        expect(showsLabel({ degree: 0 }, 'all', false)).toBe(true);
    });

    it('names nothing unrelated when only focus is named', () => {
        expect(showsLabel({ degree: 9 }, 'focus', false)).toBe(false);
    });
});

describe('shortTitle', () => {
    it('leaves a short title alone', () => {
        expect(shortTitle('Linear')).toBe('Linear');
    });

    it('cuts a long one rather than letting it collide', () => {
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
