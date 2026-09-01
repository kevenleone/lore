// Global app state (Zustand). UI state lives here; data is hydrated from the
// active KnowledgeRepository and refreshed after mutations. Selectors in
// views.ts derive everything the components render from `items`/`collections`.

import { create } from "zustand";
import { getRepository } from "../data";
import type { CollectionPatch, ItemPatch, NewCollection, NewItem } from "../data/repository";
import { MockAiProvider } from "../ai/mockAiProvider";
import type { AiProvider } from "../ai/aiProvider";
import { SEED_CHAT } from "./seed";
import { loadPersisted, savePersisted } from "./persisted";
import type { Appearance } from "../theme/tokens";
import {
  type Accent,
  type Auth,
  type ChatMessage,
  type Collection,
  type Durations,
  type Item,
  type OnboardingStep,
  type Prefs,
  type SettingsPane,
  type SortOrder,
  type Switches,
  type View,
} from "./types";

const ai: AiProvider = new MockAiProvider();

const persisted = loadPersisted();

interface StoreState {
  // data
  items: Item[];
  /**
   * The selected item, with its `body` — `listItems()` omits bodies, so the
   * detail pane reads through here and falls back to the list row until it
   * arrives (no spinner, no layout shift).
   */
  detail: Item | null;
  collections: Collection[];
  chat: ChatMessage[];
  hydrated: boolean;

  // ui
  view: View;
  selectedId: string | null;
  chatOpen: boolean;
  aiAssist: boolean;
  search: string;
  sidebarVisible: boolean;
  sort: SortOrder;

  // onboarding + preferences (persisted)
  prefs: Prefs;
  auth: Auth;
  onboarded: boolean;
  onboardingStep: OnboardingStep;

  // settings sheet
  settingsOpen: boolean;
  settingsPane: SettingsPane;

  // lifecycle
  hydrate: () => Promise<void>;
  loadDetail: (id: string) => Promise<void>;

  // ui actions
  selectView: (kind: View["kind"], val?: string | null) => void;
  selectItem: (id: string) => void;
  toggleChat: () => void;
  setAiAssist: (on: boolean) => void;
  setSearch: (q: string) => void;
  toggleSidebar: () => void;
  setSort: (sort: SortOrder) => void;
  sendChat: (question: string) => Promise<void>;

  // onboarding actions
  setOnboardingStep: (step: OnboardingStep) => void;
  requestMagicLink: (email: string) => void;
  finishOnboarding: (mode: "account" | "anonymous", email?: string) => void;

  // settings actions
  openSettings: (pane?: SettingsPane) => void;
  closeSettings: () => void;
  setSettingsPane: (pane: SettingsPane) => void;
  setAccent: (accent: Accent) => void;
  setAppearance: (appearance: Appearance) => void;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  toggleSwitch: (key: keyof Switches) => void;
  bumpDuration: (key: keyof Durations, delta: number) => void;
  signOut: () => void;

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

function persist(s: Pick<StoreState, "prefs" | "auth" | "onboarded">): void {
  savePersisted({ prefs: s.prefs, auth: s.auth, onboarded: s.onboarded });
}

export const useStore = create<StoreState>((set, get) => ({
  items: [],
  detail: null,
  collections: [],
  chat: SEED_CHAT,
  hydrated: false,

  view: { kind: "all", val: null },
  selectedId: "i1",
  chatOpen: false,
  aiAssist: true,
  search: "",
  sidebarVisible: true,
  sort: "newest",

  prefs: persisted.prefs,
  auth: persisted.auth,
  onboarded: persisted.onboarded,
  onboardingStep: "signin",

  settingsOpen: false,
  settingsPane: "general",

  async hydrate() {
    const repo = getRepository();
    const [items, collections] = await Promise.all([
      repo.listItems(),
      repo.listCollections(),
    ]);
    const selectedId =
      items.find((i) => i.id === get().selectedId)?.id ?? items[0]?.id ?? null;
    set({ items, collections, selectedId, hydrated: true });
    if (selectedId) void get().loadDetail(selectedId);
  },

  async loadDetail(id) {
    const item = await getRepository().getItem(id);
    // Ignore a response that lost the race to a newer selection.
    if (get().selectedId === id) set({ detail: item });
  },

  selectView(kind, val = null) {
    set({ view: { kind, val }, chatOpen: false });
  },
  selectItem(id) {
    set({ selectedId: id, chatOpen: false, detail: null });
    void get().loadDetail(id);
  },
  toggleChat() {
    set((s) => ({ chatOpen: !s.chatOpen }));
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

  /* ---------------- onboarding ---------------- */

  setOnboardingStep(step) {
    set({ onboardingStep: step });
  },

  requestMagicLink(email) {
    // No mail is sent yet — the waiting card is the whole behaviour for now.
    set((s) => ({ onboardingStep: "magic", auth: { ...s.auth, email } }));
  },

  finishOnboarding(mode, email) {
    const auth: Auth =
      mode === "account"
        ? { mode, email: email ?? get().auth.email, name: get().auth.name }
        : { mode, email: null, name: null };
    set({ auth, onboarded: true });
    persist(get());
  },

  /* ---------------- settings ---------------- */

  openSettings(pane) {
    set({ settingsOpen: true, ...(pane ? { settingsPane: pane } : {}) });
  },
  closeSettings() {
    set({ settingsOpen: false });
  },
  setSettingsPane(pane) {
    set({ settingsPane: pane });
  },

  setAccent(accent) {
    get().setPref("accent", accent);
  },
  setAppearance(appearance) {
    get().setPref("appearance", appearance);
  },

  setPref(key, value) {
    set((s) => ({ prefs: { ...s.prefs, [key]: value } }));
    persist(get());
  },

  toggleSwitch(key) {
    set((s) => ({
      prefs: { ...s.prefs, switches: { ...s.prefs.switches, [key]: !s.prefs.switches[key] } },
    }));
    persist(get());
  },

  bumpDuration(key, delta) {
    set((s) => ({
      prefs: {
        ...s.prefs,
        durations: { ...s.prefs.durations, [key]: Math.max(1, s.prefs.durations[key] + delta) },
      },
    }));
    persist(get());
  },

  signOut() {
    // Drops the account but keeps the local vault and every preference.
    set({ auth: { mode: "anonymous", email: null, name: null } });
    persist(get());
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
    // Re-read the body: a mutation may have changed it.
    const id = get().selectedId;
    if (id) void get().loadDetail(id);
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
      const next = get().items[0]?.id ?? null;
      set({ selectedId: next, detail: null });
      if (next) void get().loadDetail(next);
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
