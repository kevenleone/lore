import { describe, expect, it } from 'vitest';

import type { Item } from '../store/types';

import { bannerPalette, bannerSeed, bannerStyle, hasBanner } from './banner';

const item = (patch: Partial<Item>): Item => ({
    createdAt: '2026-01-01T00:00:00.000Z',
    flags: {},
    id: 'i1',
    related: [],
    tags: [],
    title: 'Untitled',
    type: 'link',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...patch,
});

describe('bannerPalette', () => {
    it('returns five colours', () => {
        expect(bannerPalette('https://example.com/og.png')).toHaveLength(5);
    });

    it('is stable for a seed, so a card does not change colour between launches', () => {
        expect(bannerPalette('https://example.com/og.png')).toEqual(
            bannerPalette('https://example.com/og.png'),
        );
    });

    it('separates different seeds', () => {
        expect(bannerPalette('https://a.example/og.png')).not.toEqual(
            bannerPalette('https://b.example/og.png'),
        );
    });

    it('keeps every colour in one hue family', () => {
        const hues = bannerPalette('https://example.com/og.png').map((c) =>
            Number(/hsl\((-?\d+)/.exec(c)![1]),
        );
        // The five stops are offset by at most ±14° from the base hue, and the
        // wrap at 0/360 is what makes a naive spread check unreliable.
        const spread = Math.max(...hues) - Math.min(...hues);
        expect(Math.min(spread, 360 - spread)).toBeLessThanOrEqual(24);
    });
});

describe('bannerSeed', () => {
    it('prefers the image, then the url, then the id', () => {
        expect(bannerSeed({ id: 'i1', image: 'img', url: 'url' })).toBe('img');
        expect(bannerSeed({ id: 'i1', url: 'url' })).toBe('url');
        expect(bannerSeed({ id: 'i1' })).toBe('i1');
    });
});

describe('bannerStyle', () => {
    it('over-scales and blurs only the placeholder state', () => {
        const colors = bannerPalette('seed');
        expect(bannerStyle(colors, true).filter).toContain('blur');
        expect(bannerStyle(colors, false).filter).toBeUndefined();
    });
});

describe('hasBanner', () => {
    it('is true only for items carrying a preview image', () => {
        expect(hasBanner(item({ image: 'https://example.com/og.png' }))).toBe(true);
        expect(hasBanner(item({}))).toBe(false);
    });
});
