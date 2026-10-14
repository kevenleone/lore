import { Elysia } from 'elysia';

import type { Workspace } from '../services/workspace';

import {
    deleteChat,
    isThreadId,
    listChats,
    parseThread,
    readChat,
    writeChat,
} from '../services/chats';

export function chatRoutes(workspace: Workspace) {
    return new Elysia()
        .get('/chats', () => listChats(workspace.current.vault))

        .get('/chats/:id', async ({ params, set }) => {
            const thread = isThreadId(params.id)
                ? await readChat(workspace.current.vault, params.id)
                : null;

            if (!thread) {
                set.status = 404;

                return { error: 'not_found' };
            }

            return thread;
        })

        .post('/chats/:id', async ({ body, params, set }) => {
            const thread = isThreadId(params.id) ? parseThread(params.id, body) : null;

            if (!thread) {
                set.status = 400;

                return { error: 'a conversation needs an id and at least one message' };
            }

            await writeChat(workspace.current.vault, thread);

            return thread;
        })

        .delete('/chats/:id', async ({ params, set }) => {
            if (!isThreadId(params.id)) {
                set.status = 400;

                return { error: 'bad id' };
            }

            await deleteChat(workspace.current.vault, params.id);

            return { ok: true };
        });
}
