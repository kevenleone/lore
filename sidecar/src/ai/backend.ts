import type { z } from 'zod';

import type { VaultStore } from '../index/store';

export interface AiBackend {
    chat(request: ChatRequest): AsyncIterable<AiEvent>;
    object<TOutput>(request: ObjectRequest<TOutput>): Promise<TOutput>;
}

export type AiEvent = { text: string; type: 'activity' } | { text: string; type: 'delta' };

export interface ChatMessage {
    role: 'ai' | 'user';
    text: string;
}

export interface ChatRequest {
    messages: ChatMessage[];
    signal: AbortSignal;
    store: VaultStore;
    system: string;
}

export interface ObjectRequest<TOutput> {
    prompt: string;
    schema: z.ZodType<TOutput>;
    signal: AbortSignal;
    system: string;
}

export class AiError extends Error {
    constructor(
        readonly code: 'failed' | 'not_configured',
        message: string,
    ) {
        super(message);
        this.name = 'AiError';
    }
}

/** A tool call as a line the chat can show while the answer is still coming. */
export function describeToolCall(name: string, input: unknown): string {
    const tool = name.replace(/^mcp__lore__|^lore_/, '');
    const fields = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
    const subject = (key: string): string => (typeof fields[key] === 'string' ? fields[key] : '');

    switch (tool) {
        case 'backlinks':
            return `Looking for links to ${subject('id')}`;
        case 'list_collections':
            return 'Listing collections';
        case 'list_tags':
            return 'Listing tags';
        case 'read_item':
            return `Reading ${subject('id')}`;
        case 'search':
            return `Searching “${subject('query')}”`;
        default:
            return `Using ${tool}`;
    }
}
