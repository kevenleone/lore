import type { Item } from '@lore/types';

import { Elysia } from 'elysia';

import type { Workspace } from '../services/workspace';

type NewItemBody = Omit<Item, 'createdAt' | 'id' | 'updatedAt'>;

export function itemRoutes(workspace: Workspace) {
    return (
        new Elysia()
            // Deliberately no ?view= — filtering stays client-side via matchesView, so
            // there is one filtering code path shared by every repository.
            .get('/items', () => workspace.current.listItems())

            .get('/items/:id', ({ params, set }) => {
                const item = workspace.current.getItem(params.id);

                if (!item) {
                    set.status = 404;

                    return { error: 'not_found' };
                }

                return item;
            })

            .post('/items', async ({ body, set }) => {
                const item = await workspace.current.createItem(body as NewItemBody);

                workspace.notify();
                set.status = 201;

                return item;
            })

            .patch('/items/:id', async ({ body, params, set }) => {
                const item = await workspace.current.updateItem(params.id, body as Partial<Item>);

                if (!item) {
                    set.status = 404;

                    return { error: 'not_found' };
                }

                workspace.notify();

                return item;
            })

            .delete('/items/:id', async ({ params, set }) => {
                const ok = await workspace.current.deleteItem(params.id);

                if (!ok) {
                    set.status = 404;

                    return { error: 'not_found' };
                }

                workspace.notify();
                set.status = 204;

                return '';
            })

            /**
             * Per-file facts for the Properties panel: size, mtime, word count and
             * backlinks. Separate from the item itself so `/items` stays cheap —
             * it is re-read after every mutation.
             */
            .get('/items/:id/meta', ({ params, set }) => {
                const meta = workspace.current.itemMeta(params.id);

                if (!meta) {
                    set.status = 404;

                    return { error: 'not_found' };
                }

                return meta;
            })

            /**
             * Renames the file behind an item, rewriting inbound wikilinks.
             * Separate from PATCH because retitling deliberately does not rename.
             */
            .post('/items/:id/rename', async ({ body, params, set }) => {
                const { stem } = body as { stem?: string };

                if (!stem?.trim()) {
                    set.status = 400;

                    return { error: 'stem_required' };
                }

                const item = await workspace.current.renameItem(params.id, stem);

                if (!item) {
                    set.status = 404;

                    return { error: 'not_found' };
                }

                workspace.notify();

                return item;
            })

            /**
             * Re-reads a virtual document from its origin. Safe to call on every
             * open: the store holds the interval, so the renderer carries no
             * policy and a hot item is not refetched.
             */
            .post('/items/:id/refresh', async ({ params, query, set }) => {
                const item = await workspace.current.refreshItem(params.id, query.force === '1');

                if (!item) {
                    set.status = 404;

                    return { error: 'not_found' };
                }

                workspace.notify();

                return item;
            })
    );
}
