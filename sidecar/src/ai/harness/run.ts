import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Harness, HarnessOptions } from './types';

import { AiError, type AiEvent } from '../backend';
import { searchPath } from '../detect';

const STDERR_TAIL = 400;

export async function* runHarness(
    harness: Harness,
    binary: string,
    options: Omit<HarnessOptions, 'workdir'>,
    signal: AbortSignal,
): AsyncGenerator<AiEvent> {
    const workdir = await mkdtemp(join(tmpdir(), 'lore-ai-'));
    const invocation = harness.invoke({ ...options, workdir });
    const child = Bun.spawn([binary, ...invocation.args], {
        cwd: workdir,
        env: childEnv(invocation.env),
        stderr: 'pipe',
        stdin: invocation.stdin === undefined ? 'ignore' : new Blob([invocation.stdin]),
        stdout: 'pipe',
    });
    const stop = (): void => child.kill();
    const stderr = new Response(child.stderr).text();
    const parser = harness.createParser();

    signal.addEventListener('abort', stop, { once: true });

    if (signal.aborted) {
        stop();
    }

    try {
        for await (const line of lines(child.stdout)) {
            const event = parse(line);

            if (event) {
                yield* parser.push(event);
            }
        }

        const code = await child.exited;

        if (signal.aborted) {
            return;
        }

        if (code !== 0) {
            const detail = (await stderr).trim().slice(-STDERR_TAIL);

            throw new AiError('failed', detail || `${harness.label} exited with code ${code}.`);
        }

        yield* parser.finish();
    } finally {
        signal.removeEventListener('abort', stop);
        child.kill();
        await rm(workdir, { force: true, recursive: true });
    }
}

// The engine's own bearer token is in its environment, and a tool that runs
// model-chosen commands must not inherit it.
function childEnv(extra: Record<string, string> = {}): Record<string, string> {
    const env: Record<string, string> = {};

    for (const [key, value] of Object.entries(Bun.env)) {
        if (value !== undefined && !key.startsWith('LORE_')) {
            env[key] = value;
        }
    }

    return { ...env, PATH: searchPath(), ...extra };
}

async function* lines(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
    const decoder = new TextDecoder();
    let pending = '';

    for await (const chunk of stream) {
        pending += decoder.decode(chunk, { stream: true });

        const parts = pending.split('\n');

        pending = parts.pop() ?? '';
        yield* parts;
    }

    if (pending) {
        yield pending;
    }
}

function parse(line: string): null | Record<string, unknown> {
    try {
        const value: unknown = JSON.parse(line);

        return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}
