// The HTTP surface, exercised through the real middleware chain. This is the
// contract the renderer's VaultRepository will be written against, so the
// shapes here are the ones that matter.

import type { Item } from '@lore/types';

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
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
    app = createApp({ dev: false, parentPid: null, port: 0, token: TOKEN, vault: null }, workspace);
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
        expect(meta.body.backlinks.map((b: Item) => b.id)).toEqual([source.body.id]);
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
        expect(res.body.map((i: Item) => i.title)).toEqual(['Opaque']);
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
        const text = (v: unknown) =>
            typeof v === 'string' ? v : new TextDecoder().decode(v as Uint8Array);

        expect(text((await reader.read()).value)).toContain('event: ready');

        // A write through the API must reach a subscriber.
        const changed = reader.read();
        await call('POST', '/items', newItem({ title: 'Triggers an event' }));
        expect(text((await changed).value)).toContain('event: changed');

        await reader.cancel();
    });
});

describe('migration', () => {
    beforeEach(openVault);

    it('writes the legacy library into folders and rewrites related links', async () => {
        const res = await call('POST', '/migrate/sqlite', {
            collections: [{ color: '#8a92b8', id: 'Reading List', name: 'Reading List' }],
            items: [
                {
                    collectionId: 'Reading List',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    flags: { inbox: true },
                    id: 'i1',
                    related: ['i2'],
                    tags: ['product'],
                    title: 'How Linear builds product',
                    type: 'link',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                    url: 'https://linear.app',
                },
                {
                    body: 'Notes here.',
                    createdAt: '2026-01-02T00:00:00.000Z',
                    flags: {},
                    id: 'i2',
                    related: ['i1'],
                    tags: [],
                    title: 'Second brain',
                    type: 'note',
                    updatedAt: '2026-01-02T00:00:00.000Z',
                },
            ],
        });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ collections: 1, items: 2 });

        const items = (await call('GET', '/items')).body as Item[];
        const linear = items.find((i) => i.title === 'How Linear builds product')!;
        const brain = items.find((i) => i.title === 'Second brain')!;

        // Collections became folders.
        expect(linear.collectionId).toBe('Reading List');
        expect(brain.collectionId).toBeUndefined();

        // The old opaque ids were rewritten to the new ones, both ways.
        expect(linear.related).toEqual([brain.id]);
        expect(brain.related).toEqual([linear.id]);
        expect(linear.id).not.toBe('i1');

        // On disk they are wikilinks, not ids.
        const raw = await Bun.file(join(root, 'Reading List/how-linear-builds-product.md')).text();
        expect(raw).toContain('[[second-brain]]');
        expect(raw).not.toContain('i2');
    });

    it('preserves the url/body split the legacy schema conflated', async () => {
        await call('POST', '/migrate/sqlite', {
            items: [
                {
                    createdAt: '2026-01-01T00:00:00.000Z',
                    flags: {},
                    id: 'l',
                    related: [],
                    tags: [],
                    title: 'L',
                    type: 'link',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                    url: 'https://x.test',
                },
                {
                    body: 'note body',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    flags: {},
                    id: 'n',
                    related: [],
                    tags: [],
                    title: 'N',
                    type: 'note',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ],
        });
        const items = (await call('GET', '/items')).body as Item[];
        const link = items.find((i) => i.title === 'L')!;
        expect((await call('GET', `/items/${link.id}`)).body.url).toBe('https://x.test');
        const note = items.find((i) => i.title === 'N')!;
        expect((await call('GET', `/items/${note.id}`)).body.body).toBe('note body');
    });
});

describe('migration fidelity', () => {
    beforeEach(openVault);

    it('preserves the original timestamps', async () => {
        // Flattening these to "now" would destroy sort order and every relative
        // date in a migrated library.
        await call('POST', '/migrate/sqlite', {
            items: [
                {
                    createdAt: '2026-01-05T10:00:00.000Z',
                    flags: {},
                    id: 'old',
                    related: [],
                    tags: [],
                    title: 'Old',
                    type: 'note',
                    updatedAt: '2026-02-01T11:00:00.000Z',
                },
            ],
        });
        const item = ((await call('GET', '/items')).body as Item[])[0];
        expect(item.createdAt).toBe('2026-01-05T10:00:00.000Z');
        expect(item.updatedAt).toBe('2026-02-01T11:00:00.000Z');
    });

    it('does not restamp updatedAt when re-linking related items', async () => {
        await call('POST', '/migrate/sqlite', {
            items: [
                {
                    createdAt: '2026-01-01T00:00:00.000Z',
                    flags: {},
                    id: 'a',
                    related: ['b'],
                    tags: [],
                    title: 'A',
                    type: 'note',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
                {
                    createdAt: '2026-01-02T00:00:00.000Z',
                    flags: {},
                    id: 'b',
                    related: [],
                    tags: [],
                    title: 'B',
                    type: 'note',
                    updatedAt: '2026-01-02T00:00:00.000Z',
                },
            ],
        });
        const items = (await call('GET', '/items')).body as Item[];
        const a = items.find((i) => i.title === 'A')!;
        expect(a.updatedAt).toBe('2026-01-01T00:00:00.000Z');
        expect(a.related).toHaveLength(1);
    });

    it('still stamps a normal capture with now', async () => {
        const before = Date.now();
        const created = (await call('POST', '/items', newItem({ title: 'Fresh' }))).body as Item;
        expect(new Date(created.createdAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
    });
});
