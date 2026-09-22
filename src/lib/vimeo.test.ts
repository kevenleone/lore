import { describe, expect, it } from 'vitest';

import { vimeoEmbedUrl, vimeoVideo } from './vimeo';

describe('vimeoVideo', () => {
    it.each([
        ['https://vimeo.com/180094337', { id: '180094337' }],
        ['vimeo.com/180094337', { id: '180094337' }],
        [
            'https://player.vimeo.com/video/180094337?title=0&byline=0&portrait=0&autoplay=1&autopause=0&dnt=1&app_id=122963&texttrack=undefined',
            { id: '180094337' },
        ],
        ['https://vimeo.com/180094337/a1b2c3d4e5', { hash: 'a1b2c3d4e5', id: '180094337' }],
        [
            'https://player.vimeo.com/video/180094337?h=a1b2c3d4e5',
            { hash: 'a1b2c3d4e5', id: '180094337' },
        ],
        ['https://vimeo.com/180094337#t=90s', { id: '180094337', start: 90 }],
        ['https://vimeo.com/180094337#t=1m30s', { id: '180094337', start: 90 }],
        ['https://vimeo.com/showcase/9876543/video/180094337', { id: '180094337' }],
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
        expect(vimeoEmbedUrl({ hash: 'a1b2c3d4e5', id: '180094337', start: 90 })).toBe(
            'https://player.vimeo.com/video/180094337?autoplay=1&dnt=1&h=a1b2c3d4e5#t=90s',
        );
    });
});
