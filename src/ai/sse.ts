export interface ServerEvent {
    data: unknown;
    event: string;
}

/** A `fetch` body read as server-sent events; `EventSource` cannot POST. */
export async function* readServerEvents(
    body: ReadableStream<Uint8Array>,
): AsyncGenerator<ServerEvent> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let pending = '';

    try {
        for (;;) {
            const { done, value } = await reader.read();

            pending += decoder.decode(value, { stream: !done });

            const blocks = pending.split('\n\n');

            // A chunk may end mid-event; the remainder waits for the next one.
            pending = done ? '' : (blocks.pop() ?? '');

            for (const block of blocks) {
                const event = parseBlock(block);

                if (event) {
                    yield event;
                }
            }

            if (done) {
                return;
            }
        }
    } finally {
        reader.releaseLock();
    }
}

function parseBlock(block: string): null | ServerEvent {
    let event = 'message';
    const data: string[] = [];

    for (const line of block.split('\n')) {
        if (line.startsWith('event:')) {
            event = line.slice(6).trim();
        }

        if (line.startsWith('data:')) {
            data.push(line.slice(5).trimStart());
        }
    }

    if (data.length === 0) {
        return null;
    }

    try {
        return { data: JSON.parse(data.join('\n')), event };
    } catch {
        return null;
    }
}
