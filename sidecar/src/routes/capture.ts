import { Elysia } from 'elysia';

import { parseGithubTarget, resolveDocument } from '../services/github';
import { fetchLinkMetadata } from '../services/link-metadata';

export function captureRoutes() {
    return (
        new Elysia()
            /**
             * Reads a page's OpenGraph tags for the capture window.
             *
             * Deliberately not behind the workspace guard: the capture window asks
             * for a preview while the user is still typing, which can happen before
             * any vault is open.
             */
            .post('/link-metadata', async ({ body, set }) => {
                const { url } = body as { url?: string };

                if (!url) {
                    set.status = 400;

                    return { error: 'url_required' };
                }

                return fetchLinkMetadata(url);
            })

            /**
             * Resolves a GitHub URL to the Markdown behind it — a repo's README or
             * a `.md` file named outright. Outside the workspace guard for the same
             * reason `/link-metadata` is: capture runs before a vault is open.
             *
             * A URL that names no document answers `{}`, and the capture saves an
             * ordinary link.
             */
            .post('/github/resolve', async ({ body, set }) => {
                const { url } = body as { url?: string };

                if (!url) {
                    set.status = 400;

                    return { error: 'url_required' };
                }

                const target = parseGithubTarget(url);

                if (!target) {
                    return {};
                }

                return ((await resolveDocument(target)) ?? {}) as unknown as Record<
                    string,
                    unknown
                >;
            })
    );
}
