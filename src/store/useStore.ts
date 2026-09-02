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
import { ensureWorkspaceOpen, setWorkspace } from "../data";
import { migrateSqlite } from "../data/migrateSqlite";
import {
  broadcastWorkspaceChange,
  pickWorkspaceFolder,
  rememberWorkspace,
} from "../lib/workspace";
import type { WorkspaceRef } from "./persisted";
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

/** Live-update subscription, torn down on re-hydrate and workspace switches. */
let unsubscribeVault: (() => void) | null = null;

/**
 * Shortest query worth sending to the index. Below this the client-side filter
 * over already-loaded titles is faster than a round-trip, and a one-character
 * prefix matches nearly everything anyway.
 */
const MIN_INDEXED_QUERY = 3;

/**
 * In-flight hydrate, so concurrent callers share one run.
 *
 * Without this, two hydrates racing each other both see an empty vault and both
 * start the legacy import — which duplicates the entire library. React's
 * StrictMode double-mounts in development, so this is not a rare interleaving:
 * it happens on every launch.
 */
let hydrating: Promise<void> | null = null;

let searchTimer: ReturnType<typeof setTimeout> | null = null;
let searchSeq = 0;

/**
 * Runs the query against the index, debounced.
 *
 * This is what lets search reach note bodies: `listItems()` deliberately omits
 * them, so the client-side filter can only ever see titles, tags and the short
 * derived preview. The index has the full text.
 */
function runSearch(get: () => StoreState, raw: string): void {
  if (searchTimer) clearTimeout(searchTimer);
  const q = raw.trim();

  if (q.length < MIN_INDEXED_QUERY) {
    useStore.setState({ searchResults: null, searching: false });
    return;
  }

  useStore.setState({ searching: true });
  searchTimer = setTimeout(() => {
    searchTimer = null;
    const seq = ++searchSeq;
    void getRepository()
      .search(q)
      .then((hits) => {
        // Drop a response that lost the race to a newer keystroke.
        if (seq !== searchSeq || get().search.trim() !== q) return;
        useStore.setState({ searchResults: hits.map((h) => h.id), searching: false });
      })
      .catch(() => {
        // Fall back to the client-side filter rather than showing nothing.
        if (seq === searchSeq) useStore.setState({ searchResults: null, searching: false });
      });
  }, 150);
}

/**
 * Coalesces bursts of file-change events. A `git pull` touching 200 files would
 * otherwise trigger 200 full re-lists.
 */
function scheduleRefresh(get: () => StoreState): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void get().refresh();
    }, 100);
  };
}

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
  /**
   * Ids the index matched, or null when the query is too short to run one and
   * the client-side filter is doing the work instead.
   */
  searchResults: string[] | null;
  searching: boolean;
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

  // vault
  workspacePath: string | null;
  recentWorkspaces: WorkspaceRef[];
  /** Set when a vault cannot be opened — an unmounted drive, a deleted folder. */
  workspaceError: string | null;
  openWorkspacePicker: () => Promise<void>;
  switchWorkspace: (path: string | null) => Promise<void>;
  /** Set once by a migration so the UI can say what happened. */
  migrationNotice: string | null;
  dismissMigrationNotice: () => void;

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

function persist(
  s: Pick<StoreState, "prefs" | "auth" | "onboarded" | "workspacePath" | "recentWorkspaces"> & {
    migratedAt?: string | null;
  },
): void {
  savePersisted({
    prefs: s.prefs,
    auth: s.auth,
    onboarded: s.onboarded,
    workspacePath: s.workspacePath,
    recentWorkspaces: s.recentWorkspaces,
    migratedAt: s.migratedAt ?? persisted.migratedAt,
  });
}


/** The real hydrate. Only ever entered through the single-flight guard above. */
async function hydrateOnce(
  get: () => StoreState,
  set: (partial: Partial<StoreState>) => void,
): Promise<void> {
  await setWorkspace(get().workspacePath);

  const repo = getRepository();
  let [items, collections] = await Promise.all([repo.listItems(), repo.listCollections()]);

  // Import a legacy SQLite library when the vault is empty.
  //
  // The condition is the vault's actual state, not a "have I migrated yet"
  // flag. A flag can be set by an attempt that then failed, and the cost of
  // getting that wrong is someone's whole library stranded in a database the
  // app no longer reads. An empty vault means there is nothing to duplicate
  // or overwrite, so importing is always safe — and always right.
  if (items.length === 0) {
    try {
      // The import writes straight to the engine, so the vault has to be
      // open first or it is refused and quietly imports nothing.
      await ensureWorkspaceOpen();
      const result = await migrateSqlite();
      if (result) {
        const from = result.sources.join(" and ");
        set({
          migrationNotice:
            `Moved ${result.items} item${result.items === 1 ? "" : "s"} from ${from} into your vault.`,
        });
        [items, collections] = await Promise.all([repo.listItems(), repo.listCollections()]);
      }
      persisted.migratedAt = new Date().toISOString();
      persist({ ...get(), migratedAt: persisted.migratedAt });
    } catch (e) {
      // A failed import must not block the app. The old database is renamed
      // only on success, so the next launch simply tries again.
      console.error("lore: could not import the previous library", e);
    }
  }

  const selectedId =
    items.find((i) => i.id === get().selectedId)?.id ?? items[0]?.id ?? null;
  set({ items, collections, selectedId, hydrated: true });
  if (selectedId) void get().loadDetail(selectedId);

  // Edits made outside Lore — a git pull, Obsidian, vim — arrive here.
  unsubscribeVault?.();
  unsubscribeVault = repo.subscribe?.(scheduleRefresh(get)) ?? null;
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
  searchResults: null,
  searching: false,
  sidebarVisible: true,
  sort: "newest",

  prefs: persisted.prefs,
  auth: persisted.auth,
  onboarded: persisted.onboarded,
  onboardingStep: "signin",

  settingsOpen: false,
  settingsPane: "general",

  workspacePath: persisted.workspacePath,
  recentWorkspaces: persisted.recentWorkspaces,
  workspaceError: null,
  migrationNotice: null,

  async hydrate() {
    if (hydrating) return hydrating;
    hydrating = (async () => {
      try {
        await hydrateOnce(get, set);
      } finally {
        hydrating = null;
      }
    })();
    return hydrating;
  },

  async loadDetail(id) {
    const item = await getRepository().getItem(id);
    // Ignore a response that lost the race to a newer selection.
    if (get().selectedId === id) set({ detail: item });
  },

  dismissMigrationNotice() {
    set({ migrationNotice: null });
  },

  async openWorkspacePicker() {
    const path = await pickWorkspaceFolder();
    if (path) await get().switchWorkspace(path);
  },

  /**
   * Points Lore at another vault. `null` means the default one.
   *
   * Everything derived from the old vault is cleared before re-hydrating, so a
   * stale selection or search cannot leak across — the ids do not even mean the
   * same thing in a different folder.
   */
  async switchWorkspace(path) {
    const previous = get().workspacePath;
    if (path === previous) return;

    set({
      workspacePath: path,
      workspaceError: null,
      hydrated: false,
      items: [],
      collections: [],
      detail: null,
      selectedId: null,
      search: "",
      searchResults: null,
      view: { kind: "all", val: null },
      chatOpen: false,
    });

    try {
      await get().hydrate();
    } catch (e) {
      // Roll back rather than leave the app pointed at a vault it cannot read.
      set({
        workspacePath: previous,
        workspaceError: e instanceof Error ? e.message : String(e),
      });
      await get().hydrate();
      return;
    }

    if (path) set({ recentWorkspaces: rememberWorkspace(get().recentWorkspaces, path) });
    persist(get());
    await broadcastWorkspaceChange(path);
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
    runSearch(get, q);
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
