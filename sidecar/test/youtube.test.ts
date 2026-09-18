import { afterEach, describe, expect, it } from 'bun:test';

import { fetchLinkMetadata } from '../src/linkMetadata';
import { fetchYoutubeMetadata, youtubeVideoId } from '../src/youtube';

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
});

const THUMBNAIL = 'https://i.ytimg.com/vi/yGc02Fz8S4c/hqdefault.jpg';

describe('youtubeVideoId', () => {
    it.each([
        ['https://www.youtube.com/watch?v=yGc02Fz8S4c', 'yGc02Fz8S4c'],
        ['https://youtube.com/watch?list=x&v=yGc02Fz8S4c&t=42', 'yGc02Fz8S4c'],
        ['https://m.youtube.com/watch?v=yGc02Fz8S4c', 'yGc02Fz8S4c'],
        ['https://music.youtube.com/watch?v=yGc02Fz8S4c', 'yGc02Fz8S4c'],
        ['https://youtu.be/yGc02Fz8S4c?si=abc', 'yGc02Fz8S4c'],
        ['https://www.youtube.com/shorts/yGc02Fz8S4c', 'yGc02Fz8S4c'],
        ['https://www.youtube.com/embed/yGc02Fz8S4c', 'yGc02Fz8S4c'],
        ['https://www.youtube.com/live/yGc02Fz8S4c', 'yGc02Fz8S4c'],
        ['https://www.youtube-nocookie.com/embed/yGc02Fz8S4c', 'yGc02Fz8S4c'],
    ])('reads %s', (url, id) => {
        expect(youtubeVideoId(url)).toBe(id);
    });

    it.each([
        'https://www.youtube.com/',
        'https://www.youtube.com/@channel',
        'https://www.youtube.com/watch?v=short',
        'https://notyoutube.com/watch?v=yGc02Fz8S4c',
        'not a url',
    ])('ignores %s', (url) => {
        expect(youtubeVideoId(url)).toBeNull();
    });
});

describe('fetchYoutubeMetadata', () => {
    it('maps oEmbed onto link metadata', async () => {
        globalThis.fetch = (async () =>
            Response.json({ author_name: 'Channel', title: 'A video' })) as unknown as typeof fetch;
        expect(await fetchYoutubeMetadata('yGc02Fz8S4c')).toEqual({
            description: 'Video by Channel',
            image: THUMBNAIL,
            title: 'A video',
        });
    });

    it('keeps the thumbnail when oEmbed fails', async () => {
        globalThis.fetch = (async () =>
            new Response('', { status: 401 })) as unknown as typeof fetch;
        expect(await fetchYoutubeMetadata('yGc02Fz8S4c')).toEqual({ image: THUMBNAIL });
    });

    it('is what fetchLinkMetadata answers for a video URL', async () => {
        let requested = '';
        globalThis.fetch = (async (input: string) => {
            requested = input;
            return Response.json({ title: 'A video' });
        }) as unknown as typeof fetch;
        const metadata = await fetchLinkMetadata('youtu.be/yGc02Fz8S4c');
        expect(requested).toStartWith('https://www.youtube.com/oembed');
        expect(metadata.title).toBe('A video');
        expect(metadata.image).toBe(THUMBNAIL);
    });
});
