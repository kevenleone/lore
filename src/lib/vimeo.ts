// Mirrors `sidecar/src/vimeo.ts`: the renderer needs the id synchronously to
// pick the player, and cannot import from the engine's package.

import { parseStart } from './youtube';

const VIDEO_ID = /^\d{6,}$/;
const PRIVACY_HASH = /^[\da-f]{6,}$/i;

export interface VimeoVideo {
    /** Unlisted videos only play when the embed carries their privacy hash. */
    hash?: string;
    id: string;
    start?: number;
}

export function vimeoEmbedUrl(video: VimeoVideo): string {
    const params = new URLSearchParams({ autoplay: '1', dnt: '1' });
    if (video.hash) params.set('h', video.hash);
    const fragment = video.start ? `#t=${video.start}s` : '';
    return `https://player.vimeo.com/video/${video.id}?${params}${fragment}`;
}

export function vimeoVideo(rawUrl: string | undefined): null | VimeoVideo {
    if (!rawUrl) return null;
    const target = rawUrl.trim();
    let parsed: URL;
    try {
        parsed = new URL(/^https?:\/\//i.test(target) ? target : `https://${target}`);
    } catch {
        return null;
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;

    const segments = parsed.pathname.split('/').filter(Boolean);
    const marker = segments.findIndex((segment) => segment === 'video' || segment === 'videos');
    const index =
        marker === -1 ? segments.findIndex((segment) => VIDEO_ID.test(segment)) : marker + 1;
    const id = segments[index];
    if (!id || !VIDEO_ID.test(id)) return null;

    const candidateHash = parsed.searchParams.get('h') ?? segments[index + 1];
    const hash = candidateHash && PRIVACY_HASH.test(candidateHash) ? candidateHash : undefined;
    const start = parseStart(new URLSearchParams(parsed.hash.slice(1)).get('t'));
    const video: VimeoVideo = { id };
    if (hash) video.hash = hash;
    if (start) video.start = start;
    return video;
}
