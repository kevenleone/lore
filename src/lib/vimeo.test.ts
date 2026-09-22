import { describe, expect, it } from 'vitest';

import { vimeoEmbedUrl, vimeoVideo } from './vimeo';

describe('vimeoVideo', () => {
    it.each([
        ['https://vimeo.com/1211345949', { id: '1211345949' }],
        ['vimeo.com/1211345949', { id: '1211345949' }],
        [
            'https://player.vimeo.com/video/1211345949?title=0&byline=0&portrait=0&autoplay=1&autopause=0&dnt=1&app_id=122963&texttrack=undefined',
            { id: '1211345949' },
        ],
        ['https://vimeo.com/1211345949/a1b2c3d4e5', { hash: 'a1b2c3d4e5', id: '1211345949' }],
        [
            'https://player.vimeo.com/video/1211345949?h=a1b2c3d4e5',
            { hash: 'a1b2c3d4e5', id: '1211345949' },
        ],
        ['https://vimeo.com/1211345949#t=90s', { id: '1211345949', start: 90 }],
        ['https://vimeo.com/1211345949#t=1m30s', { id: '1211345949', start: 90 }],
        ['https://vimeo.com/showcase/9876543/video/1211345949', { id: '1211345949' }],
    ])('reads %s', (url, video) => {
        expect(vimeoVideo(url)).toEqual(video);
    });

    it.each([
        undefined,
        'https://vimeo.com/',
        'https://vimeo.com/user149406496',
        'https://www.youtube.com/watch?v=yGc02Fz8S4c',
    ])('ignores %s', (url) => {
        expect(vimeoVideo(url)).toBeNull();
    });
});

describe('vimeoEmbedUrl', () => {
    it('carries the privacy hash and start time through', () => {
        expect(vimeoEmbedUrl({ hash: 'a1b2c3d4e5', id: '1211345949', start: 90 })).toBe(
            'https://player.vimeo.com/video/1211345949?autoplay=1&dnt=1&h=a1b2c3d4e5#t=90s',
        );
    });
});
