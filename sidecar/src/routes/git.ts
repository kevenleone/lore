import { Elysia } from 'elysia';

import { gitStatus, initGit } from '../services/git';

/*
 * Both take the folder as a parameter rather than acting on the open
 * workspace: onboarding offers Git before any vault is open, and the
 * recents list asks about folders it has not opened at all.
 */
export function gitRoutes() {
    return new Elysia()
        .post('/git/status', ({ body, set }) => {
            const { path } = body as { path?: string };

            if (!path) {
                set.status = 400;

                return { error: 'path_required' };
            }

            return gitStatus(path);
        })

        .post('/git/init', ({ body, set }) => {
            const { path } = body as { path?: string };

            if (!path) {
                set.status = 400;

                return { error: 'path_required' };
            }

            return initGit(path);
        });
}
