import { describe, expect, it } from 'vitest';

import { readServerEvents, type ServerEvent } from './sse';

async function collect(chunks: readonly string[]): Promise<ServerEvent[]> {
    const events: ServerEvent[] = [];

    for await (const event of readServerEvents(streamOf(chunks))) {
        events.push(event);
    }

    return events;
}

function streamOf(chunks: readonly string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();

    return new ReadableStream({
        start(controller) {
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
            }

            controller.close();
        },
    });
}

describe('readServerEvents', () => {
    it('reads one event per block', async () => {
        expect(
            await collect(['event: delta\ndata: {"text":"a"}\n\nevent: done\ndata: {}\n\n']),
        ).toEqual([
            { data: { text: 'a' }, event: 'delta' },
            { data: {}, event: 'done' },
        ]);
    });

    it('joins an event that arrives split across chunks', async () => {
        expect(await collect(['event: del', 'ta\ndata: {"te', 'xt":"héllo"}\n', '\n'])).toEqual([
            { data: { text: 'héllo' }, event: 'delta' },
        ]);
    });

    it('skips keepalive comments and anything that is not JSON', async () => {
        expect(await collect([': keepalive\n\n', 'event: delta\ndata: nope\n\n'])).toEqual([]);
    });
});
