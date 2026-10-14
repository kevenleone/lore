import type { Harness } from './types';

import { type AiBackend, AiError } from '../backend';
import { engineLaunch } from '../launch';
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
                    // Read-only: a question must never be able to change the vault.
                    mcp: engineLaunch(store.vault.root, { readOnly: true }),
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
