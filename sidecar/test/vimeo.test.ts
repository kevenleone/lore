import { afterEach, describe, expect, it } from 'bun:test';

import { fetchLinkMetadata } from '../src/linkMetadata';
import { fetchVimeoMetadata, vimeoVideo } from '../src/vimeo';

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
});

const THUMBNAIL = 'https://i.vimeocdn.com/video/2186243529-abc-d_1280?region=us';

describe('vimeoVideo', () => {
    it.each([
        ['https://vimeo.com/1211345949', { id: '1211345949' }],
        ['https://www.vimeo.com/1211345949', { id: '1211345949' }],
        [
            'https://player.vimeo.com/video/1211345949?title=0&byline=0&portrait=0&autoplay=1&autopause=0&dnt=1&app_id=122963&texttrack=undefined',
            { id: '1211345949' },
        ],
        ['https://vimeo.com/1211345949/a1b2c3d4e5', { hash: 'a1b2c3d4e5', id: '1211345949' }],
        [
            'https://player.vimeo.com/video/1211345949?h=a1b2c3d4e5',
            { hash: 'a1b2c3d4e5', id: '1211345949' },
        ],
        ['https://vimeo.com/channels/staffpicks/1211345949', { id: '1211345949' }],
        ['https://vimeo.com/groups/shortfilms/videos/1211345949', { id: '1211345949' }],
        ['https://vimeo.com/showcase/9876543/video/1211345949', { id: '1211345949' }],
    ])('reads %s', (url, video) => {
        expect(vimeoVideo(url)).toEqual(video);
    });

    it.each([
        'https://vimeo.com/',
        'https://vimeo.com/user149406496',
        'https://notvimeo.com/1211345949',
        'not a url',
    ])('ignores %s', (url) => {
        expect(vimeoVideo(url)).toBeNull();
    });
});

describe('fetchVimeoMetadata', () => {
    it('maps oEmbed onto link metadata', async () => {
        let requested = '';
        globalThis.fetch = (async (input: string) => {
            requested = input;
            return Response.json({
                author_name: 'Author',
                thumbnail_url: THUMBNAIL,
                title: 'A video',
            });
        }) as unknown as typeof fetch;
        expect(await fetchVimeoMetadata({ hash: 'a1b2c3d4e5', id: '1211345949' })).toEqual({
            description: 'Video by Author',
            image: THUMBNAIL,
            title: 'A video',
        });
        const params = new URL(requested).searchParams;
        expect(params.get('url')).toBe('https://vimeo.com/1211345949/a1b2c3d4e5');
        expect(params.get('width')).toBe('1280');
    });

    it('answers null when oEmbed fails', async () => {
        globalThis.fetch = (async () =>
            new Response('', { status: 403 })) as unknown as typeof fetch;
        expect(await fetchVimeoMetadata({ id: '1211345949' })).toBeNull();
    });

    it('is what fetchLinkMetadata answers for a video URL', async () => {
        globalThis.fetch = (async () =>
            Response.json({
                thumbnail_url: THUMBNAIL,
                title: 'A video',
            })) as unknown as typeof fetch;
        const metadata = await fetchLinkMetadata('player.vimeo.com/video/1211345949?autoplay=1');
        expect(metadata.title).toBe('A video');
        expect(metadata.image).toBe(THUMBNAIL);
    });

    it('falls back to reading the page when oEmbed fails', async () => {
        globalThis.fetch = (async (input: string) =>
            input.startsWith('https://vimeo.com/api/oembed')
                ? new Response('', { status: 404 })
                : new Response('<html><head><title>A video on Vimeo</title></head></html>', {
                      headers: { 'Content-Type': 'text/html' },
                  })) as unknown as typeof fetch;
        const metadata = await fetchLinkMetadata('https://vimeo.com/1211345949');
        expect(metadata.title).toBe('A video on Vimeo');
    });
});
