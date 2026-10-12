import type { AiBackendStatus, AiEnrichment, ChatSource } from '../store/types';
import type { AiProvider, AiSelection, ChatHandlers, ChatTurn, EnrichRequest } from './aiProvider';

interface Asked {
    messages: ChatTurn[];
    selection: AiSelection;
}

/** A provider a test drives by hand: it answers only when told to. */
export class FakeAi implements AiProvider {
    asked: Asked[] = [];
    backends: AiBackendStatus[] = [];
    endpoints = new Map<string, string | undefined>();
    enriched: EnrichRequest[] = [];
    keys = new Map<string, string>();
    readonly needsSetup = true;
    proposal: AiEnrichment | Promise<AiEnrichment> = {};

    private finish: ((sources: ChatSource[]) => void) | null = null;
    private handlers: ChatHandlers | null = null;
    private reject: ((error: Error) => void) | null = null;

    activity(text: string): void {
        this.handlers?.onActivity(text);
    }

    chat(
        ...[messages, selection, handlers, signal]: Parameters<AiProvider['chat']>
    ): Promise<ChatSource[]> {
        this.asked.push({ messages: [...messages], selection });
        this.handlers = handlers;

        return new Promise((resolve, reject) => {
            this.finish = resolve;
            this.reject = reject;
            signal.addEventListener('abort', () => reject(new Error('aborted')));
        });
    }

    async clearKey(provider: string): Promise<void> {
        this.keys.delete(provider);
        this.backends = this.backends.map((backend) =>
            backend.id === provider ? { ...backend, hasKey: false } : backend,
        );
    }

    delta(text: string): void {
        this.handlers?.onDelta(text);
    }

    done(sources: ChatSource[] = []): void {
        this.finish?.(sources);
    }

    async enrich(request: EnrichRequest): Promise<AiEnrichment> {
        this.enriched.push(request);

        return this.proposal;
    }

    fail(message: string): void {
        this.reject?.(new Error(message));
    }

    async setKey(provider: string, key: string, baseUrl?: string): Promise<void> {
        this.endpoints.set(provider, baseUrl);
        this.keys.set(provider, key);
        this.backends = this.backends.map((backend) =>
            backend.id === provider ? { ...backend, hasKey: true } : backend,
        );
    }

    async status(): Promise<AiBackendStatus[]> {
        return this.backends;
    }
}
