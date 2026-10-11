import type {
    AiBackendStatus,
    AiEnrichField,
    AiEnrichment,
    ChatMessage,
    ChatSource,
} from '../store/types';

export interface AiProvider {
    /** Resolves with the items the finished answer cites. Rejects when it fails. */
    chat(
        messages: readonly ChatTurn[],
        selection: AiSelection,
        handlers: ChatHandlers,
        signal: AbortSignal,
    ): Promise<ChatSource[]>;
    clearKey(provider: string): Promise<void>;
    enrich(
        request: EnrichRequest,
        selection: AiSelection,
        signal?: AbortSignal,
    ): Promise<AiEnrichment>;
    /**
     * False for a provider that answers by itself, so the UI has nothing to send
     * the user to Settings for.
     */
    readonly needsSetup: boolean;
    /** The key is written and never read back: `status` says only that one is stored. */
    setKey(provider: string, key: string): Promise<void>;
    status(): Promise<AiBackendStatus[]>;
}

export interface AiSelection {
    backend: string;
    baseUrl?: string;
    model?: string;
}

export interface ChatHandlers {
    onActivity(text: string): void;
    onDelta(text: string): void;
}

export type ChatTurn = Pick<ChatMessage, 'role' | 'text'>;

export interface EnrichRequest {
    itemId?: string;
    text?: string;
    want: AiEnrichField[];
}
