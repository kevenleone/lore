import type { ChatSource } from '@lore/types';

import type { VaultStore } from '../index/store';
import type { AiBackend, ChatMessage } from './backend';

import { bodyWikilinks, parseWikilink } from '../links';
import { ASK_LORE_SYSTEM } from './prompts';

/** The answer as server-sent events: `delta`, `activity`, then `sources` and `done`, or `error`. */
export function chatResponse(
    backend: AiBackend,
    store: VaultStore,
    messages: ChatMessage[],
): Response {
    const abort = new AbortController();
    const stream = new ReadableStream({
        cancel() {
            abort.abort();
        },
        async start(controller) {
            const send = (event: string, data: unknown): void => {
                try {
                    controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
                } catch {
                    // The reader left; `cancel` has already stopped the model.
                }
            };

            let answer = '';

            try {
                for await (const event of backend.chat({
                    messages,
                    signal: abort.signal,
                    store,
                    system: ASK_LORE_SYSTEM,
                })) {
                    if (event.type === 'delta') {
                        answer += event.text;
                    }

                    send(event.type, { text: event.text });
                }

                send('sources', { sources: citedSources(store, answer) });
                send('done', {});
            } catch (error) {
                if (!abort.signal.aborted) {
                    send('error', {
                        message: error instanceof Error ? error.message : 'The model failed.',
                    });
                }
            }

            try {
                controller.close();
            } catch {
                // Already closed by the reader.
            }
        },
    });

    return new Response(stream, {
        headers: { 'Cache-Control': 'no-cache', 'Content-Type': 'text/event-stream' },
    });
}

/** The items an answer cites, in the order it cites them. */
export function citedSources(store: VaultStore, answer: string): ChatSource[] {
    const ids: string[] = [];

    for (const link of bodyWikilinks(answer)) {
        const target = parseWikilink(link);
        const item = store.itemByStem(target) ?? store.getItem(target);

        if (item && !ids.includes(item.id)) {
            ids.push(item.id);
        }
    }

    return ids.map((itemId) => ({ itemId }));
}

export function parseMessages(value: unknown): ChatMessage[] | null {
    if (!Array.isArray(value) || value.length === 0) {
        return null;
    }

    const messages: ChatMessage[] = [];

    for (const entry of value) {
        const { role, text } = (entry ?? {}) as Partial<ChatMessage>;

        if ((role !== 'ai' && role !== 'user') || typeof text !== 'string' || !text.trim()) {
            return null;
        }

        messages.push({ role, text });
    }

    return messages[messages.length - 1].role === 'user' ? messages : null;
}
