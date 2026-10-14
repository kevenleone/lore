import { Elysia } from 'elysia';

import type { Workspace } from '../services/workspace';

import { hashColor } from '../services/vault';

export function collectionRoutes(workspace: Workspace) {
    return new Elysia()
        .get('/collections', () => workspace.current.listCollections())

        .post('/collections', async ({ body, set }) => {
            const { color, name } = body as { color?: string; name?: string };

            if (!name) {
                set.status = 400;

                return { error: 'name_required' };
            }

            const created = await workspace.current.createCollection(
                name,
                color ?? hashColor(name),
            );

            workspace.notify();
            set.status = 201;

            return created;
        })

        .patch('/collections/:id', async ({ body, params, set }) => {
            const patch = body as { color?: string; name?: string };
            const updated = await workspace.current.updateCollection(params.id, patch);

            if (!updated) {
                set.status = 404;

                return { error: 'not_found' };
            }

            workspace.notify();

            return updated;
        })

        .delete('/collections/:id', async ({ params, set }) => {
            await workspace.current.deleteCollection(params.id);
            workspace.notify();
            set.status = 204;

            return '';
        });
}
