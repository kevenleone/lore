// The AI seam. All AI features (type detection, summaries, tag suggestions,
// Ask Lore chat) go through this interface, so a real Claude-backed provider
// can replace the deterministic mock with no UI changes.

import type { ChatSource, Item, ItemType } from '../store/types';

export interface AiProvider {
    /** Answer a question grounded in the knowledge base, citing sources. */
    chat(question: string, kb: Item[]): Promise<ChatResult>;
    /** Direction A: infer the item type from raw captured input. */
    detectType(input: string): Promise<ItemType>;
    /** Suggest tags for an item. */
    suggestTags(item: Item): Promise<string[]>;
    /** Summarize an item (optionally with fetched page content). */
    summarize(item: Item, content?: string): Promise<SummaryResult>;
}

export interface ChatResult {
    sources: ChatSource[];
    text: string;
}

export interface SummaryResult {
    points: string[];
    summary: string;
}
