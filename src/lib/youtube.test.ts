import { describe, expect, it } from 'vitest';

import { youtubeEmbedUrl, youtubeVideo } from './youtube';

describe('youtubeVideo', () => {
    it.each([
        ['https://www.youtube.com/watch?v=yGc02Fz8S4c', { id: 'yGc02Fz8S4c' }],
        ['youtube.com/watch?v=yGc02Fz8S4c', { id: 'yGc02Fz8S4c' }],
        ['https://m.youtube.com/watch?v=yGc02Fz8S4c', { id: 'yGc02Fz8S4c' }],
        ['https://youtu.be/yGc02Fz8S4c?t=42', { id: 'yGc02Fz8S4c', start: 42 }],
        ['https://www.youtube.com/watch?v=yGc02Fz8S4c&t=1m30s', { id: 'yGc02Fz8S4c', start: 90 }],
        ['https://www.youtube.com/shorts/yGc02Fz8S4c', { id: 'yGc02Fz8S4c' }],
        ['https://www.youtube.com/embed/yGc02Fz8S4c?start=7', { id: 'yGc02Fz8S4c', start: 7 }],
        ['https://www.youtube.com/live/yGc02Fz8S4c', { id: 'yGc02Fz8S4c' }],
    ])('reads %s', (url, video) => {
        expect(youtubeVideo(url)).toEqual(video);
    });

    it.each([
        undefined,
        'https://www.youtube.com/@channel',
        'https://www.youtube.com/watch?v=short',
        'https://vimeo.com/123',
    ])('ignores %s', (url) => {
        expect(youtubeVideo(url)).toBeNull();
    });
});

describe('youtubeEmbedUrl', () => {
    it('carries the start time through', () => {
        expect(youtubeEmbedUrl({ id: 'yGc02Fz8S4c', start: 90 })).toBe(
            'https://www.youtube-nocookie.com/embed/yGc02Fz8S4c?autoplay=1&rel=0&start=90',
        );
    });
});
