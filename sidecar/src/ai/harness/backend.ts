import { fileURLToPath } from 'node:url';

import type { Harness, McpLaunch } from './types';

import { type AiBackend, AiError } from '../backend';
import { conversationPrompt } from '../prompts';
import { claude } from './claude';
import { codex } from './codex';
import { opencode } from './opencode';
import { runHarness } from './run';

export const HARNESSES: readonly Harness[] = [claude, codex, opencode];

/** The object in a reply that may have wrapped it in prose or a code fence. */
export function extractJson(reply: string): unknown {
    const start = reply.indexOf('{');
    const end = reply.lastIndexOf('}');

    if (start === -1 || end <= start) {
        throw new AiError('failed', 'The model did not answer with JSON.');
    }

    try {
        return JSON.parse(reply.slice(start, end + 1));
    } catch {
        throw new AiError('failed', 'The model answered with JSON that does not parse.');
    }
}

export function harnessBackend(harness: Harness, binary: string, model?: string): AiBackend {
    return {
        chat({ messages, signal, store, system }) {
            return runHarness(
                harness,
                binary,
                {
                    mcp: selfLaunch(store.vault.root),
                    model,
                    prompt: conversationPrompt(messages),
                    system,
                },
                signal,
            );
        },
        async object({ prompt, schema, signal, system }) {
            let reply = '';

            for await (const event of runHarness(
                harness,
                binary,
                { model, prompt, system },
                signal,
            )) {
                if (event.type === 'delta') {
                    reply += event.text;
                }
            }

            const parsed = schema.safeParse(extractJson(reply));

            if (!parsed.success) {
                throw new AiError('failed', 'The model answered in an unexpected shape.');
            }

            return parsed.data;
        },
    };
}

/**
 * How to start this same engine as an MCP server. A compiled build is its own
 * executable; under `bun src/index.ts` the executable is Bun and the entry
 * point has to be named.
 *
 * `Bun.main` is what tells the two apart: a bytecode build keeps the source
 * path in `import.meta.url`, so that alone looks the same in both.
 */
function selfLaunch(vault: string): McpLaunch {
    const compiled = Bun.main.includes('$bunfs') || Bun.main.includes('~BUN');
    const entry = fileURLToPath(new URL('../../index.ts', import.meta.url));

    return {
        args: compiled ? ['mcp'] : [entry, 'mcp'],
        command: process.execPath,
        // Read-only: a question must never be able to change the vault.
        env: { LORE_MCP_READONLY: '1', LORE_VAULT: vault },
    };
}
