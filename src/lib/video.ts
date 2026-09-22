import type { VimeoVideo } from './vimeo';
import type { YoutubeVideo } from './youtube';

import { vimeoEmbedUrl, vimeoVideo } from './vimeo';
import { youtubeEmbedUrl, youtubeThumbnail, youtubeVideo } from './youtube';

export type LinkVideo =
    ({ provider: 'vimeo' } & VimeoVideo) | ({ provider: 'youtube' } & YoutubeVideo);

export function linkVideo(rawUrl: string | undefined): LinkVideo | null {
    const youtube = youtubeVideo(rawUrl);

    if (youtube) {
        return { provider: 'youtube', ...youtube };
    }

    const vimeo = vimeoVideo(rawUrl);

    if (vimeo) {
        return { provider: 'vimeo', ...vimeo };
    }

    return null;
}

export function videoEmbedUrl(video: LinkVideo): string {
    return video.provider === 'youtube' ? youtubeEmbedUrl(video) : vimeoEmbedUrl(video);
}

/** Vimeo thumbnails are not derivable from the id; they come from oEmbed only. */
export function videoThumbnail(video: LinkVideo): string | undefined {
    return video.provider === 'youtube' ? youtubeThumbnail(video.id) : undefined;
}
