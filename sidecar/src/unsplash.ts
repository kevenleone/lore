// Unsplash photo search, for the Properties panel's thumbnail picker.
//
// Server-side for the same reason `linkMetadata` is: there is no CORS here, and
// the Access Key never has to sit in a renderer request the page could leak. It
// arrives per call rather than from the environment because the key is a user
// preference, not deployment config — Lore ships without one.
//
// Two of Unsplash's API requirements are met here rather than being left to the
// caller: `triggerDownload` pings the photo's own download endpoint whenever a
// photo is actually used, and every profile link is returned UTM-tagged.

const API = 'https://api.unsplash.com';
const TIMEOUT_MS = 8_000;
/** Unsplash requires this on every link back; `utm_source` is the app name. */
const UTM = 'utm_source=lore&utm_medium=referral';

export interface UnsplashPhoto {
    /** The photographer's own description, for the `alt` text. */
    alt: string;
    /** Average colour, painted under the thumbnail while it loads. */
    color: string;
    /** Unsplash's download-tracking endpoint — see `triggerDownload`. */
    downloadLocation: string;
    id: string;
    name: string;
    /** UTM-tagged profile page, as the API terms require. */
    profileUrl: string;
    /** What the item stores: a hotlink to Unsplash's CDN. */
    url: string;
}

export interface UnsplashResult {
    photos: UnsplashPhoto[];
    total: number;
}

type Json = Record<string, unknown>;

/** Maps Unsplash's error shapes onto codes the picker can show a sentence for. */
export class UnsplashError extends Error {
    constructor(readonly code: 'bad_key' | 'rate_limited' | 'unavailable') {
        super(code);
    }
}

export async function searchPhotos(key: string, query: string, page = 1): Promise<UnsplashResult> {
    const url = new URL(`${API}/search/photos`);

    url.searchParams.set('query', query);
    url.searchParams.set('page', String(page));
    url.searchParams.set('per_page', '24');
    // The picker fills an item's thumbnail; nothing here should surprise anyone.
    url.searchParams.set('content_filter', 'high');

    const res = await get(url, key);

    if (res.status === 401) {
        throw new UnsplashError('bad_key');
    }

    if (res.status === 403) {
        throw new UnsplashError('rate_limited');
    }

    if (!res.ok) {
        throw new UnsplashError('unavailable');
    }

    const data = (await res.json()) as { results?: unknown[]; total?: number };

    return {
        photos: (data.results ?? []).map(toPhoto).filter((unsplashPhoto): unsplashPhoto is UnsplashPhoto => !!unsplashPhoto),
        total: typeof data.total === 'number' ? data.total : 0,
    };
}

/**
 * Unsplash's API terms require this whenever a photo is actually used — it is
 * how a photographer's download count reflects reality. It is not a redirect to
 * follow or bytes to fetch: the request itself is the whole point, so a failure
 * is swallowed rather than failing the pick the user already made.
 */
export async function triggerDownload(key: string, downloadLocation: string): Promise<void> {
    if (!downloadLocation.startsWith(`${API}/`)) {
        return;
    }

    try {
        await get(new URL(downloadLocation), key);
    } catch {
        // Best effort; never block the caller.
    }
}

function get(url: URL, key: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    return fetch(url, {
        headers: {
            'Accept-Version': 'v1',
            // Unsplash's own scheme — not a Bearer token.
            Authorization: `Client-ID ${key}`,
        },
        signal: controller.signal,
    }).finally(() => clearTimeout(timer));
}

const str = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined);
const obj = (value: unknown): Json | undefined =>
    value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : undefined;

/** One search hit, or nothing if it is missing anything the picker needs. */
function toPhoto(raw: unknown): undefined | UnsplashPhoto {
    const photo = obj(raw);

    if (!photo) {
        return undefined;
    }

    const id = str(photo.id);
    const url = str(obj(photo.urls)?.regular);
    const user = obj(photo.user);
    const name = str(user?.name);
    const profile = str(obj(user?.links)?.html);

    if (!id || !url || !name || !profile) {
        return undefined;
    }

    return {
        alt: str(photo.alt_description) ?? '',
        color: str(photo.color) ?? '#cccccc',
        downloadLocation: str(obj(photo.links)?.download_location) ?? '',
        id,
        name,
        profileUrl: `${profile}?${UTM}`,
        url,
    };
}
