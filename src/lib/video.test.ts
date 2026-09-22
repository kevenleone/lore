import { describe, expect, it } from 'vitest';

import { linkVideo, videoEmbedUrl, videoThumbnail } from './video';

describe('linkVideo', () => {
    it.each([
        ['https://youtu.be/yGc02Fz8S4c', { id: 'yGc02Fz8S4c', provider: 'youtube' }],
        [
            'https://player.vimeo.com/video/1211345949?autoplay=1',
            { id: '1211345949', provider: 'vimeo' },
        ],
    ])('reads %s', (url, video) => {
        expect(linkVideo(url)).toEqual(video);
    });

    it('ignores other links', () => {
        expect(linkVideo('https://example.com/video/1211345949')).toBeNull();
    });
});

describe('videoEmbedUrl', () => {
    it('picks the player for the provider', () => {
        expect(videoEmbedUrl({ id: '1211345949', provider: 'vimeo' })).toBe(
            'https://player.vimeo.com/video/1211345949?autoplay=1&dnt=1',
        );
        expect(videoEmbedUrl({ id: 'yGc02Fz8S4c', provider: 'youtube' })).toBe(
            'https://www.youtube-nocookie.com/embed/yGc02Fz8S4c?autoplay=1&rel=0',
        );
    });
});

describe('videoThumbnail', () => {
    it('derives only YouTube thumbnails', () => {
        expect(videoThumbnail({ id: 'yGc02Fz8S4c', provider: 'youtube' })).toBe(
            'https://i.ytimg.com/vi/yGc02Fz8S4c/hqdefault.jpg',
        );
        expect(videoThumbnail({ id: '1211345949', provider: 'vimeo' })).toBeUndefined();
    });
});
