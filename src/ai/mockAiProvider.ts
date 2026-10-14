import type {
    AgentStatus,
    AiBackendStatus,
    AiEnrichment,
    ChatSource,
    ConnectionTest,
    Item,
} from '../store/types';
import type { AiProvider } from './aiProvider';

// What backs the UI where there is no data engine: the browser preview and the
// tests. It names the saved items a question's words appear in, and proposes
// nothing, so nothing it says can be mistaken for a model's judgement.
export class MockAiProvider implements AiProvider {
    readonly needsSetup = false;

    constructor(private readonly items: () => Item[] | Promise<Item[]>) {}

    async agents(): Promise<AgentStatus[]> {
        return [];
    }

    async chat(...[messages, , handlers]: Parameters<AiProvider['chat']>): Promise<ChatSource[]> {
        const question = messages[messages.length - 1]?.text ?? '';
        const words = question
            .toLowerCase()
            .split(/\W+/)
            .filter((word) => word.length > 3);
        const scored = (await this.items())
            .map((item) => {
                const haystack =
                    `${item.title} ${item.tags.join(' ')} ${item.summary ?? ''}`.toLowerCase();

                return {
                    item,
                    score: words.filter((word) => haystack.includes(word)).length,
                };
            })
            .filter((entry) => entry.score > 0)
            .sort((left, right) => right.score - left.score)
            .slice(0, 3);

        if (scored.length === 0) {
            handlers.onDelta(
                "I couldn't find anything in your knowledge base about that yet. Try capturing a few related links or notes.",
            );

            return [];
        }

        const titles = scored.map((entry) => `“${entry.item.title}”`);
        const list =
            titles.length === 1
                ? titles[0]
                : `${titles.slice(0, -1).join(', ')} and ${titles[titles.length - 1]}`;
        const verb = scored.length === 1 ? 'is' : 'are';

        handlers.onDelta(`Based on what you've saved, ${list} ${verb} most relevant here.`);

        return scored.map((entry) => ({ itemId: entry.item.id }));
    }

    async clearKey(): Promise<void> {}

    async enrich(): Promise<AiEnrichment> {
        return {};
    }

    async setAgent(): Promise<AgentStatus> {
        throw new Error('Agents are connected from the desktop app.');
    }

    async setKey(): Promise<void> {}

    async status(): Promise<AiBackendStatus[]> {
        return [];
    }

    async testAgent(): Promise<ConnectionTest> {
        throw new Error('Agents are connected from the desktop app.');
    }

    async testModel(): Promise<ConnectionTest> {
        return { detail: 'This preview answers by itself.', ms: 0, ok: true };
    }
}
