// The HTTP surface. Every route maps onto exactly one KnowledgeRepository
// method, so the renderer's implementation stays a thin translation layer.

import type { Item } from '@lore/types';

import { Elysia } from 'elysia';

import { fetchLinkMetadata } from './linkMetadata';
import { ATTACHMENTS_DIR, hashColor } from './vault';
import { Workspace, WorkspaceNotOpen } from './workspace';

type NewItemBody = Omit<Item, 'createdAt' | 'id' | 'updatedAt'>;

const MIME: Record<string, string> = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.heic': 'image/heic',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
};

export function routes(workspace: Workspace) {
    return (
        new Elysia()
            .onError(({ error, set }) => {
                if (error instanceof WorkspaceNotOpen) {
                    set.status = 409;
                    return { error: 'no_workspace' };
                }
                set.status = 500;
                return { error: error instanceof Error ? error.message : 'internal_error' };
            })

            /* ---------------- workspace ---------------- */

            .get('/workspace', async () => {
                if (!workspace.isOpen)
                    return { itemCount: 0, open: false, path: null, tagOrder: [] };
                const { tagOrder } = await workspace.current.vault.readWorkspaceFile();
                return {
                    itemCount: workspace.current.listItems().length,
                    open: true,
                    path: workspace.path,
                    tagOrder,
                };
            })

            .post('/workspace/open', ({ body }) => {
                const { path } = body as { path?: string };
                if (!path) return { error: 'path_required' };
                return workspace.open(path);
            })

            .post('/workspace/reindex', () => workspace.reconcile())

            /**
             * One-shot import from the legacy SQLite store. Collections are created
             * first so every item lands in a folder that already exists, and related
             * ids are rewritten to wikilinks once every file has a filename.
             */
            .post('/migrate/sqlite', async ({ body }) => {
                const { collections = [], items = [] } = body as {
                    collections?: { color: string; id: string; name: string }[];
                    items?: Item[];
                };
                const store = workspace.current;

                for (const c of collections) {
                    await store.createCollection(c.name, c.color);
                }

                // Pass 1: write every item, remembering the id it was given.
                const idMap = new Map<string, string>();
                for (const item of items) {
                    const created = await store.createItem({ ...item, related: [] });
                    idMap.set(item.id, created.id);
                }

                // Pass 2: now that every file exists, related ids resolve to filenames.
                for (const item of items) {
                    if (!item.related?.length) continue;
                    const id = idMap.get(item.id);
                    if (!id) continue;
                    const related = item.related
                        .map((old) => idMap.get(old))
                        .filter((x): x is string => !!x);
                    if (related.length) await store.updateItem(id, { related }, { touch: false });
                }

                workspace.notify();
                return { collections: collections.length, items: idMap.size };
            })

            /* ---------------- items ---------------- */

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

            /* ---------------- attachments ---------------- */

            /**
             * Copies a captured file into the vault's `attachments/` folder and
             * answers with the vault-relative path the item stores. Multipart
             * rather than JSON so a screenshot does not have to be base64'd.
             */
            .post('/attachments', async ({ request, set }) => {
                const form = await request.formData();
                const file = form.get('file');
                if (!(file instanceof File)) {
                    set.status = 400;
                    return { error: 'file_required' };
                }
                const bytes = new Uint8Array(await file.arrayBuffer());
                const path = await workspace.current.vault.writeAttachment(file.name, bytes);
                set.status = 201;
                return { path };
            })

            /**
             * Serves an attachment back. A wildcard rather than `:name` so a path
             * reads the way it is stored; `readAttachment` refuses anything
             * outside `attachments/`, and `safeJoin` anything outside the vault.
             */
            .get('/attachments/*', async ({ params, set }) => {
                const rel = `${ATTACHMENTS_DIR}/${params['*']}`;
                try {
                    const bytes = await workspace.current.vault.readAttachment(rel);
                    set.headers['content-type'] = contentType(rel);
                    // Content-addressed by name: a new upload gets a new filename,
                    // so a stored one can be cached hard.
                    set.headers['cache-control'] = 'private, max-age=31536000, immutable';
                    return new Response(bytes);
                } catch {
                    set.status = 404;
                    return { error: 'not_found' };
                }
            })

            /* ---------------- collections ---------------- */

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
            })

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

            /* ---------------- derived reads ---------------- */

            .get('/tags', () => workspace.current.listTags())

            /** Persists the sidebar's tag order into the vault itself. */
            .post('/tags/order', async ({ body }) => {
                const { tagOrder } = body as { tagOrder?: string[] };
                await workspace.current.vault.writeWorkspaceFile(tagOrder ?? []);
                return { ok: true };
            })

            .get('/search', ({ query }) => workspace.current.search(String(query.q ?? '')))

            /* ---------------- live updates ---------------- */

            /**
             * SSE rather than a WebSocket: the traffic is strictly one-directional,
             * and EventSource reconnects on its own, which is exactly the behaviour
             * wanted when the sidecar restarts.
             */
            .get('/events', () => {
                let unsubscribe: (() => void) | undefined;
                let keepalive: ReturnType<typeof setInterval> | undefined;

                const stream = new ReadableStream({
                    cancel() {
                        unsubscribe?.();
                        if (keepalive) clearInterval(keepalive);
                    },
                    start(controller) {
                        const send = (event: string, data: unknown) => {
                            try {
                                controller.enqueue(
                                    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
                                );
                            } catch {
                                // Client went away mid-write; cleanup happens in cancel().
                            }
                        };
                        send('ready', { ok: true });
                        unsubscribe = workspace.subscribe((paths) => send('changed', { paths }));
                        // Proxies and idle timeouts drop a silent stream; a comment keeps it warm.
                        keepalive = setInterval(() => {
                            try {
                                controller.enqueue(': keepalive\n\n');
                            } catch {
                                /* closed */
                            }
                        }, 25_000);
                    },
                });

                return new Response(stream, {
                    headers: {
                        'Cache-Control': 'no-cache',
                        Connection: 'keep-alive',
                        'Content-Type': 'text/event-stream',
                    },
                });
            })
    );
}

function contentType(relPath: string): string {
    const dot = relPath.lastIndexOf('.');
    return (dot > 0 && MIME[relPath.slice(dot).toLowerCase()]) || 'application/octet-stream';
}
