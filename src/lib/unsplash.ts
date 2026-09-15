// The renderer's half of the Unsplash picker. The search itself runs in the
// data engine — see `sidecar/src/unsplash.ts` — so this is the request and the
// vocabulary the picker speaks.

import type { ImageCredit } from '../store/types';

import { HttpError, request } from '../data/sidecarClient';

/** Unsplash requires the link back to carry the app's UTM parameters. */
export const UNSPLASH_HOME = 'https://unsplash.com/?utm_source=lore&utm_medium=referral';

export type UnsplashErrorCode = 'bad_key' | 'rate_limited' | 'unavailable';

export interface UnsplashPhoto {
    alt: string;
    color: string;
    downloadLocation: string;
    id: string;
    name: string;
    profileUrl: string;
    url: string;
}

export interface UnsplashSearch {
    photos: UnsplashPhoto[];
    total: number;
}

const MESSAGES: Record<UnsplashErrorCode, string> = {
    bad_key: 'Unsplash rejected that Access Key. Check it in Settings → Capture.',
    rate_limited: 'Unsplash is rate-limiting this key. Try again in a little while.',
    unavailable: 'Could not reach Unsplash. Check your connection and try again.',
};

/** The credit an item stores for a picked photo. */
export function creditFor(photo: UnsplashPhoto): ImageCredit {
    return { name: photo.name, profileUrl: photo.profileUrl, provider: 'unsplash' };
}

/**
 * A sentence for whatever went wrong. The engine answers a failed search with
 * `{ error: <code> }`, which reaches here as an `HttpError` whose message is
 * that JSON — so the code has to be dug back out of it.
 */
export function messageFor(error: unknown): string {
    const code = error instanceof HttpError ? codeIn(error.message) : undefined;
    return MESSAGES[code ?? 'unavailable'];
}

export async function searchPhotos(key: string, query: string, page = 1): Promise<UnsplashSearch> {
    return request<UnsplashSearch>('/unsplash/search', {
        body: JSON.stringify({ key, page, query }),
        method: 'POST',
    });
}

/**
 * Unsplash's API terms require this whenever a photo is actually used, so it is
 * fired on the pick rather than on the search. Failure is silent: the photo is
 * already the item's thumbnail, and nothing the user did should be undone
 * because a tracking ping did not land.
 */
export function trackDownload(key: string, downloadLocation: string): void {
    if (!downloadLocation) return;
    void request('/unsplash/download', {
        body: JSON.stringify({ downloadLocation, key }),
        method: 'POST',
    }).catch(() => {});
}

function codeIn(body: string): undefined | UnsplashErrorCode {
    try {
        const { error } = JSON.parse(body) as { error?: string };
        return error && error in MESSAGES ? (error as UnsplashErrorCode) : undefined;
    } catch {
        return undefined;
    }
}
