import type { LinkMetadata } from './linkMetadata';

const TIMEOUT_MS = 5_000;
const VIDEO_ID = /^[\w-]{11}$/;
const PATH_PREFIXES = new Set(['embed', 'live', 'shorts', 'v']);

interface OembedResponse {
    author_name?: string;
    title?: string;
}

/**
 * The watch page buries its OpenGraph tags past any sane read cap (and may
 * redirect to a consent page), so a video is described by oEmbed instead. The
 * thumbnail is derivable from the id alone and survives an oEmbed failure.
 */
export async function fetchYoutubeMetadata(videoId: string): Promise<LinkMetadata> {
    const image = youtubeThumbnail(videoId);
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(endpoint, { signal: controller.signal });

        if (!response.ok) {
            return { image };
        }

        const oembed = (await response.json()) as OembedResponse;
        const title = oembed.title?.trim() || undefined;
        const author = oembed.author_name?.trim();

        return {
            description: author ? `Video by ${author}` : undefined,
            image,
            title,
        };
    } catch {
        return { image };
    } finally {
        clearTimeout(timer);
    }
}

export function youtubeThumbnail(videoId: string): string {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeVideoId(rawUrl: string): null | string {
    let parsed: URL;

    try {
        parsed = new URL(rawUrl.trim());
    } catch {
        return null;
    }

    const host = parsed.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
    const segments = parsed.pathname.split('/').filter(Boolean);

    let candidate: null | string | undefined = null;

    if (host === 'youtu.be') {
        candidate = segments[0];
    } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
        candidate = PATH_PREFIXES.has(segments[0] ?? '')
            ? segments[1]
            : parsed.searchParams.get('v');
    }

    return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}
