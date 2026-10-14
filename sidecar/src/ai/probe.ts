import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import type { VaultStore } from '../index/store';
import type { AiBackend } from './backend';
import type { McpLaunch } from './harness/types';

import { version } from '../../package.json';

export interface ProbeResult {
    detail: string;
    ms: number;
    ok: boolean;
}

// A command-line agent starts, signs in and loads its tools before it answers.
const MODEL_TIMEOUT_MS = 90_000;
const SERVER_TIMEOUT_MS = 20_000;
const REPLY_PREVIEW = 80;

/** Asks the model the smallest question there is, through the same path a chat takes. */
export async function probeModel(
    backend: () => Promise<AiBackend>,
    store: VaultStore,
    timeoutMs = MODEL_TIMEOUT_MS,
): Promise<ProbeResult> {
    const started = performance.now();
    const signal = AbortSignal.timeout(timeoutMs);

    return attempt(started, timeoutMs, async () => {
        let reply = '';

        for await (const event of (await backend()).chat({
            messages: [{ role: 'user', text: 'Reply with the single word OK.' }],
            signal,
            store,
            system: 'You are checking that a connection works. Answer in one word.',
        })) {
            if (event.type === 'delta') {
                reply += event.text;
            }
        }

        const text = reply.trim().replace(/\s+/g, ' ');

        if (!text) {
            throw new Error('The model answered with nothing.');
        }

        return text.length > REPLY_PREVIEW ? `${text.slice(0, REPLY_PREVIEW)}…` : text;
    });
}

/** Starts the server exactly as the agent would, and lists its tools. */
export async function probeServer(
    launch: McpLaunch,
    timeoutMs = SERVER_TIMEOUT_MS,
): Promise<ProbeResult> {
    const started = performance.now();
    const client = new Client({ name: 'lore-settings', version });
    const transport = new StdioClientTransport({
        args: launch.args,
        command: launch.command,
        env: launch.env,
        stderr: 'ignore',
    });

    try {
        return await attempt(started, timeoutMs, async () => {
            await client.connect(transport);

            const { tools } = await client.listTools();

            return `${tools.length} tools`;
        });
    } finally {
        await client.close().catch(() => undefined);
    }
}

async function attempt(
    started: number,
    timeoutMs: number,
    work: () => Promise<string>,
): Promise<ProbeResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
            () => reject(new Error(`No answer after ${Math.round(timeoutMs / 1000)} seconds.`)),
            timeoutMs,
        );
    });

    try {
        const detail = await Promise.race([work(), timeout]);

        return { detail, ms: Math.round(performance.now() - started), ok: true };
    } catch (error) {
        return {
            detail: error instanceof Error ? error.message : String(error),
            ms: Math.round(performance.now() - started),
            ok: false,
        };
    } finally {
        clearTimeout(timer);
    }
}
