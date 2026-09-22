// Mapping and the API's own requirements are what is worth testing here; the
// network is not. These drive `searchPhotos` over fixture JSON through a
// stubbed fetch, and assert on the request as much as on the answer.

import { afterEach, describe, expect, it } from 'bun:test';

import { searchPhotos, triggerDownload, UnsplashError } from '../src/unsplash';

const realFetch = globalThis.fetch;

afterEach(() => {
    globalThis.fetch = realFetch;
});

/** Records every request, so the auth header and query can be asserted on. */
function serve(body: unknown, init: ResponseInit = {}) {
    const calls: Request[] = [];

    globalThis.fetch = (async (input: Request | string | URL, options?: RequestInit) => {
        calls.push(new Request(input instanceof Request ? input : String(input), options));

        return new Response(JSON.stringify(body), {
            headers: { 'content-type': 'application/json' },
            ...init,
        });
    }) as unknown as typeof fetch;

    return calls;
}

const photo = (over: Record<string, unknown> = {}) => ({
    alt_description: 'a lake',
    color: '#0a1a2a',
    id: 'p1',
    links: { download_location: 'https://api.unsplash.com/photos/p1/download' },
    urls: { regular: 'https://images.unsplash.com/p1?w=1080' },
    user: { links: { html: 'https://unsplash.com/@ada' }, name: 'Ada Lovelace' },
    ...over,
});

describe('searchPhotos', () => {
    it('maps a hit onto what the picker needs', async () => {
        serve({ results: [photo()], total: 1 });

        const { photos, total } = await searchPhotos('KEY', 'lake');

        expect(total).toBe(1);
        expect(photos[0]).toEqual({
            alt: 'a lake',
            color: '#0a1a2a',
            downloadLocation: 'https://api.unsplash.com/photos/p1/download',
            id: 'p1',
            name: 'Ada Lovelace',
            profileUrl: 'https://unsplash.com/@ada?utm_source=lore&utm_medium=referral',
            url: 'https://images.unsplash.com/p1?w=1080',
        });
    });

    // Unsplash's scheme is `Client-ID`, not `Bearer`; a Bearer token 401s.
    it('authenticates the way Unsplash asks', async () => {
        const calls = serve({ results: [], total: 0 });

        await searchPhotos('KEY', 'lake');

        expect(calls[0].headers.get('Authorization')).toBe('Client-ID KEY');
        expect(calls[0].headers.get('Accept-Version')).toBe('v1');
    });

    it('asks for filtered results, since this fills a thumbnail', async () => {
        const calls = serve({ results: [], total: 0 });

        await searchPhotos('KEY', 'lake', 3);

        const url = new URL(calls[0].url);

        expect(url.searchParams.get('query')).toBe('lake');
        expect(url.searchParams.get('page')).toBe('3');
        expect(url.searchParams.get('content_filter')).toBe('high');
    });

    // A hit missing any of these cannot be rendered or credited, and one bad
    // entry must not lose the rest of the page.
    it('skips a hit with no url, photographer or profile', async () => {
        serve({
            results: [
                photo({ urls: {} }),
                photo({ user: { links: {}, name: 'Ada' } }),
                photo({ id: 'good' }),
            ],
            total: 3,
        });

        const { photos } = await searchPhotos('KEY', 'lake');

        expect(photos.map((p) => p.id)).toEqual(['good']);
    });

    it('names the failure so the picker can explain it', async () => {
        serve({}, { status: 401 });
        expect(searchPhotos('BAD', 'lake')).rejects.toThrow(new UnsplashError('bad_key'));

        serve({}, { status: 403 });
        expect(searchPhotos('KEY', 'lake')).rejects.toThrow(new UnsplashError('rate_limited'));

        serve({}, { status: 500 });
        expect(searchPhotos('KEY', 'lake')).rejects.toThrow(new UnsplashError('unavailable'));
    });
});

describe('triggerDownload', () => {
    it('pings the photo’s endpoint, which the API terms require', async () => {
        const calls = serve({ url: 'https://images.unsplash.com/p1' });

        await triggerDownload('KEY', 'https://api.unsplash.com/photos/p1/download');

        expect(calls).toHaveLength(1);
        expect(calls[0].headers.get('Authorization')).toBe('Client-ID KEY');
    });

    // The location comes back from a remote response, so it is not trusted to
    // send the key anywhere it likes.
    it('refuses a download location that is not Unsplash’s', async () => {
        const calls = serve({});

        await triggerDownload('KEY', 'https://evil.example/collect');

        expect(calls).toHaveLength(0);
    });
});
