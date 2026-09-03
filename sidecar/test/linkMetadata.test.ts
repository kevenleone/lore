// Parsing is the part worth testing; the network is not. These drive
// HTMLRewriter over fixture HTML through a stubbed fetch.

import { afterEach, describe, expect, it } from 'bun:test';

import { fetchLinkMetadata, normalizeUrl } from '../src/linkMetadata';

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
});

function serve(html: string, init: ResponseInit = {}) {
    globalThis.fetch = (async () =>
        new Response(html, {
            headers: { 'content-type': 'text/html' },
            ...init,
        })) as unknown as typeof fetch;
}

describe('normalizeUrl', () => {
    it('assumes https when no scheme is given', () => {
        expect(normalizeUrl('example.com/x')).toBe('https://example.com/x');
    });

    it('leaves an explicit scheme alone', () => {
        expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    });
});

describe('fetchLinkMetadata', () => {
    it('prefers OpenGraph over twitter over the title tag', async () => {
        serve(`<html><head>
      <title>Title tag</title>
      <meta name="twitter:title" content="Twitter title">
      <meta property="og:title" content="OG title">
      <meta property="og:description" content="OG description">
      <meta property="og:image" content="https://cdn.test/a.png">
    </head></html>`);
        expect(await fetchLinkMetadata('https://example.test')).toEqual({
            description: 'OG description',
            image: 'https://cdn.test/a.png',
            title: 'OG title',
        });
    });

    it('falls back to the title tag and the plain description', async () => {
        serve(`<html><head>
      <title>  Just a title  </title>
      <meta name="description" content="Plain description">
    </head></html>`);
        const m = await fetchLinkMetadata('https://example.test');
        expect(m.title).toBe('Just a title');
        expect(m.description).toBe('Plain description');
    });

    it('resolves a relative image against the page', async () => {
        serve(`<html><head><meta property="og:image" content="/img/hero.png"></head></html>`);
        const m = await fetchLinkMetadata('https://example.test/blog/post');
        expect(m.image).toBe('https://example.test/img/hero.png');
    });

    it('resolves a protocol-relative image', async () => {
        serve(`<html><head><meta property="og:image" content="//cdn.test/a.png"></head></html>`);
        expect((await fetchLinkMetadata('https://example.test')).image).toBe(
            'https://cdn.test/a.png',
        );
    });

    it('returns nothing rather than throwing when the page has no metadata', async () => {
        serve('<html><body>nothing</body></html>');
        expect(await fetchLinkMetadata('https://example.test')).toEqual({
            description: undefined,
            image: undefined,
            title: undefined,
        });
    });

    it('returns nothing on a non-OK response', async () => {
        serve('<html></html>', { status: 500 });
        expect(await fetchLinkMetadata('https://example.test')).toEqual({});
    });

    it('returns nothing when the request fails, so a capture is never blocked', async () => {
        globalThis.fetch = (async () => {
            throw new Error('network down');
        }) as unknown as typeof fetch;
        expect(await fetchLinkMetadata('https://example.test')).toEqual({});
    });

    it('refuses a non-http scheme', async () => {
        // Reading file:// through the engine would be a real hole.
        expect(await fetchLinkMetadata('file:///etc/passwd')).toEqual({});
    });

    it('ignores a duplicate tag, keeping the first', async () => {
        serve(`<html><head>
      <meta property="og:title" content="First">
      <meta property="og:title" content="Second">
    </head></html>`);
        expect((await fetchLinkMetadata('https://example.test')).title).toBe('First');
    });
});
