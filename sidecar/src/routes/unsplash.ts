import { Elysia } from 'elysia';

import { searchPhotos, triggerDownload, UnsplashError } from '../services/unsplash';

/*
 * The key travels in the body on every call rather than being held
 * here: it is a user preference the settings sheet owns, and the
 * sidecar outlives no session that would make caching it correct.
 */
export function unsplashRoutes() {
    return (
        new Elysia()
            .post('/unsplash/search', async ({ body, set }) => {
                const { key, page, query } = body as {
                    key?: string;
                    page?: number;
                    query?: string;
                };

                if (!key) {
                    set.status = 400;

                    return { error: 'key_required' };
                }

                if (!query?.trim()) {
                    return { photos: [], total: 0 };
                }

                try {
                    return await searchPhotos(key, query.trim(), page ?? 1);
                } catch (error) {
                    set.status = error instanceof UnsplashError ? 502 : 500;

                    return {
                        error: error instanceof UnsplashError ? error.code : 'unavailable',
                    };
                }
            })

            /** Unsplash requires a ping here whenever a photo is actually used. */
            .post('/unsplash/download', async ({ body }) => {
                const { downloadLocation, key } = body as {
                    downloadLocation?: string;
                    key?: string;
                };

                if (key && downloadLocation) {
                    await triggerDownload(key, downloadLocation);
                }

                return { ok: true };
            })
    );
}
