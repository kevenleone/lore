// The AI seam. All AI features (type detection, summaries, tag suggestions,
// Ask Balloon chat) go through this interface, so a real Claude-backed provider
// can replace the deterministic mock with no UI changes.

import type { ChatSource, Item, ItemType } from "../store/types";

export interface SummaryResult {
  summary: string;
  points: string[];
}

export interface ChatResult {
  text: string;
  sources: ChatSource[];
}

export interface AiProvider {
  /** Direction A: infer the item type from raw captured input. */
  detectType(input: string): Promise<ItemType>;
  /** Summarize an item (optionally with fetched page content). */
  summarize(item: Item, content?: string): Promise<SummaryResult>;
  /** Suggest tags for an item. */
  suggestTags(item: Item): Promise<string[]>;
  /** Answer a question grounded in the knowledge base, citing sources. */
  chat(question: string, kb: Item[]): Promise<ChatResult>;
}
