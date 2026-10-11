import type { AiBackendStatus } from '@lore/types';

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { AiBackend, ChatRequest } from '../src/ai/backend';

import { memorySecrets } from '../src/ai/credentials';
import { type AiService, createAiService } from '../src/ai/service';
import { createApp } from '../src/app';
import { Workspace } from '../src/workspace';

const TOKEN = 't';
let root: string;
let workspace: Workspace;
let asked: ChatRequest | null;
let reply: unknown;

function stubService(): AiService {
    const real = createAiService(memorySecrets(), async () => null);
    const backend: AiBackend = {
        async *chat(request) {
            asked = request;
            yield { text: 'Searching “oven”', type: 'activity' };
            yield { text: 'It runs hot. [[oven-notes]] ', type: 'delta' };
            yield { text: 'See also [[never-written]].', type: 'delta' };
        },
        async object({ schema }) {
            return schema.parse(reply);
        },
    };

    return {
        ...real,
        async backend(selection) {
            return selection.id === 'stub' ? backend : real.backend(selection);
        },
    };
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-ai-routes-'));
    await writeFile(
        join(root, 'oven-notes.md'),
        '---\ntitle: Oven notes\ntags: [kitchen]\n---\n\nRuns hot.\n',
    );
    workspace = new Workspace();
    await workspace.open(root);
    asked = null;
    reply = {};
});

afterEach(async () => {
    await workspace.close();
    await rm(root, { force: true, recursive: true });
});

async function call(method: string, path: string, body?: unknown): Promise<Response> {
    const app = createApp(
        { dev: false, parentPid: null, port: 0, token: TOKEN, vault: null },
        workspace,
        stubService(),
    );

    return app.handle(
        new Request(`http://127.0.0.1${path}`, {
            body: body ? JSON.stringify(body) : undefined,
            headers: {
                authorization: `Bearer ${TOKEN}`,
                'content-type': 'application/json',
                origin: 'tauri://localhost',
            },
            method,
        }),
    );
}

function events(stream: string): { data: Record<string, unknown>; event: string }[] {
    return stream
        .trim()
        .split('\n\n')
        .map((block) => {
            const [event, data] = block.split('\n');

            return { data: JSON.parse(data.slice('data: '.length)), event: event.slice(7) };
        });
}

describe('POST /ai/chat', () => {
    it('streams the answer and resolves the items it cites', async () => {
        const res = await call('POST', '/ai/chat', {
            backend: 'stub',
            messages: [{ role: 'user', text: 'what about the oven?' }],
        });
        const stream = events(await res.text());
        const itemId = workspace.current.itemByStem('oven-notes')?.id;

        expect(res.headers.get('content-type')).toBe('text/event-stream');
        expect(stream.map(({ event }) => event)).toEqual([
            'activity',
            'delta',
            'delta',
            'sources',
            'done',
        ]);
        // The link to a note nobody has written is not a source.
        expect(stream[3].data).toEqual({ sources: [{ itemId }] });
        expect(asked?.messages).toEqual([{ role: 'user', text: 'what about the oven?' }]);
    });

    it('refuses a conversation that does not end with a question', async () => {
        const res = await call('POST', '/ai/chat', {
            backend: 'stub',
            messages: [{ role: 'ai', text: 'hello' }],
        });

        expect(res.status).toBe(400);
    });

    it('says so when the chosen backend is not set up', async () => {
        const missingKey = await call('POST', '/ai/chat', {
            backend: 'anthropic',
            messages: [{ role: 'user', text: 'hi' }],
        });
        const missingTool = await call('POST', '/ai/chat', {
            backend: 'claude-cli',
            messages: [{ role: 'user', text: 'hi' }],
        });

        expect(missingKey.status).toBe(409);
        expect(await missingKey.json()).toEqual({
            code: 'ai_not_configured',
            error: 'Add an Anthropic API key in Settings.',
        });
        expect(missingTool.status).toBe(409);
    });
});

describe('credentials', () => {
    it('stores a key and only ever admits to having one', async () => {
        const service = stubService();
        const app = createApp(
            { dev: false, parentPid: null, port: 0, token: TOKEN, vault: null },
            workspace,
            service,
        );
        const send = (method: string, path: string, body?: unknown) =>
            app.handle(
                new Request(`http://127.0.0.1${path}`, {
                    body: body ? JSON.stringify(body) : undefined,
                    headers: {
                        authorization: `Bearer ${TOKEN}`,
                        'content-type': 'application/json',
                    },
                    method,
                }),
            );

        const saved = await send('POST', '/ai/credentials/anthropic', { key: ' sk-secret ' });
        const status = await (await send('GET', '/ai/status')).text();

        expect(await saved.text()).not.toContain('sk-secret');
        expect(status).not.toContain('sk-secret');
        expect(
            JSON.parse(status).find((backend: { id: string }) => backend.id === 'anthropic'),
        ).toMatchObject({ hasKey: true, kind: 'api' });

        await send('DELETE', '/ai/credentials/anthropic');

        const after = (await (await send('GET', '/ai/status')).json()) as AiBackendStatus[];

        expect(after.find((backend) => backend.id === 'anthropic')?.hasKey).toBe(false);
    });

    it('lists a harness that is not installed as unavailable', async () => {
        const status = (await (await call('GET', '/ai/status')).json()) as AiBackendStatus[];

        expect(status.find((backend) => backend.id === 'codex-cli')).toMatchObject({
            available: false,
            kind: 'harness',
        });
    });
});

describe('POST /ai/enrich', () => {
    it('suggests only tags the item does not already carry', async () => {
        const itemId = workspace.current.itemByStem('oven-notes')?.id;

        reply = {
            summary: ' The oven overheats. ',
            tags: ['Kitchen', '#Appliances', 'appliances'],
        };

        const res = await call('POST', '/ai/enrich', {
            backend: 'stub',
            itemId,
            want: ['tags', 'summary'],
        });

        expect(await res.json()).toEqual({
            points: [],
            summary: 'The oven overheats.',
            tags: ['appliances'],
        });
    });

    it('answers only with what was asked for', async () => {
        reply = { summary: 'unwanted', tags: ['baking'], title: 'Bread log' };

        const res = await call('POST', '/ai/enrich', {
            backend: 'stub',
            text: 'autolyse for an hour',
            want: ['title'],
        });

        expect(await res.json()).toEqual({ title: 'Bread log' });
    });

    it('needs something to describe', async () => {
        const res = await call('POST', '/ai/enrich', { backend: 'stub', want: ['tags'] });

        expect(res.status).toBe(400);
    });
});
