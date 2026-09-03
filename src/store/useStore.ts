// Global app state (Zustand). UI state lives here; data is hydrated from the
// active KnowledgeRepository and refreshed after mutations. Selectors in
// views.ts derive everything the components render from `items`/`collections`.

import { create } from 'zustand';

import type { AiProvider } from '../ai/aiProvider';
import type { CollectionPatch, ItemPatch, NewCollection, NewItem } from '../data/repository';
import type { Appearance } from '../theme/tokens';
import type { WorkspaceRef } from './persisted';

import { MockAiProvider } from '../ai/mockAiProvider';
import { getRepository } from '../data';
import { ensureWorkspaceOpen, setWorkspace } from '../data';
import { migrateSqlite } from '../data/migrateSqlite';
import { broadcastWorkspaceChange, pickWorkspaceFolder, rememberWorkspace } from '../lib/workspace';
import { loadPersisted, savePersisted } from './persisted';
import { SEED_CHAT, SEED_COLLECTIONS, SEED_ITEMS } from './seed';
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
} from './types';

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
let hydrating: null | Promise<void> = null;

let searchTimer: null | ReturnType<typeof setTimeout> = null;
let searchSeq = 0;

interface StoreState {
    addTag: (id: string, tag: string) => Promise<void>;
    aiAssist: boolean;
    auth: Auth;
    bumpDuration: (key: keyof Durations, delta: number) => void;
    chat: ChatMessage[];

    chatOpen: boolean;
    closeSettings: () => void;
    collections: Collection[];
    createCollection: (input: NewCollection) => Promise<void>;
    createItem: (input: NewItem) => Promise<Item>;
    deleteCollection: (id: string) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    /**
     * The selected item, with its `body` — `listItems()` omits bodies, so the
     * detail pane reads through here and falls back to the list row until it
     * arrives (no spinner, no layout shift).
     */
    detail: Item | null;
    dismissMigrationNotice: () => void;

    finishOnboarding: (mode: 'account' | 'anonymous', email?: string) => void;
    // lifecycle
    hydrate: () => Promise<void>;
    hydrated: boolean;
    // data
    items: Item[];

    loadDetail: (id: string) => Promise<void>;
    /** Set once by a migration so the UI can say what happened. */
    migrationNotice: null | string;

    onboarded: boolean;
    onboardingStep: OnboardingStep;
    // settings actions
    openSettings: (pane?: SettingsPane) => void;
    openWorkspacePicker: () => Promise<void>;
    // onboarding + preferences (persisted)
    prefs: Prefs;
    recentWorkspaces: WorkspaceRef[];
    // data actions
    refresh: () => Promise<void>;
    removeTag: (id: string, tag: string) => Promise<void>;

    renameItemFile: (id: string, stem: string) => Promise<void>;
    requestMagicLink: (email: string) => void;

    search: string;
    searching: boolean;
    /**
     * Ids the index matched, or null when the query is too short to run one and
     * the client-side filter is doing the work instead.
     */
    searchResults: null | string[];
    selectedId: null | string;
    selectItem: (id: string) => void;
    // ui actions
    selectView: (kind: View['kind'], val?: null | string) => void;
    sendChat: (question: string) => Promise<void>;
    setAccent: (accent: Accent) => void;

    setAiAssist: (on: boolean) => void;
    setAppearance: (appearance: Appearance) => void;
    // onboarding actions
    setOnboardingStep: (step: OnboardingStep) => void;

    setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
    setSearch: (q: string) => void;
    setSettingsPane: (pane: SettingsPane) => void;
    setSort: (sort: SortOrder) => void;
    // settings sheet
    settingsOpen: boolean;
    settingsPane: SettingsPane;
    sidebarVisible: boolean;
    signOut: () => void;
    sort: SortOrder;

    switchWorkspace: (path: null | string) => Promise<void>;
    // vault
    /** Sidebar tag order for the open vault; empty falls back to the seed order. */
    tagOrder: string[];
    toggleChat: () => void;
    toggleSidebar: () => void;
    toggleStar: (id: string) => Promise<void>;
    toggleSwitch: (key: keyof Switches) => void;
    updateCollection: (id: string, patch: CollectionPatch) => Promise<void>;
    updateItem: (id: string, patch: ItemPatch) => Promise<void>;
    // ui
    view: View;
    /** Set when a vault cannot be opened — an unmounted drive, a deleted folder. */
    workspaceError: null | string;
    workspacePath: null | string;
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
                const from = result.sources.join(' and ');
                set({
                    migrationNotice: `Moved ${result.items} item${result.items === 1 ? '' : 's'} from ${from} into your vault.`,
                });
                [items, collections] = await Promise.all([
                    repo.listItems(),
                    repo.listCollections(),
                ]);
            }
            persisted.migratedAt = new Date().toISOString();
            persist({ ...get(), migratedAt: persisted.migratedAt });
        } catch (e) {
            // A failed import must not block the app. The old database is renamed
            // only on success, so the next launch simply tries again.
            console.error('lore: could not import the previous library', e);
        }
    }

    // A brand-new default vault gets the sample library, so a first launch is
    // something to look at rather than an empty window. Only the default vault:
    // writing sample notes into a folder someone chose themselves is hostile.
    if (items.length === 0 && get().workspacePath === null) {
        try {
            await seedDefaultVault();
            [items, collections] = await Promise.all([repo.listItems(), repo.listCollections()]);
        } catch (e) {
            console.error('lore: could not seed the vault', e);
        }
    }

    // A vault can carry its own tag order in .lore/workspace.json.
    let tagOrder: string[] = [];
    const withTagOrder = repo as { tagOrder?: () => Promise<string[]> };
    if (withTagOrder.tagOrder) {
        tagOrder = await withTagOrder.tagOrder().catch(() => []);
    }

    const selectedId = items.find((i) => i.id === get().selectedId)?.id ?? items[0]?.id ?? null;
    set({ collections, hydrated: true, items, selectedId, tagOrder });
    if (selectedId) void get().loadDetail(selectedId);

    // Edits made outside Lore — a git pull, Obsidian, vim — arrive here.
    unsubscribeVault?.();
    unsubscribeVault = repo.subscribe?.(scheduleRefresh(get)) ?? null;
}

function persist(
    s: {
        migratedAt?: null | string;
    } & Pick<StoreState, 'auth' | 'onboarded' | 'prefs' | 'recentWorkspaces' | 'workspacePath'>,
): void {
    savePersisted({
        auth: s.auth,
        migratedAt: s.migratedAt ?? persisted.migratedAt,
        onboarded: s.onboarded,
        prefs: s.prefs,
        recentWorkspaces: s.recentWorkspaces,
        workspacePath: s.workspacePath,
    });
}

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
        useStore.setState({ searching: false, searchResults: null });
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
                useStore.setState({ searching: false, searchResults: hits.map((h) => h.id) });
            })
            .catch(() => {
                // Fall back to the client-side filter rather than showing nothing.
                if (seq === searchSeq) useStore.setState({ searching: false, searchResults: null });
            });
    }, 150);
}

/**
 * Coalesces bursts of file-change events. A `git pull` touching 200 files would
 * otherwise trigger 200 full re-lists.
 */
function scheduleRefresh(get: () => StoreState): () => void {
    let timer: null | ReturnType<typeof setTimeout> = null;
    return () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            void get().refresh();
        }, 100);
    };
}

/**
 * Writes the sample library into an empty default vault.
 *
 * Reuses the same seed the browser preview and the unit tests run on, so there
 * is one definition of what a new Lore looks like.
 */
async function seedDefaultVault(): Promise<void> {
    const repo = getRepository();
    for (const c of SEED_COLLECTIONS) {
        await repo.createCollection({ color: c.color, name: c.name });
    }
    // Seed ids are internal, so related links are resolved by title afterwards.
    const idByTitle = new Map<string, string>();
    for (const item of SEED_ITEMS) {
        const { collectionId, createdAt, id, related, updatedAt, ...rest } = item;
        const created = await repo.createItem({
            ...rest,
            collectionId: SEED_COLLECTIONS.find((c) => c.id === collectionId)?.name,
            createdAt,
            related: [],
            updatedAt,
        } as unknown as NewItem);
        idByTitle.set(item.title, created.id);
        void id;
        void related;
    }
    for (const item of SEED_ITEMS) {
        const newId = idByTitle.get(item.title);
        const related = item.related
            .map((old) => SEED_ITEMS.find((i) => i.id === old)?.title)
            .map((title) => (title ? idByTitle.get(title) : undefined))
            .filter((x): x is string => !!x);
        if (newId && related.length) await repo.updateItem(newId, { related });
    }
}

export const useStore = create<StoreState>((set, get) => ({
    async addTag(id, tag) {
        const clean = tag.trim().replace(/^#/, '').toLowerCase();
        const item = get().items.find((i) => i.id === id);
        if (!clean || !item || item.tags.includes(clean)) return;
        await get().updateItem(id, { tags: [...item.tags, clean] });
    },
    aiAssist: true,
    auth: persisted.auth,
    bumpDuration(key, delta) {
        set((s) => ({
            prefs: {
                ...s.prefs,
                durations: {
                    ...s.prefs.durations,
                    [key]: Math.max(1, s.prefs.durations[key] + delta),
                },
            },
        }));
        persist(get());
    },
    chat: SEED_CHAT,

    chatOpen: false,
    closeSettings() {
        set({ settingsOpen: false });
    },
    collections: [],
    async createCollection(input) {
        await getRepository().createCollection(input);
        await get().refresh();
    },
    async createItem(input) {
        const item = await getRepository().createItem(input);
        await get().refresh();
        set({ selectedId: item.id });
        return item;
    },
    async deleteCollection(id) {
        await getRepository().deleteCollection(id);
        // If we were viewing the removed collection, fall back to All Items.
        const v = get().view;
        if (v.kind === 'collection' && v.val === id) {
            set({ view: { kind: 'all', val: null } });
        }
        await get().refresh();
    },
    async deleteItem(id) {
        await getRepository().deleteItem(id);
        await get().refresh();
        if (get().selectedId === id) {
            const next = get().items[0]?.id ?? null;
            set({ detail: null, selectedId: next });
            if (next) void get().loadDetail(next);
        }
    },
    detail: null,
    dismissMigrationNotice() {
        set({ migrationNotice: null });
    },

    finishOnboarding(mode, email) {
        const auth: Auth =
            mode === 'account'
                ? { email: email ?? get().auth.email, mode, name: get().auth.name }
                : { email: null, mode, name: null };
        set({ auth, onboarded: true });
        persist(get());
    },
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
    hydrated: false,
    items: [],

    async loadDetail(id) {
        const item = await getRepository().getItem(id);
        // Ignore a response that lost the race to a newer selection.
        if (get().selectedId === id) set({ detail: item });
    },
    migrationNotice: null,

    onboarded: persisted.onboarded,
    onboardingStep: 'signin',
    openSettings(pane) {
        set({ settingsOpen: true, ...(pane ? { settingsPane: pane } : {}) });
    },
    async openWorkspacePicker() {
        const path = await pickWorkspaceFolder();
        if (path) await get().switchWorkspace(path);
    },
    prefs: persisted.prefs,

    recentWorkspaces: persisted.recentWorkspaces,

    async refresh() {
        const repo = getRepository();
        const [items, collections] = await Promise.all([repo.listItems(), repo.listCollections()]);
        set({ collections, items });
        // Re-read the body: a mutation may have changed it.
        const id = get().selectedId;
        if (id) void get().loadDetail(id);
    },

    async removeTag(id, tag) {
        const item = get().items.find((i) => i.id === id);
        if (!item) return;
        await get().updateItem(id, { tags: item.tags.filter((t) => t !== tag) });
    },

    async renameItemFile(id, stem) {
        const repo = getRepository();
        if (!repo.renameItem) return;
        await repo.renameItem(id, stem);
        await get().refresh();
    },

    requestMagicLink(email) {
        // No mail is sent yet — the waiting card is the whole behaviour for now.
        set((s) => ({ auth: { ...s.auth, email }, onboardingStep: 'magic' }));
    },

    search: '',
    searching: false,
    searchResults: null,
    selectedId: 'i1',
    selectItem(id) {
        set({ chatOpen: false, detail: null, selectedId: id });
        void get().loadDetail(id);
    },
    selectView(kind, val = null) {
        set({ chatOpen: false, view: { kind, val } });
    },
    async sendChat(question) {
        const text = question.trim();
        if (!text) return;
        const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', text };
        set((s) => ({ chat: [...s.chat, userMsg] }));
        const result = await ai.chat(text, get().items);
        const aiMsg: ChatMessage = {
            id: `a_${Date.now()}`,
            role: 'ai',
            sources: result.sources,
            text: result.text,
        };
        set((s) => ({ chat: [...s.chat, aiMsg] }));
    },

    /* ---------------- onboarding ---------------- */

    setAccent(accent) {
        get().setPref('accent', accent);
    },

    setAiAssist(on) {
        set({ aiAssist: on });
    },

    setAppearance(appearance) {
        get().setPref('appearance', appearance);
    },

    /* ---------------- settings ---------------- */

    setOnboardingStep(step) {
        set({ onboardingStep: step });
    },
    setPref(key, value) {
        set((s) => ({ prefs: { ...s.prefs, [key]: value } }));
        persist(get());
    },
    setSearch(q) {
        set({ search: q });
        runSearch(get, q);
    },

    setSettingsPane(pane) {
        set({ settingsPane: pane });
    },
    setSort(sort) {
        set({ sort });
    },

    settingsOpen: false,

    settingsPane: 'general',

    sidebarVisible: true,

    signOut() {
        // Drops the account but keeps the local vault and every preference.
        set({ auth: { email: null, mode: 'anonymous', name: null } });
        persist(get());
    },

    sort: 'newest',

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
            chatOpen: false,
            collections: [],
            detail: null,
            hydrated: false,
            items: [],
            search: '',
            searchResults: null,
            selectedId: null,
            view: { kind: 'all', val: null },
            workspaceError: null,
            workspacePath: path,
        });

        try {
            await get().hydrate();
        } catch (e) {
            // Roll back rather than leave the app pointed at a vault it cannot read.
            set({
                workspaceError: e instanceof Error ? e.message : String(e),
                workspacePath: previous,
            });
            await get().hydrate();
            return;
        }

        if (path) set({ recentWorkspaces: rememberWorkspace(get().recentWorkspaces, path) });
        persist(get());
        await broadcastWorkspaceChange(path);
    },

    tagOrder: [],

    toggleChat() {
        set((s) => ({ chatOpen: !s.chatOpen }));
    },

    toggleSidebar() {
        set((s) => ({ sidebarVisible: !s.sidebarVisible }));
    },

    async toggleStar(id) {
        const item = get().items.find((i) => i.id === id);
        if (!item) return;
        await get().updateItem(id, { flags: { ...item.flags, starred: !item.flags.starred } });
    },

    toggleSwitch(key) {
        set((s) => ({
            prefs: { ...s.prefs, switches: { ...s.prefs.switches, [key]: !s.prefs.switches[key] } },
        }));
        persist(get());
    },

    async updateCollection(id, patch) {
        await getRepository().updateCollection(id, patch);
        await get().refresh();
    },

    async updateItem(id, patch) {
        await getRepository().updateItem(id, patch);
        await get().refresh();
    },

    view: { kind: 'all', val: null },

    workspaceError: null,

    workspacePath: persisted.workspacePath,
}));
