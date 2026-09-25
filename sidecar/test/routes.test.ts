// The HTTP surface, exercised through the real middleware chain. This is the
// contract the renderer's VaultRepository will be written against, so the
// shapes here are the ones that matter.

import type { Item } from '@lore/types';

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createApp } from '../src/app';
import { Workspace } from '../src/workspace';

const TOKEN = 't';
let root: string;
let workspace: Workspace;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-routes-'));
    workspace = new Workspace();
    app = createApp(
        { dev: false, owner: null, parentPid: null, port: 0, token: TOKEN, vault: null },
        workspace,
    );
});

afterEach(async () => {
    await workspace.close();
    await rm(root, { force: true, recursive: true });
});

async function call(method: string, path: string, body?: unknown) {
    const res = await app.handle(
        new Request(`http://127.0.0.1${path}`, {
            headers: {
                authorization: `Bearer ${TOKEN}`,
                origin: 'tauri://localhost',
                ...(body ? { 'content-type': 'application/json' } : {}),
            },
            method,
            ...(body ? { body: JSON.stringify(body) } : {}),
        }),
    );
    const text = await res.text();

    return { body: text ? JSON.parse(text) : null, status: res.status };
}

const openVault = () => call('POST', '/workspace/open', { path: root });

const newItem = (over: Partial<Item> = {}) => ({
    flags: {},
    related: [],
    tags: [],
    title: 'A note',
    type: 'note',
    ...over,
});

describe('workspace routes', () => {
    it('refuses item routes until a workspace is open', async () => {
        const res = await call('GET', '/items');

        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: 'no_workspace' });
    });

    it('opens a vault and reports the item count', async () => {
        const res = await openVault();

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ itemCount: 0, path: root });
    });

    it('reports the open workspace on /health', async () => {
        await openVault();

        const res = await call('GET', '/health');

        expect(res.body.workspace).toBe(root);
    });
});

describe('item routes', () => {
    beforeEach(openVault);

    it('creates, lists, reads and deletes', async () => {
        const created = await call(
            'POST',
            '/items',
            newItem({ body: 'Body text', title: 'Hello' }),
        );

        expect(created.status).toBe(201);

        const id = created.body.id;

        const listed = await call('GET', '/items');

        expect(listed.body).toHaveLength(1);
        // listItems omits the body so a refresh stays cheap...
        expect(listed.body[0].body).toBeUndefined();
        expect(listed.body[0].snippet).toBe('Body text');

        // ...and getItem is the only route that returns one.
        const one = await call('GET', `/items/${id}`);

        expect(one.body.body).toBe('Body text');

        expect((await call('DELETE', `/items/${id}`)).status).toBe(204);
        expect((await call('GET', `/items/${id}`)).status).toBe(404);
    });

    it('404s an unknown id rather than erroring', async () => {
        expect((await call('GET', '/items/nope')).status).toBe(404);
        expect((await call('PATCH', '/items/nope', { title: 'x' })).status).toBe(404);
        expect((await call('DELETE', '/items/nope')).status).toBe(404);
    });

    it('patches partially, leaving other fields alone', async () => {
        const created = await call('POST', '/items', newItem({ body: 'keep me', title: 'Before' }));
        const patched = await call('PATCH', `/items/${created.body.id}`, { title: 'After' });

        expect(patched.body.title).toBe('After');
        expect(patched.body.body).toBe('keep me');
    });
});

describe('item meta route', () => {
    beforeEach(openVault);

    it('answers file stats and backlinks', async () => {
        const target = await call('POST', '/items', newItem({ body: 'one two', title: 'Target' }));
        const source = await call(
            'POST',
            '/items',
            newItem({ related: [target.body.id], title: 'Source' }),
        );

        const meta = await call('GET', `/items/${target.body.id}/meta`);

        expect(meta.status).toBe(200);
        expect(meta.body.path).toBe('target.md');
        expect(meta.body.words).toBe(2);
        expect(meta.body.size).toBeGreaterThan(0);
        expect(meta.body.modifiedAt).toBeTruthy();
        expect(meta.body.backlinks.map((backlink: Item) => backlink.id)).toEqual([source.body.id]);
    });

    it('names the links it could not resolve, so a dead one is visible', async () => {
        // Written straight to disk: a link to a note that does not exist is
        // something only a hand-edited vault (or Obsidian) can produce.
        await writeFile(
            join(root, 'source.md'),
            ['---', 'title: Source', 'related:', "  - '[[missing-note]]'", '---', '', 'text'].join(
                '\n',
            ),
            'utf8',
        );
        await call('POST', '/workspace/reindex');

        const items = await call('GET', '/items');
        const source = items.body.find((item: Item) => item.title === 'Source');

        const meta = await call('GET', `/items/${source.id}/meta`);

        expect(meta.body.unresolved).toEqual(['[[missing-note]]']);
        // The resolved side stays empty rather than inventing an id for it.
        expect(source.related).toEqual([]);
    });

    it('has nothing unresolved when every link lands', async () => {
        const target = await call('POST', '/items', newItem({ title: 'Target' }));

        await call('POST', '/items', newItem({ related: [target.body.id], title: 'Source' }));

        const items = await call('GET', '/items');
        const source = items.body.find((item: Item) => item.title === 'Source');

        expect((await call('GET', `/items/${source.id}/meta`)).body.unresolved).toEqual([]);
    });

    it('404s an unknown id', async () => {
        expect((await call('GET', '/items/nope/meta')).status).toBe(404);
    });
});

describe('collection routes', () => {
    beforeEach(openVault);

    it('creates a collection and files an item into it', async () => {
        const c = await call('POST', '/collections', { color: '#8a92b8', name: 'Work' });

        expect(c.status).toBe(201);

        const item = await call(
            'POST',
            '/items',
            newItem({ collectionId: 'Work', title: 'Filed' }),
        );

        expect(item.body.collectionId).toBe('Work');

        const list = await call('GET', '/collections');

        expect(list.body.map((x: { id: string }) => x.id)).toContain('Work');
    });

    it('unfiles children when a collection is deleted', async () => {
        await call('POST', '/collections', { color: '#8a92b8', name: 'Work' });

        const item = await call(
            'POST',
            '/items',
            newItem({ collectionId: 'Work', title: 'Filed' }),
        );

        expect((await call('DELETE', '/collections/Work')).status).toBe(204);

        const after = await call('GET', `/items/${item.body.id}`);

        expect(after.body.collectionId).toBeUndefined();
    });

    it('requires a name', async () => {
        expect((await call('POST', '/collections', {})).status).toBe(400);
    });
});

describe('derived reads', () => {
    beforeEach(openVault);

    it('counts tags', async () => {
        await call('POST', '/items', newItem({ tags: ['design'], title: 'A' }));
        await call('POST', '/items', newItem({ tags: ['design', 'work'], title: 'B' }));

        const res = await call('GET', '/tags');

        expect(res.body).toEqual([
            { count: 2, name: 'design' },
            { count: 1, name: 'work' },
        ]);
    });

    it('searches bodies via the index', async () => {
        await call('POST', '/items', newItem({ body: 'perceptual uniformity', title: 'Opaque' }));
        await call('POST', '/items', newItem({ body: 'unrelated', title: 'Other' }));

        const res = await call('GET', '/search?q=perceptual');

        expect(res.body.map((item: Item) => item.title)).toEqual(['Opaque']);
    });
});

describe('events', () => {
    it('streams a ready event and then changes', async () => {
        await openVault();

        const res = await app.handle(
            new Request(`http://127.0.0.1/events?token=${TOKEN}`, {
                headers: { origin: 'tauri://localhost' },
            }),
        );

        expect(res.headers.get('content-type')).toContain('text/event-stream');

        const reader = res.body!.getReader();
        // Chunks may arrive as strings or bytes depending on the runtime.
        const text = (value: unknown) =>
            typeof value === 'string' ? value : new TextDecoder().decode(value as Uint8Array);

        expect(text((await reader.read()).value)).toContain('event: ready');

        // A write through the API must reach a subscriber.
        const changed = reader.read();

        await call('POST', '/items', newItem({ title: 'Triggers an event' }));
        expect(text((await changed).value)).toContain('event: changed');

        await reader.cancel();
    });
});

describe('attachment routes', () => {
    beforeEach(openVault);

    async function upload(name: string, bytes: Uint8Array) {
        const form = new FormData();

        form.append('file', new File([bytes], name));

        const res = await app.handle(
            new Request('http://127.0.0.1/attachments', {
                body: form,
                headers: { authorization: `Bearer ${TOKEN}`, origin: 'tauri://localhost' },
                method: 'POST',
            }),
        );

        return { body: (await res.json()) as { path: string }, status: res.status };
    }

    const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

    it('copies a file into attachments/ and serves it back', async () => {
        const created = await upload('Screen Shot.PNG', PNG);

        expect(created.status).toBe(201);
        expect(created.body.path).toBe('attachments/screen-shot.png');

        const res = await app.handle(
            new Request(`http://127.0.0.1/${created.body.path}`, {
                headers: { authorization: `Bearer ${TOKEN}`, origin: 'tauri://localhost' },
            }),
        );

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('image/png');
        expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
    });

    it('never overwrites an attachment that is already there', async () => {
        const first = await upload('shot.png', PNG);
        const second = await upload('shot.png', PNG);

        expect(first.body.path).toBe('attachments/shot.png');
        expect(second.body.path).toBe('attachments/shot-2.png');
    });

    it('serves a read to a token in the query, since <img> cannot set headers', async () => {
        const { body } = await upload('shot.png', PNG);
        const res = await app.handle(new Request(`http://127.0.0.1/${body.path}?token=${TOKEN}`));

        expect(res.status).toBe(200);
    });

    it('refuses a read with no token at all', async () => {
        const { body } = await upload('shot.png', PNG);
        const res = await app.handle(new Request(`http://127.0.0.1/${body.path}`));

        expect(res.status).toBe(401);
    });

    it('refuses an upload authorised only by the query token', async () => {
        const form = new FormData();

        form.append('file', new File([PNG], 'shot.png'));

        const res = await app.handle(
            new Request(`http://127.0.0.1/attachments?token=${TOKEN}`, {
                body: form,
                method: 'POST',
            }),
        );

        expect(res.status).toBe(401);
    });

    it('refuses a path that climbs out of attachments/', async () => {
        const res = await app.handle(
            new Request('http://127.0.0.1/attachments/..%2F..%2Fetc%2Fpasswd', {
                headers: { authorization: `Bearer ${TOKEN}`, origin: 'tauri://localhost' },
            }),
        );

        expect(res.status).toBe(404);
    });

    it('rejects a request with no file part', async () => {
        const res = await app.handle(
            new Request('http://127.0.0.1/attachments', {
                body: new FormData(),
                headers: { authorization: `Bearer ${TOKEN}`, origin: 'tauri://localhost' },
                method: 'POST',
            }),
        );

        expect(res.status).toBe(400);
    });
});

describe('virtual document routes', () => {
    const realFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = realFetch;
    });

    const serve = (markdown: string) => {
        globalThis.fetch = (async () => new Response(markdown)) as unknown as typeof fetch;
    };

    const source = {
        fetched: '2026-01-01T00:00:00.000Z',
        kind: 'github',
        raw: 'https://raw.githubusercontent.com/e/e/HEAD/README.md',
        ref: 'HEAD',
    };

    it('resolves a repo URL to its README before a workspace is open', async () => {
        serve('# emitsignal');

        const res = await call('POST', '/github/resolve', {
            url: 'https://github.com/emitsignal/emitsignal',
        });

        expect(res.status).toBe(200);
        expect(res.body.markdown).toBe('# emitsignal');
        expect(res.body.title).toBe('emitsignal/emitsignal');
    });

    it('answers empty for a URL that names no document', async () => {
        expect(
            (await call('POST', '/github/resolve', { url: 'https://github.com/o/r/issues/1' }))
                .body,
        ).toEqual({});
    });

    it('requires a url', async () => {
        expect((await call('POST', '/github/resolve', {})).status).toBe(400);
    });

    it('refreshes a virtual document from its origin', async () => {
        await openVault();

        const created = await call('POST', '/items', newItem({ body: 'old', source }));

        serve('# new');

        const res = await call('POST', `/items/${created.body.id}/refresh?force=1`);

        expect(res.status).toBe(200);
        expect(res.body.body).toBe('# new');
    });

    it('404s refreshing an unknown item', async () => {
        await openVault();
        expect((await call('POST', '/items/nope/refresh')).status).toBe(404);
    });
});

describe('board routes', () => {
    const board = {
        columns: [
            { id: 'todo', name: 'To do' },
            { done: true, id: 'done', name: 'Done' },
        ],
        view: 'cards' as const,
    };

    it('round-trips a board over HTTP', async () => {
        await openVault();
        expect((await call('GET', '/boards')).body).toEqual({});

        expect((await call('POST', '/boards', { board, id: 'Work' })).status).toBe(200);
        expect((await call('GET', '/boards')).body).toEqual({ Work: board });

        // The empty id is the board for tasks in no collection.
        await call('POST', '/boards', { board, id: '' });
        expect((await call('GET', '/boards')).body).toEqual({ '': board, Work: board });

        await call('POST', '/boards', { board: null, id: 'Work' });
        expect((await call('GET', '/boards')).body).toEqual({ '': board });
    });

    it('refuses a save with no id', async () => {
        await openVault();
        expect((await call('POST', '/boards', { board })).status).toBe(400);
    });

    /*
     * The guard's method list is what a browser asks about before it will send
     * a cross-origin write at all. A route on a method missing from it is
     * refused before it arrives — which is invisible from a test that calls the
     * store directly, and looked like a board that silently would not save.
     */
    it('answers the preflight for the method the board route uses', async () => {
        const res = await app.handle(
            new Request('http://127.0.0.1/boards', {
                headers: {
                    'access-control-request-method': 'POST',
                    origin: 'tauri://localhost',
                },
                method: 'OPTIONS',
            }),
        );

        expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    });
});

/*
 * The renderer sends `null` for a field it wants emptied, because JSON drops
 * `undefined` and the patch would otherwise arrive with nothing in it. These
 * pin the engine's half of that contract: a null lands as an absent value and
 * the key stops being written to the file.
 */
describe('clearing a field', () => {
    const create = (over: Record<string, unknown>) =>
        call('POST', '/items', newItem({ title: 'A task', type: 'task', ...over }));

    it('empties a url, a priority, a due date and a status', async () => {
        await openVault();

        const { body: made } = await create({
            dueAt: '2026-09-20',
            priority: 'urgent',
            status: 'doing',
            url: 'https://example.com',
        });

        const { body: cleared } = await call('PATCH', `/items/${made.id}`, {
            dueAt: null,
            priority: null,
            status: null,
            url: null,
        });

        expect(cleared.dueAt).toBeUndefined();
        expect(cleared.priority).toBeUndefined();
        expect(cleared.status).toBeUndefined();
        expect(cleared.url).toBeUndefined();

        const raw = await readFile(join(root, cleared.path), 'utf8');

        expect(raw).not.toContain('priority:');
        expect(raw).not.toContain('status:');
        expect(raw).not.toContain('due:');
        expect(raw).not.toContain('url:');
    });

    it('unfiles an item whose collection is cleared', async () => {
        await openVault();

        const { body: made } = await create({ collectionId: 'Work' });

        expect(made.path).toBe('Work/a-task.md');

        const { body: moved } = await call('PATCH', `/items/${made.id}`, { collectionId: null });

        expect(moved.collectionId).toBeUndefined();
        expect(moved.path).toBe('a-task.md');
    });

    it('drops the completion date when a task is reopened', async () => {
        await openVault();

        const { body: made } = await create({
            completedAt: '2026-09-13T17:30:00.000Z',
            flags: { done: true },
        });

        expect(made.completedAt).toBe('2026-09-13T17:30:00.000Z');

        const { body: reopened } = await call('PATCH', `/items/${made.id}`, {
            completedAt: null,
            flags: { done: false },
        });

        expect(reopened.completedAt).toBeUndefined();
        expect(await readFile(join(root, reopened.path), 'utf8')).not.toContain('completed:');
    });
});
