import type {
    AgentStatus,
    AiBackendStatus,
    AiEnrichment,
    ChatSource,
    ConnectionTest,
} from '../store/types';
import type { AgentPart, AiProvider, AiSelection } from './aiProvider';

import { request, send } from '../data/sidecarClient';
import { readServerEvents } from './sse';

// The model, its key and the vault all live in the data engine. Nothing here
// holds a credential: the renderer is not trusted with one.
export class EngineAiProvider implements AiProvider {
    readonly needsSetup = true;

    agents(): Promise<AgentStatus[]> {
        return request<AgentStatus[]>('/ai/agents');
    }

    async chat(
        ...[messages, selection, handlers, signal]: Parameters<AiProvider['chat']>
    ): Promise<ChatSource[]> {
        const response = await send('/ai/chat', {
            body: JSON.stringify({ ...selection, messages }),
            method: 'POST',
            signal,
        });

        if (!response.body) {
            throw new Error('The data engine sent no answer.');
        }

        let sources: ChatSource[] = [];

        for await (const { data, event } of readServerEvents(response.body)) {
            const text = field(data, 'text');

            if (event === 'delta' && typeof text === 'string') {
                handlers.onDelta(text);
            }

            if (event === 'activity' && typeof text === 'string') {
                handlers.onActivity(text);
            }

            if (event === 'sources') {
                sources = (field(data, 'sources') as ChatSource[] | undefined) ?? [];
            }

            if (event === 'error') {
                throw new Error(String(field(data, 'message') ?? 'The model failed.'));
            }
        }

        return sources;
    }

    async clearKey(provider: string): Promise<void> {
        await request(`/ai/credentials/${encodeURIComponent(provider)}`, { method: 'DELETE' });
    }

    enrich(
        ...[enrichment, selection, signal]: Parameters<AiProvider['enrich']>
    ): Promise<AiEnrichment> {
        return request<AiEnrichment>('/ai/enrich', {
            body: JSON.stringify({ ...selection, ...enrichment }),
            method: 'POST',
            signal,
        });
    }

    setAgent(id: string, part: AgentPart, on: boolean): Promise<AgentStatus> {
        return request<AgentStatus>(`/ai/agents/${encodeURIComponent(id)}/${part}`, {
            body: JSON.stringify({ on }),
            method: 'POST',
        });
    }

    async setKey(provider: string, key: string, baseUrl?: string): Promise<void> {
        await request(`/ai/credentials/${encodeURIComponent(provider)}`, {
            body: JSON.stringify({ baseUrl, key }),
            method: 'POST',
        });
    }

    status(): Promise<AiBackendStatus[]> {
        return request<AiBackendStatus[]>('/ai/status');
    }

    testAgent(id: string): Promise<ConnectionTest> {
        return request<ConnectionTest>(`/ai/agents/${encodeURIComponent(id)}/test`, {
            method: 'POST',
        });
    }

    testModel(selection: AiSelection): Promise<ConnectionTest> {
        return request<ConnectionTest>('/ai/test', {
            body: JSON.stringify(selection),
            method: 'POST',
        });
    }
}

function field(data: unknown, key: string): unknown {
    return data && typeof data === 'object' ? (data as Record<string, unknown>)[key] : undefined;
}
