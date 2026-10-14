import type {
    AgentStatus,
    AiBackendStatus,
    AiEnrichField,
    AiEnrichment,
    ChatMessage,
    ChatSource,
    ConnectionTest,
} from '../store/types';

export type AgentPart = 'mcp' | 'skill';

export interface AiProvider {
    /** The command-line agents on this machine, and whether each is connected to the vault. */
    agents(): Promise<AgentStatus[]>;
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
    /** Rejects with a sentence to show when the agent refused. */
    setAgent(id: string, part: AgentPart, on: boolean): Promise<AgentStatus>;
    /** The key is written and never read back: `status` says only that one is stored. */
    setKey(provider: string, key: string, baseUrl?: string): Promise<void>;
    status(): Promise<AiBackendStatus[]>;
    /** Starts the server an agent has registered for the vault, as the agent would. */
    testAgent(id: string): Promise<ConnectionTest>;
    /** Asks the selected model a one-word question through the same path a chat takes. */
    testModel(selection: AiSelection): Promise<ConnectionTest>;
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
