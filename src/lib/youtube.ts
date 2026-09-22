// Mirrors `sidecar/src/youtube.ts`: the renderer needs the id synchronously to
// pick the player, and cannot import from the engine's package.

const VIDEO_ID = /^[\w-]{11}$/;
const PATH_PREFIXES = new Set(['embed', 'live', 'shorts', 'v']);

export interface YoutubeVideo {
    id: string;
    /** Seconds into the video the URL asked to start at. */
    start?: number;
}

export function youtubeEmbedUrl(video: YoutubeVideo): string {
    const params = new URLSearchParams({ autoplay: '1', rel: '0' });
    if (video.start) params.set('start', String(video.start));
    return `https://www.youtube-nocookie.com/embed/${video.id}?${params}`;
}

export function youtubeThumbnail(videoId: string): string {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeVideo(rawUrl: string | undefined): null | YoutubeVideo {
    if (!rawUrl) return null;
    const target = rawUrl.trim();
    let parsed: URL;
    try {
        parsed = new URL(/^https?:\/\//i.test(target) ? target : `https://${target}`);
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
    if (!candidate || !VIDEO_ID.test(candidate)) return null;

    const start = parseStart(parsed.searchParams.get('t') ?? parsed.searchParams.get('start'));
    return start ? { id: candidate, start } : { id: candidate };
}

/** `t=90`, `t=90s` and `t=1h2m3s` are all forms YouTube's share links use. */
export function parseStart(raw: null | string): number | undefined {
    if (!raw) return undefined;
    if (/^\d+s?$/.test(raw)) return Number.parseInt(raw, 10) || undefined;
    const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
    if (!match) return undefined;
    const [, hours = '0', minutes = '0', seconds = '0'] = match;
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) || undefined;
}
