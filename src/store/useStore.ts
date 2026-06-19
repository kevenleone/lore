// Global app state (Zustand). UI state lives here; data is hydrated from the
// active KnowledgeRepository and refreshed after mutations. Selectors in
// views.ts derive everything the components render from `items`/`collections`.

import { create } from "zustand";
import { getRepository } from "../data";
import type { ItemPatch, NewItem } from "../data/repository";
import { MockAiProvider } from "../ai/mockAiProvider";
import type { AiProvider } from "../ai/aiProvider";
import { SEED_CHAT } from "./seed";
import {
  DEFAULT_ACCENT,
  type Accent,
  type ChatMessage,
  type Collection,
  type Item,
  type View,
} from "./types";

const ai: AiProvider = new MockAiProvider();

interface StoreState {
  // data
  items: Item[];
  collections: Collection[];
  chat: ChatMessage[];
  hydrated: boolean;

  // ui
  view: View;
  selectedId: string | null;
  chatOpen: boolean;
  accent: Accent;
  aiAssist: boolean;
  search: string;
  sidebarVisible: boolean;

  // lifecycle
  hydrate: () => Promise<void>;

  // ui actions
  selectView: (kind: View["kind"], val?: string | null) => void;
  selectItem: (id: string) => void;
  toggleChat: () => void;
  setAccent: (accent: Accent) => void;
  setAiAssist: (on: boolean) => void;
  setSearch: (q: string) => void;
  toggleSidebar: () => void;
  sendChat: (question: string) => Promise<void>;

  // data actions
  refresh: () => Promise<void>;
  createItem: (input: NewItem) => Promise<Item>;
  updateItem: (id: string, patch: ItemPatch) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  items: [],
  collections: [],
  chat: SEED_CHAT,
  hydrated: false,

  view: { kind: "all", val: null },
  selectedId: "i1",
  chatOpen: false,
  accent: DEFAULT_ACCENT,
  aiAssist: true,
  search: "",
  sidebarVisible: true,

  async hydrate() {
    const repo = getRepository();
    const [items, collections] = await Promise.all([
      repo.listItems(),
      repo.listCollections(),
    ]);
    const selectedId =
      items.find((i) => i.id === get().selectedId)?.id ?? items[0]?.id ?? null;
    set({ items, collections, selectedId, hydrated: true });
  },

  selectView(kind, val = null) {
    set({ view: { kind, val }, chatOpen: false });
  },
  selectItem(id) {
    set({ selectedId: id, chatOpen: false });
  },
  toggleChat() {
    set((s) => ({ chatOpen: !s.chatOpen }));
  },
  setAccent(accent) {
    set({ accent });
  },
  setAiAssist(on) {
    set({ aiAssist: on });
  },
  setSearch(q) {
    set({ search: q });
  },
  toggleSidebar() {
    set((s) => ({ sidebarVisible: !s.sidebarVisible }));
  },

  async sendChat(question) {
    const text = question.trim();
    if (!text) return;
    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: "user", text };
    set((s) => ({ chat: [...s.chat, userMsg] }));
    const result = await ai.chat(text, get().items);
    const aiMsg: ChatMessage = {
      id: `a_${Date.now()}`,
      role: "ai",
      text: result.text,
      sources: result.sources,
    };
    set((s) => ({ chat: [...s.chat, aiMsg] }));
  },

  async refresh() {
    const repo = getRepository();
    const [items, collections] = await Promise.all([
      repo.listItems(),
      repo.listCollections(),
    ]);
    set({ items, collections });
  },

  async createItem(input) {
    const item = await getRepository().createItem(input);
    await get().refresh();
    set({ selectedId: item.id });
    return item;
  },

  async updateItem(id, patch) {
    await getRepository().updateItem(id, patch);
    await get().refresh();
  },

  async deleteItem(id) {
    await getRepository().deleteItem(id);
    await get().refresh();
    if (get().selectedId === id) {
      set({ selectedId: get().items[0]?.id ?? null });
    }
  },
}));
