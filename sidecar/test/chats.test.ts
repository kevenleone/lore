import type { ChatThread, ChatThreadSummary } from '@lore/types';

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createApp } from '../src/app';
import { Workspace } from '../src/services/workspace';

const TOKEN = 't';
let root: string;
let workspace: Workspace;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-chats-'));
    workspace = new Workspace();
    await workspace.open(root);
});

afterEach(async () => {
    await workspace.close();
    await rm(root, { force: true, recursive: true });
});

async function call(method: string, path: string, body?: unknown): Promise<Response> {
    const app = createApp(
        { dev: false, parentPid: null, port: 0, token: TOKEN, vault: null },
        workspace,
    );

    return app.handle(
        new Request(`http://127.0.0.1${path}`, {
            body: body ? JSON.stringify(body) : undefined,
            headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
            method,
        }),
    );
}

const turn = (id: string, question: string) => [
    { id: `u_${id}`, role: 'user', text: question },
    { id: `a_${id}`, role: 'ai', sources: [{ itemId: 'i1' }], text: 'It runs hot. [[oven-notes]]' },
];

describe('saved conversations', () => {
    it('writes a thread as a file in the vault and reads it back', async () => {
        const saved = await call('POST', '/chats/t1', {
            createdAt: '2026-10-11T10:00:00.000Z',
            messages: turn('1', '  What about\nthe oven?  '),
            updatedAt: '2026-10-11T10:00:05.000Z',
        });

        expect(saved.status).toBe(200);

        const onDisk = JSON.parse(await readFile(join(root, '.lore/chats/t1.json'), 'utf8'));
        const read = (await (await call('GET', '/chats/t1')).json()) as ChatThread;

        expect(onDisk.title).toBe('What about the oven?');
        expect(read.messages).toHaveLength(2);
        expect(read.messages[1].sources).toEqual([{ itemId: 'i1' }]);
    });

    it('keeps nothing of a turn that was still in flight', async () => {
        await call('POST', '/chats/t1', {
            messages: [
                ...turn('1', 'first'),
                { activity: 'Searching', id: 'a_2', pending: true, role: 'ai', text: '' },
                { error: 'Not logged in', id: 'a_3', role: 'ai', text: 'half' },
            ],
        });

        const read = (await (await call('GET', '/chats/t1')).json()) as ChatThread;

        expect(read.messages.map((message) => message.id)).toEqual(['u_1', 'a_1', 'a_3']);
        expect(read.messages[2]).toEqual({ id: 'a_3', role: 'ai', text: 'half' });
    });

    it('lists threads newest first, without their messages', async () => {
        await call('POST', '/chats/old', {
            messages: turn('1', 'older'),
            updatedAt: '2026-10-01T10:00:00.000Z',
        });
        await call('POST', '/chats/new', {
            messages: turn('2', 'newer'),
            updatedAt: '2026-10-11T10:00:00.000Z',
        });

        const listed = (await (await call('GET', '/chats')).json()) as ChatThreadSummary[];

        expect(listed.map((thread) => thread.title)).toEqual(['newer', 'older']);
        expect(listed[0]).not.toHaveProperty('messages');
    });

    it('skips a file that does not parse, and leaves it where it is', async () => {
        await mkdir(join(root, '.lore/chats'), { recursive: true });
        await writeFile(join(root, '.lore/chats/broken.json'), '{ not json');
        await call('POST', '/chats/good', { messages: turn('1', 'fine') });

        const listed = (await (await call('GET', '/chats')).json()) as ChatThreadSummary[];

        expect(listed.map((thread) => thread.id)).toEqual(['good']);
        expect(await readFile(join(root, '.lore/chats/broken.json'), 'utf8')).toBe('{ not json');
    });

    it('deletes a thread', async () => {
        await call('POST', '/chats/t1', { messages: turn('1', 'gone soon') });
        await call('DELETE', '/chats/t1');

        expect((await call('GET', '/chats/t1')).status).toBe(404);
        expect(await (await call('GET', '/chats')).json()).toEqual([]);
    });

    it('refuses an id that is not a plain filename, and an empty thread', async () => {
        expect(
            (await call('POST', '/chats/..%2F..%2Fescape', { messages: turn('1', 'x') })).status,
        ).toBe(400);
        expect((await call('GET', '/chats/..%2Fworkspace')).status).toBe(404);
        expect((await call('POST', '/chats/t1', { messages: [] })).status).toBe(400);
    });

    it('keeps conversations out of git unless the user says otherwise', async () => {
        expect(await readFile(join(root, '.lore/.gitignore'), 'utf8')).toContain('\nchats/\n');
    });
});
