import type { LinkMetadata } from './linkMetadata';

const TIMEOUT_MS = 5_000;
const THUMBNAIL_WIDTH = 1280;
const VIDEO_ID = /^\d{6,}$/;
const PRIVACY_HASH = /^[\da-f]{6,}$/i;

export interface VimeoVideo {
    hash?: string;
    id: string;
}

interface OembedResponse {
    author_name?: string;
    thumbnail_url?: string;
    title?: string;
}

/**
 * The player page carries a `<title>` but no OpenGraph image, so a video is
 * described by oEmbed. `null` means oEmbed had nothing and the caller should
 * fall back to reading the page.
 */
export async function fetchVimeoMetadata(video: VimeoVideo): Promise<LinkMetadata | null> {
    const params = new URLSearchParams({
        url: vimeoPageUrl(video),
        width: String(THUMBNAIL_WIDTH),
    });
    const endpoint = `https://vimeo.com/api/oembed.json?${params}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) return null;
        const oembed = (await response.json()) as OembedResponse;
        const author = oembed.author_name?.trim();
        return {
            description: author ? `Video by ${author}` : undefined,
            image: oembed.thumbnail_url?.trim() || undefined,
            title: oembed.title?.trim() || undefined,
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export function vimeoVideo(rawUrl: string): null | VimeoVideo {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl.trim());
    } catch {
        return null;
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;

    const segments = parsed.pathname.split('/').filter(Boolean);
    const marker = segments.findIndex((segment) => segment === 'video' || segment === 'videos');
    const index =
        marker === -1 ? segments.findIndex((segment) => VIDEO_ID.test(segment)) : marker + 1;
    if (!VIDEO_ID.test(segments[index] ?? '')) return null;

    const id = segments[index] as string;
    const hash = parsed.searchParams.get('h') ?? segments[index + 1];
    return hash && PRIVACY_HASH.test(hash) ? { hash, id } : { id };
}

function vimeoPageUrl(video: VimeoVideo): string {
    return video.hash
        ? `https://vimeo.com/${video.id}/${video.hash}`
        : `https://vimeo.com/${video.id}`;
}
