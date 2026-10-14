import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { AiBackend, AiEvent } from '../src/ai/backend';

import { AiError } from '../src/ai/backend';
import { engineLaunch } from '../src/ai/launch';
import { probeModel, probeServer } from '../src/ai/probe';
import { VaultStore } from '../src/index/store';

let root: string;
let store: VaultStore;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-probe-'));
    await writeFile(join(root, 'oven-notes.md'), '---\ntitle: Oven notes\n---\n\nRuns hot.\n');
    store = await VaultStore.open(root);
});

afterEach(async () => {
    store.close();
    await rm(root, { force: true, recursive: true });
});

function answering(...events: AiEvent[]): () => Promise<AiBackend> {
    return async () => ({
        async *chat() {
            yield* events;
        },
        object: () => Promise.reject(new Error('unused')),
    });
}

describe('testing the model', () => {
    it('passes when the model answers, and shows what it said', async () => {
        const result = await probeModel(
            answering({ text: 'Searching', type: 'activity' }, { text: ' OK ', type: 'delta' }),
            store,
        );

        expect(result).toMatchObject({ detail: 'OK', ok: true });
    });

    it('fails on silence, a refusal, or no answer in time', async () => {
        expect(await probeModel(answering(), store)).toMatchObject({
            detail: 'The model answered with nothing.',
            ok: false,
        });

        const missing = async (): Promise<AiBackend> => {
            throw new AiError('not_configured', 'Add an API key first.');
        };

        expect(await probeModel(missing, store)).toMatchObject({
            detail: 'Add an API key first.',
            ok: false,
        });

        const stalled = async (): Promise<AiBackend> => ({
            async *chat() {
                yield await new Promise<AiEvent>(() => undefined);
            },
            object: () => Promise.reject(new Error('unused')),
        });

        expect(await probeModel(stalled, store, 50)).toMatchObject({ ok: false });
    });
});

describe('testing a registered server', () => {
    it('starts the engine as the agent would and lists its tools', async () => {
        const result = await probeServer(engineLaunch(root, { readOnly: false }));

        expect(result).toMatchObject({ detail: '8 tools', ok: true });
    }, 30_000);

    it('fails when the command is not there', async () => {
        const result = await probeServer({ args: [], command: join(root, 'gone'), env: {} });

        expect(result.ok).toBe(false);
    });
});
