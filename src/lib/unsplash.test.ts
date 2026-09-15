// The renderer's half: turning the engine's error code back into a sentence,
// and the credit an item stores for a picked photo.

import { describe, expect, it } from 'vitest';

import type { UnsplashPhoto } from './unsplash';

import { HttpError, SidecarUnavailable } from '../data/sidecarClient';
import { creditFor, messageFor } from './unsplash';

const photo: UnsplashPhoto = {
    alt: 'a lake',
    color: '#0a1a2a',
    downloadLocation: 'https://api.unsplash.com/photos/p1/download',
    id: 'p1',
    name: 'Ada Lovelace',
    profileUrl: 'https://unsplash.com/@ada?utm_source=lore&utm_medium=referral',
    url: 'https://images.unsplash.com/p1?w=1080',
};

describe('creditFor', () => {
    it('keeps the UTM-tagged profile link the terms require', () => {
        expect(creditFor(photo)).toEqual({
            name: 'Ada Lovelace',
            profileUrl: 'https://unsplash.com/@ada?utm_source=lore&utm_medium=referral',
            provider: 'unsplash',
        });
    });
});

describe('messageFor', () => {
    // The code reaches here inside an HttpError's message, which is the engine's
    // JSON body rather than a bare string.
    it('reads the code out of the engine’s error body', () => {
        const error = new HttpError(502, JSON.stringify({ error: 'bad_key' }));
        expect(messageFor(error)).toContain('Access Key');
    });

    it('distinguishes a rate limit from a bad key', () => {
        const error = new HttpError(502, JSON.stringify({ error: 'rate_limited' }));
        expect(messageFor(error)).toContain('rate-limiting');
    });

    it('falls back to a general sentence for anything else', () => {
        expect(messageFor(new SidecarUnavailable('down'))).toContain('Could not reach Unsplash');
        expect(messageFor(new HttpError(500, 'not json at all'))).toContain(
            'Could not reach Unsplash',
        );
    });
});
