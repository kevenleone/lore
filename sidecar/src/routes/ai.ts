import { Elysia } from 'elysia';

import type { AiService, BackendSelection } from '../ai/service';
import type { Workspace } from '../services/workspace';

import { AgentError, type Agents } from '../ai/agents';
import { chatResponse, parseMessages } from '../ai/chat';
import { enrich, itemText, parseWant } from '../ai/enrich';
import { probeModel } from '../ai/probe';

interface AiBody extends Partial<BackendSelection> {
    backend?: unknown;
    itemId?: unknown;
    key?: unknown;
    messages?: unknown;
    text?: unknown;
    want?: unknown;
}

export function aiRoutes(workspace: Workspace, ai: AiService, agents: Agents) {
    return (
        new Elysia()
            .get('/ai/status', () => ai.status())

            // The key goes in and never comes back out: `/ai/status` says only
            // whether one is stored.
            .post('/ai/credentials/:provider', async ({ body, params, set }) => {
                const { baseUrl, key } = (body ?? {}) as AiBody;

                if (typeof key !== 'string' || !key.trim()) {
                    set.status = 400;

                    return { error: 'key required' };
                }

                await ai.setKey(
                    params.provider,
                    key.trim(),
                    typeof baseUrl === 'string' ? baseUrl : undefined,
                );

                return { ok: true };
            })

            .delete('/ai/credentials/:provider', async ({ params }) => {
                await ai.clearKey(params.provider);

                return { ok: true };
            })

            .get('/ai/agents', () => agents.list(workspace.current.vault.root))

            .post('/ai/test', async ({ body }) => {
                const input = (body ?? {}) as AiBody;

                return probeModel(() => ai.backend(selection(input)), workspace.current);
            })

            .post('/ai/agents/:id/:part', async ({ body, params, set }) => {
                const { on } = (body ?? {}) as { on?: unknown };
                const vault = workspace.current.vault.root;

                try {
                    if (params.part === 'test') {
                        return await agents.test(params.id);
                    }

                    if (params.part === 'mcp' && typeof on === 'boolean') {
                        return await agents.setMcp(params.id, vault, on);
                    }

                    if (params.part === 'skill' && typeof on === 'boolean') {
                        return await agents.setSkill(params.id, vault, on);
                    }
                } catch (error) {
                    if (!(error instanceof AgentError)) {
                        throw error;
                    }

                    set.status = 400;

                    return { error: error.message };
                }

                set.status = 400;

                return {
                    error: 'part must be mcp, skill or test, with on a boolean for the first two',
                };
            })

            .post('/ai/chat', async ({ body, set }) => {
                const input = (body ?? {}) as AiBody;
                const messages = parseMessages(input.messages);

                if (!messages) {
                    set.status = 400;

                    return { error: 'messages must end with a question from the user' };
                }

                const store = workspace.current;

                return chatResponse(await ai.backend(selection(input)), store, messages);
            })

            .post('/ai/enrich', async ({ body, request, set }) => {
                const input = (body ?? {}) as AiBody;
                const store = workspace.current;
                const item = typeof input.itemId === 'string' ? store.getItem(input.itemId) : null;
                const text = item ? itemText(item) : input.text;
                const want = parseWant(input.want);

                if (typeof text !== 'string' || !text.trim() || want.length === 0) {
                    set.status = 400;

                    return { error: 'text or itemId, and want, are required' };
                }

                return enrich(
                    await ai.backend(selection(input)),
                    store,
                    { item: item ?? undefined, text, want },
                    request.signal,
                );
            })
    );
}

function selection(body: AiBody): BackendSelection {
    return {
        baseUrl: typeof body.baseUrl === 'string' ? body.baseUrl : undefined,
        id: typeof body.backend === 'string' ? body.backend : '',
        model: typeof body.model === 'string' ? body.model : undefined,
    };
}
