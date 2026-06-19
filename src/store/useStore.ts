// Global app state (Zustand). UI state lives here; data is hydrated from the
// active KnowledgeRepository and refreshed after mutations. Selectors in
// views.ts derive everything the components render from `items`/`collections`.

import { create } from "zustand";
import { getRepository } from "../data";
import type { CollectionPatch, ItemPatch, NewCollection, NewItem } from "../data/repository";
import { MockAiProvider } from "../ai/mockAiProvider";
import type { AiProvider } from "../ai/aiProvider";
import { SEED_CHAT } from "./seed";
import {
  DEFAULT_ACCENT,
  type Accent,
  type ChatMessage,
  type Collection,
  type Item,
  type SortOrder,
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
  sort: SortOrder;

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
  setSort: (sort: SortOrder) => void;
  sendChat: (question: string) => Promise<void>;

  // data actions
  refresh: () => Promise<void>;
  createItem: (input: NewItem) => Promise<Item>;
  updateItem: (id: string, patch: ItemPatch) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  addTag: (id: string, tag: string) => Promise<void>;
  removeTag: (id: string, tag: string) => Promise<void>;
  createCollection: (input: NewCollection) => Promise<void>;
  updateCollection: (id: string, patch: CollectionPatch) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
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
  sort: "newest",

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
  setSort(sort) {
    set({ sort });
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

  async toggleStar(id) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    await get().updateItem(id, { flags: { ...item.flags, starred: !item.flags.starred } });
  },

  async addTag(id, tag) {
    const clean = tag.trim().replace(/^#/, "").toLowerCase();
    const item = get().items.find((i) => i.id === id);
    if (!clean || !item || item.tags.includes(clean)) return;
    await get().updateItem(id, { tags: [...item.tags, clean] });
  },

  async removeTag(id, tag) {
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    await get().updateItem(id, { tags: item.tags.filter((t) => t !== tag) });
  },

  async createCollection(input) {
    await getRepository().createCollection(input);
    await get().refresh();
  },

  async updateCollection(id, patch) {
    await getRepository().updateCollection(id, patch);
    await get().refresh();
  },

  async deleteCollection(id) {
    await getRepository().deleteCollection(id);
    // If we were viewing the removed collection, fall back to All Items.
    const v = get().view;
    if (v.kind === "collection" && v.val === id) {
      set({ view: { kind: "all", val: null } });
    }
    await get().refresh();
  },
}));
