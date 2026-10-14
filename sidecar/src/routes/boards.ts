import type { BoardConfig } from '@lore/types';

import { Elysia } from 'elysia';

import type { Workspace } from '../services/workspace';

export function boardRoutes(workspace: Workspace) {
    return (
        new Elysia()
            .get('/boards', () => workspace.current.listBoards())

            /**
             * `POST` with the id in the body, rather than `PUT /boards/:id`:
             * the unfiled board's id is the empty string, which no path
             * parameter can carry — and `PUT` is not a method the CORS guard
             * allows, so every save would be refused before it arrived.
             */
            .post('/boards', async ({ body, set }) => {
                const { board, id } = body as { board?: BoardConfig | null; id?: string };

                if (typeof id !== 'string') {
                    set.status = 400;

                    return { error: 'id_required' };
                }

                await workspace.current.saveBoard(id, board ?? null);
                workspace.notify();

                return { ok: true };
            })
    );
}
