import { Elysia } from 'elysia';

import type { Workspace } from '../services/workspace';

export function eventRoutes(workspace: Workspace) {
    return (
        new Elysia()
            /**
             * SSE rather than a WebSocket: the traffic is strictly one-directional,
             * and EventSource reconnects on its own, which is exactly the behaviour
             * wanted when the sidecar restarts.
             */
            .get('/events', () => {
                let unsubscribe: (() => void) | undefined;
                let keepalive: ReturnType<typeof setInterval> | undefined;

                const stream = new ReadableStream({
                    cancel() {
                        unsubscribe?.();

                        if (keepalive) {
                            clearInterval(keepalive);
                        }
                    },
                    start(controller) {
                        const send = (event: string, data: unknown) => {
                            try {
                                controller.enqueue(
                                    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
                                );
                            } catch {
                                // Client went away mid-write; cleanup happens in cancel().
                            }
                        };

                        send('ready', { ok: true });
                        unsubscribe = workspace.subscribe((paths) => send('changed', { paths }));
                        // Proxies and idle timeouts drop a silent stream; a comment keeps it warm.
                        keepalive = setInterval(() => {
                            try {
                                controller.enqueue(': keepalive\n\n');
                            } catch {
                                /* closed */
                            }
                        }, 25_000);
                    },
                });

                return new Response(stream, {
                    headers: {
                        'Cache-Control': 'no-cache',
                        Connection: 'keep-alive',
                        'Content-Type': 'text/event-stream',
                    },
                });
            })
    );
}
