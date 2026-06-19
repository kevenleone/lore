// Deterministic, offline Ai provider. Exercises the full AI UI (summaries,
// suggested tags, Ask Balloon with Sources chips) without any API key or
// network. A real claudeAiProvider drops in behind the same interface later.

import type { Item, ItemType } from "../store/types";
import type { AiProvider, ChatResult, SummaryResult } from "./aiProvider";

const URL_RE = /^https?:\/\/\S+$/i;
const FENCE_RE = /```|^\s{4}\S|;\s*$|=>|function\s|const\s|=\s*\(/m;
const TASK_RE = /^\s*(\[ \]|- \[ \]|todo:|follow up|remind|review|send|call|email)\b/i;
const IMAGE_RE = /\.(png|jpe?g|gif|webp|heic|svg)(\?|$)/i;

export class MockAiProvider implements AiProvider {
  async detectType(input: string): Promise<ItemType> {
    const text = input.trim();
    if (IMAGE_RE.test(text)) return "image";
    if (URL_RE.test(text)) return "link";
    if (TASK_RE.test(text)) return "task";
    if (FENCE_RE.test(text)) return "code";
    return "note";
  }

  async summarize(item: Item): Promise<SummaryResult> {
    if (item.summary) {
      return { summary: item.summary, points: item.points ?? [] };
    }
    const subject = item.title || item.domain || "this item";
    return {
      summary: `A saved ${item.type} about ${subject}.`,
      points: [],
    };
  }

  async suggestTags(_item: Item): Promise<string[]> {
    // The stub provider can't infer meaningful tags, so it suggests none.
    // A real Claude-backed provider would return relevant tags here.
    return [];
  }

  async chat(question: string, kb: Item[]): Promise<ChatResult> {
    const words = question
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3);

    const scored = kb
      .map((item) => {
        const hay = `${item.title} ${item.tags.join(" ")} ${item.summary ?? ""}`.toLowerCase();
        const score = words.reduce((n, w) => (hay.includes(w) ? n + 1 : n), 0);
        return { item, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length === 0) {
      return {
        text: "I couldn't find anything in your knowledge base about that yet. Try capturing a few related links or notes.",
        sources: [],
      };
    }

    const titles = scored.map((s) => `“${s.item.title}”`);
    const list =
      titles.length === 1
        ? titles[0]
        : `${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]}`;

    return {
      text: `Based on what you've saved, ${list} ${scored.length === 1 ? "is" : "are"} most relevant here.`,
      sources: scored.map((s) => ({ itemId: s.item.id })),
    };
  }
}
