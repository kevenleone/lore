// Global app state (Zustand). UI state lives here; data is hydrated from the
// active KnowledgeRepository and refreshed after mutations. Selectors in
// views.ts derive everything the components render from `items`/`collections`.

import { create } from 'zustand';

import type { AiProvider } from '../ai/aiProvider';
import type { CollectionPatch, ItemPatch, NewCollection, NewItem } from '../data/repository';
import type { ThemeId } from '../theme/themes';
import type { Appearance } from '../theme/tokens';
import type { WorkspaceRef } from './persisted';
import type { BoardFilter } from './tasks';

import { MockAiProvider } from '../ai/mockAiProvider';
import { getRepository } from '../data';
import { setWorkspace } from '../data';
import { defaultVaultPath } from '../data/vaultRepository';
import { formatTime } from '../lib/calendar';
import { exportPdf, pdfFileName, pickPdfPath } from '../lib/exportPdf';
import { primeChime } from '../lib/focusChime';
import { ensureNotificationPermission, notifyIntervalEnd } from '../lib/focusNotify';
import { nextPhase, phaseSeconds, remainingSeconds } from '../lib/focusTimer';
import { revealPath, revealVaultFile } from '../lib/reveal';
import { initVaultGit } from '../lib/vaultGit';
import {
    broadcastWorkspaceChange,
    pickExportFolder,
    pickWorkspaceFolder,
    rememberWorkspace,
    workspaceName,
} from '../lib/workspace';
import { effectiveTheme } from '../theme/tokens';
import { loadPersisted, savePersisted } from './persisted';
import { SEED_COLLECTIONS, SEED_ITEMS } from './seed';
import { boardFor, EMPTY_BOARD_FILTER } from './tasks';
import {
    type Accent,
    type BoardColumnConfig,
    type BoardConfig,
    type BoardViewMode,
    type CapturePreset,
    type ChatMessage,
    type Collection,
    DEFAULT_PREFS,
    type Durations,
    EMPTY_FILTERS,
    type FilterFacet,
    type Filters,
    type FocusSession,
    type FocusState,
    type Item,
    type ItemComment,
    type ItemMeta,
    type MainView,
    type OnboardingStep,
    type OpenMode,
    type Prefs,
    type SavedSearch,
    type SettingsPane,
    type SortOrder,
    type Switches,
    type TaskView,
    type Toast,
    type ToastAction,
    type VaultSetup,
    type View,
    type ViewMode,
} from './types';
import { queueItems } from './views';

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

const MAX_RECENT_ITEMS = 8;
const MAX_RECENT_SEARCHES = 5;
const MIN_RECENT_SEARCH = 2;

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
    /** Appends a column to the open board. */
    addBoardColumn: (name: string) => Promise<void>;
    /** Appends a comment to the item's frontmatter. */
    addComment: (id: string, body: string) => Promise<void>;
    addTag: (id: string, tag: string) => Promise<void>;
    /** Puts a saved search back on screen: its view, its filters and its query. */
    applySavedSearch: (id: string) => void;
    /** What the open board is filtered by. Empty everywhere means unfiltered. */
    boardFilter: BoardFilter;
    /**
     * The project whose board the Projects tab is showing — a collection id, or
     * `UNFILED_BOARD`. Null is the overview: the tab's other state, listing
     * every project rather than opening one.
     */
    boardId: null | string;
    /** Every board, keyed by collection id. Absent means `DEFAULT_BOARD`. */
    boards: Record<string, BoardConfig>;
    bumpDuration: (key: keyof Durations, delta: number) => void;
    /**
     * True while the in-window capture drawer is open. The floating capture
     * window is the out-of-app path (⌥Space with Lore in the background); every
     * capture started from inside the window happens here instead.
     */
    captureOpen: boolean;

    /**
     * Fields a capture should open with, set by the surface that asked for it —
     * the `+` on a board column knows the collection and the column, which the
     * drawer has no way to work out for itself.
     */
    capturePreset: CapturePreset | null;

    chat: ChatMessage[];

    chatOpen: boolean;
    clearFilters: () => void;
    clearRecents: () => void;
    /** Back to the list of projects, from one project's board. */
    closeBoard: () => void;
    closeCapture: () => void;
    closeCommandMenu: () => void;
    /** Puts an item opened from Cards or Table away again. */
    closeOpenItem: () => void;
    closePhotoPicker: () => void;
    closeSettings: () => void;
    /** Closes the Tasks surface's rail. The task stays selected. */
    closeTask: () => void;
    collections: Collection[];
    commandMenuOpen: boolean;
    createCollection: (input: NewCollection) => Promise<void>;
    createItem: (input: NewItem) => Promise<Item>;
    /** Steps "Working on" to the next item in the queue. */
    cycleFocusTask: () => void;
    deleteCollection: (id: string) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    deleteSavedSearch: (id: string) => Promise<void>;
    /**
     * The selected item, with its `body` — `listItems()` omits bodies, so the
     * detail pane reads through here and falls back to the list row until it
     * arrives (no spinner, no layout shift).
     */
    detail: Item | null;
    dismissToast: (id: string) => void;
    /**
     * The item whose body has unsaved edits. Any vault change re-reads
     * `detail`, including the one our own save causes, which would otherwise
     * replace the text under the cursor.
     */
    editorDirtyId: null | string;
    /**
     * Promotes the open drawer to a full page for this item only. It writes the
     * override rather than the preference, so the next item still opens the way
     * the user chose.
     */
    expandOpenItem: () => void;
    /**
     * Copies the vault into a folder the user picks. Reports what happened —
     * an export is silent on screen otherwise, the files landing somewhere the
     * app is not showing.
     */
    /** Writes one item to a PDF the user picks. Defaults to the open item. */
    exportItemPdf: (id?: string) => Promise<void>;
    exportVault: () => Promise<void>;
    /** Filter-bar state, applied on top of `view` and `search`. */
    filters: Filters;
    /**
     * Opens the vault the user picked and dismisses the sheet. Resolves to false
     * when the folder could not be opened, in which case the sheet stays up with
     * `workspaceError` explaining why.
     */
    finishOnboarding: (setup: VaultSetup) => Promise<boolean>;
    /** The running (or paused) focus interval — `Lore Settings` frames 1e/1f. */
    focus: FocusState;
    /** True while the full Focus surface (frame 1f) covers the window. */
    focusModeOpen: boolean;
    /** True while the menu-bar-style focus popover (frame 1e) is open. */
    focusPopoverOpen: boolean;
    /** Finished intervals, newest last. Drawn on the calendar. */
    focusSessions: FocusSession[];
    // lifecycle
    hydrate: () => Promise<void>;
    hydrated: boolean;

    /**
     * Per-file facts for the Properties panel — size, mtime, word count and
     * backlinks. Null until the panel is open and a response has landed.
     */
    itemMeta: ItemMeta | null;
    // data
    items: Item[];
    loadDetail: (id: string) => Promise<void>;
    loadItemMeta: (id: string) => Promise<void>;
    /** Which surface the window's main area shows: the library or the calendar. */
    mainView: MainView;

    /** Drops a column onto another's place, from a drag of its handle. */
    moveBoardColumn: (columnId: string, targetId: string) => Promise<void>;
    onboarded: boolean;
    onboardingStep: OnboardingStep;
    /**
     * Overrides `prefs.openMode` for the item currently open, or null to follow
     * the preference. Cleared with `openId`, so it never outlives its item.
     */
    openAs: null | OpenMode;
    /** Opens a collection's board. `UNFILED_BOARD` is the one for loose tasks. */
    openBoard: (boardId: string) => void;

    openCapture: () => void;
    /** Opens the capture drawer with a column's board and status already set. */
    openCaptureIn: (collectionId: null | string, column: BoardColumnConfig) => void;
    /** Opens the photo picker against an item, to choose its thumbnail. */
    openCommandMenu: () => void;
    /**
     * The item Cards or Table has opened, or null. List mode never sets it —
     * there the detail pane is a permanent column, so there is nothing to open.
     */
    openId: null | string;
    /** Opens an item as a full page, whatever the view mode and open-mode preference say. */
    openItemPage: (id: string) => void;
    /** Follows a link from the open item, staying a full page when that is how it is open. */
    openLinkedItem: (id: string) => void;
    openPhotoPicker: (itemId: string) => void;
    // settings actions
    openSettings: (pane?: SettingsPane) => void;
    openWorkspacePicker: () => Promise<void>;
    /**
     * Which item the photo picker is choosing a thumbnail for, or null when it
     * is closed. It lives here rather than in the Properties panel because the
     * picker is a window-level sheet, and that panel is a 316px column that
     * bounds and clips anything positioned inside it.
     */
    photoPickerItemId: null | string;
    // onboarding + preferences (persisted)
    prefs: Prefs;
    /** Confirms an action whose effect the user cannot see happen. */
    pushToast: (message: string, action?: ToastAction) => void;
    recentItemIds: string[];
    recentSearches: string[];
    recentWorkspaces: WorkspaceRef[];
    recordRecentItem: (id: string) => void;
    recordRecentSearch: (query: string) => void;
    // data actions
    refresh: () => Promise<void>;
    /**
     * Re-reads a virtual document from its origin. Safe to call on every open —
     * the data engine holds the interval, so this carries no policy.
     */
    refreshSource: (id: string) => Promise<void>;
    /**
     * Rebuilds the index from the files and reports what moved. The watcher
     * normally keeps the two in step, so this is the recovery for the case
     * where it missed something — a vault restored from a backup, or edited
     * while Lore was not running.
     */
    reindexVault: () => Promise<void>;
    /** Drops a column; its cards fall back into the first one. */
    removeBoardColumn: (columnId: string) => Promise<void>;
    removeComment: (id: string, commentId: string) => Promise<void>;
    removeTag: (id: string, tag: string) => Promise<void>;
    /** Renames a column in place. The cards do not move — `status` holds the id. */
    renameBoardColumn: (columnId: string, name: string) => Promise<void>;
    renameItemFile: (id: string, stem: string) => Promise<void>;
    /** Moves a column one place left or right. */
    reorderBoardColumn: (columnId: string, direction: -1 | 1) => Promise<void>;
    /** Puts the current interval back to its full length, still paused. */
    resetFocusInterval: () => void;
    /** Puts every preference back to its default. */
    restoreDefaultPrefs: () => void;
    /** Shows the item's file in the OS file manager. */
    revealItemFile: (id: string) => Promise<void>;

    /** The vault's named searches, in the order they were saved. */
    savedSearches: SavedSearch[];
    /** Names the current view, filters and query, and records them in the vault. */
    saveSearch: (name: string) => Promise<void>;
    /** Item id → ISO time it sits at on the calendar. */
    schedule: Record<string, string>;
    /** Places an item on the calendar, or clears it when `at` is null. */
    scheduleItem: (id: string, at: Date | null) => void;
    search: string;
    searching: boolean;

    /**
     * Ids the index matched, or null when the query is too short to run one and
     * the client-side filter is doing the work instead.
     */
    searchResults: null | string[];
    selectedId: null | string;
    selectItem: (id: string) => void;
    /**
     * Selection from inside the Tasks surface. `selectItem` sends the window
     * back to the library, which is right when an item is opened from the
     * calendar or the chat and wrong here: the rail sits beside the list it was
     * chosen from.
     */
    selectTask: (id: string) => void;
    // ui actions
    selectView: (kind: View['kind'], val?: null | string) => void;
    sendChat: (question: string) => Promise<void>;
    setAccent: (accent: Accent) => void;
    setAppearance: (appearance: Appearance) => void;

    /** Marks which column completes a task, or none when it is already set. */
    setBoardDoneColumn: (columnId: string) => Promise<void>;
    /** Narrows the open board. Passing null clears every facet. */
    setBoardFilter: (patch: null | Partial<BoardFilter>) => void;
    /** Switches the open board between cards and a list. */
    setBoardView: (view: BoardViewMode) => Promise<void>;

    setEditorDirty: (id: null | string) => void;
    setFilters: (patch: Partial<Filters>) => void;
    setFocusTask: (id: null | string) => void;
    setMainView: (view: MainView) => void;
    // onboarding actions
    setOnboardingStep: (step: OnboardingStep) => void;
    setOpenMode: (mode: OpenMode) => void;
    setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
    setSearch: (q: string) => void;
    setSettingsPane: (pane: SettingsPane) => void;
    setSort: (sort: SortOrder) => void;
    setTaskView: (view: TaskView) => void;
    setTheme: (id: ThemeId) => void;
    // settings sheet
    settingsOpen: boolean;
    settingsPane: SettingsPane;
    setViewMode: (mode: ViewMode) => void;
    sidebarVisible: boolean;
    /** Ends the current interval early and moves to the next one. */
    skipFocusInterval: () => void;

    sort: SortOrder;
    /**
     * Ends the session: back to a fresh first interval, which is also what
     * clears the countdown from the menu bar.
     */
    stopFocus: () => void;
    switchWorkspace: (path: null | string) => Promise<void>;
    // vault
    /** Whether the Tasks surface is showing the selected task beside its list. */
    taskRailOpen: boolean;
    /** Which tab the Tasks surface is on. */
    taskView: TaskView;
    /** Recomputes the countdown from the clock, and rolls over at zero. */
    tickFocus: () => void;
    /** Shows or hides the right-hand Properties panel. Persisted with the prefs. */
    toasts: Toast[];
    toggleCapture: () => void;
    toggleChat: () => void;
    toggleCommandMenu: () => void;
    /** Adds or removes one value from a multi-select filter facet. */
    toggleFilter: <F extends FilterFacet>(facet: F, value: Filters[F][number]) => void;
    /** Starts or pauses the current interval — the ⌥⇧F shortcut and both surfaces. */
    toggleFocus: () => void;
    toggleFocusMode: () => void;
    toggleFocusPopover: () => void;
    toggleProperties: () => void;
    toggleSidebar: () => void;
    toggleStar: (id: string) => Promise<void>;
    toggleSwitch: (key: keyof Switches) => void;
    /** Moves the vault to the Trash and sends the user back to onboarding. */
    trashVault: () => Promise<void>;
    updateCollection: (id: string, patch: CollectionPatch) => Promise<void>;
    updateItem: (id: string, patch: ItemPatch) => Promise<void>;
    // ui
    view: View;
    /** Set when a vault cannot be opened — an unmounted drive, a deleted folder. */
    workspaceError: null | string;
    workspacePath: null | string;
}

/**
 * A column id derived from its name, kept unique within the board. The id is
 * what every task's `status` holds, so it is minted once and never rewritten —
 * renaming a column later leaves every card exactly where it is.
 */
function columnId(board: BoardConfig, name: string): string {
    const base =
        name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'column';
    const taken = new Set(board.columns.map((column) => column.id));

    if (!taken.has(base)) {
        return base;
    }

    let n = 2;

    while (taken.has(`${base}-${n}`)) {
        n++;
    }

    return `${base}-${n}`;
}

/**
 * Ends the interval the timer is in and returns the state of the next one.
 *
 * A finished *focus* interval is what produces a `FocusSession`; breaks are not
 * recorded, so the calendar only ever shows time actually spent working.
 */
function completeInterval(
    state: StoreState,
    now: number,
): { focus: FocusState; sessions: FocusSession[] } {
    const { focus, focusSessions, prefs } = state;
    const finishedFocus = focus.phase === 'focus' && focus.startedAt !== null;
    const sessions = finishedFocus
        ? [
              ...focusSessions,
              {
                  endedAt: new Date(now).toISOString(),
                  id: `fs_${now}`,
                  startedAt: focus.startedAt!,
                  taskId: focus.taskId,
              },
          ]
        : focusSessions;

    const phase = nextPhase(focus.phase, focus.sessionIndex, prefs.longBreakAfter);
    const seconds = phaseSeconds(phase, prefs.durations);
    // Breaks auto-start only when the user asked them to; a finished break always
    // waits for a deliberate start so nobody is dropped back into focus.
    const running = phase !== 'focus' && prefs.switches.autoBreak;

    // A finished focus interval leaves the counter alone — it is only after the
    // break that the next session begins — and a long break closes the cycle.
    let sessionIndex = focus.sessionIndex;

    if (focus.phase === 'short') {
        sessionIndex = focus.sessionIndex + 1;
    } else if (focus.phase === 'long') {
        sessionIndex = 1;
    }

    return {
        focus: {
            endsAt: running ? now + seconds * 1000 : null,
            phase,
            remainingSec: seconds,
            running,
            sessionIndex,
            startedAt: running ? new Date(now).toISOString() : null,
            taskId: focus.taskId,
        },
        sessions,
    };
}

/**
 * The freshest copy of an item. `detail` is the only one carrying a body, but it
 * lands a tick after the list row, so an edit made in that gap must still read
 * from the row rather than find nothing.
 */
function currentItem(state: StoreState, id: string): Item | undefined {
    if (state.detail?.id === id) {
        return state.detail;
    }

    return state.items.find((item) => item.id === id);
}

/** Shared tail of "this interval is over": roll the phase, persist, log, notify. */
function finishInterval(
    get: () => StoreState,
    set: (partial: Partial<StoreState>) => void,
    // A skip is the user ending the interval themselves; they do not need to be
    // told about something they just did.
    reason: 'elapsed' | 'skipped',
): void {
    const before = get();
    const { focus, sessions } = completeInterval(before, Date.now());

    set({ focus, focusSessions: sessions });
    persist(get());

    if (reason === 'elapsed') {
        void notifyIntervalEnd(before.prefs, before.focus.phase, focus.phase);
    }

    const logged =
        sessions.length > before.focusSessions.length ? sessions[sessions.length - 1] : null;

    if (logged && before.prefs.switches.logFocus) {
        void logFocusSession(before, logged)
            .then(() => get().refresh())
            .catch((error) => console.error('lore: could not write the focus log', error));
    }
}

/** The real hydrate. Only ever entered through the single-flight guard above. */
async function hydrateOnce(
    get: () => StoreState,
    set: (partial: Partial<StoreState>) => void,
): Promise<void> {
    await setWorkspace(get().workspacePath);

    const repo = getRepository();
    let [items, collections] = await Promise.all([repo.listItems(), repo.listCollections()]);

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

    const selectedId =
        items.find((item) => item.id === get().selectedId)?.id ?? items[0]?.id ?? null;

    // A vault with none, or one we cannot read, simply has no Saved section —
    // not worth failing the whole hydrate over.
    const savedSearches = await (repo.listSavedSearches?.() ?? Promise.resolve([])).catch(() => []);

    set({ collections, hydrated: true, items, savedSearches, selectedId });

    if (selectedId) {
        void get().loadDetail(selectedId);
    }

    // Edits made outside Lore — a git pull, Obsidian, vim — arrive here.
    unsubscribeVault?.();
    unsubscribeVault = repo.subscribe?.(scheduleRefresh(get)) ?? null;
}

/**
 * Appends a finished interval to today's focus note, when "Log sessions to my
 * knowledge base" is on. One note a day: the first session of the day creates
 * it, every later one adds a line.
 *
 * Best-effort — a vault that refuses the write must not stall the timer, which
 * is why the callers do not await this.
 */
async function logFocusSession(state: StoreState, session: FocusSession): Promise<void> {
    const day = new Date(session.startedAt);
    const title = `Focus log — ${day.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })}`;
    const task = session.taskId
        ? state.items.find((item) => item.id === session.taskId)
        : undefined;
    const minutes = Math.round(
        (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60_000,
    );
    const line = `- ${formatTime(session.startedAt)}–${formatTime(session.endedAt)} · ${minutes} min${
        task ? ` · ${task.title}` : ''
    }`;

    const repo = getRepository();
    const existing = state.items.find((item) => item.title === title);

    if (existing) {
        const current = (await repo.getItem(existing.id))?.body ?? '';

        await repo.updateItem(existing.id, { body: `${current}\n${line}`.trim() });
    } else {
        await repo.createItem({
            body: line,
            flags: {},
            related: [],
            tags: ['focus'],
            title,
            type: 'note',
        });
    }
}

function persist(
    s: Pick<
        StoreState,
        | 'focusSessions'
        | 'onboarded'
        | 'prefs'
        | 'recentItemIds'
        | 'recentSearches'
        | 'recentWorkspaces'
        | 'schedule'
        | 'workspacePath'
    >,
): void {
    savePersisted({
        focusSessions: s.focusSessions,
        onboarded: s.onboarded,
        prefs: s.prefs,
        recentItemIds: s.recentItemIds,
        recentSearches: s.recentSearches,
        recentWorkspaces: s.recentWorkspaces,
        schedule: s.schedule,
        workspacePath: s.workspacePath,
    });
}

function pushRecent(list: string[], value: string, max: number): string[] {
    return [value, ...list.filter((entry) => entry !== value)].slice(0, max);
}

/**
 * Runs the query against the index, debounced.
 *
 * This is what lets search reach note bodies: `listItems()` deliberately omits
 * them, so the client-side filter can only ever see titles, tags and the short
 * derived preview. The index has the full text.
 */
function runSearch(get: () => StoreState, raw: string): void {
    if (searchTimer) {
        clearTimeout(searchTimer);
    }

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
                if (seq !== searchSeq || get().search.trim() !== q) {
                    return;
                }

                useStore.setState({ searching: false, searchResults: hits.map((hit) => hit.id) });
            })
            .catch(() => {
                // Fall back to the client-side filter rather than showing nothing.
                if (seq === searchSeq) {
                    useStore.setState({ searching: false, searchResults: null });
                }
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
        if (timer) {
            clearTimeout(timer);
        }

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
            collectionId: SEED_COLLECTIONS.find((collection) => collection.id === collectionId)
                ?.name,
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
            .map((old) => SEED_ITEMS.find((item) => item.id === old)?.title)
            .map((title) => (title ? idByTitle.get(title) : undefined))
            .filter((x): x is string => !!x);

        if (newId && related.length) {
            await repo.updateItem(newId, { related });
        }
    }
}

/**
 * Dates a task the moment it is finished, and undates it when it is reopened.
 *
 * Here rather than at each call site because every route to `done` comes
 * through `updateItem` — the card checkbox, the board, the context menu, the
 * Properties chips — and a timeline built on a field only some of them stamped
 * would be quietly wrong.
 */
function stampCompletion(current: Item | undefined, patch: ItemPatch): ItemPatch {
    const next = patch.flags?.done;

    if (next === undefined || next === !!current?.flags.done) {
        return patch;
    }

    return { ...patch, completedAt: next ? new Date().toISOString() : undefined };
}

/**
 * Applies an edit to the open board and persists it. The board is written whole
 * rather than patched: it is a handful of columns, and a partial write is how
 * two edits in the same tick lose one of themselves.
 */
async function writeBoard(
    get: () => StoreState,
    set: (partial: Partial<StoreState>) => void,
    edit: (board: BoardConfig) => BoardConfig,
): Promise<void> {
    const { boardId, boards } = get();

    // Every column edit comes from a board that is open, so this is unreachable
    // — but the overview has no board to write to, and saying so is cheaper
    // than a non-null assertion on every caller.
    if (boardId === null) {
        return;
    }

    const next = edit(boardFor(boards, boardId));

    set({ boards: { ...boards, [boardId]: next } });
    // A store with nowhere to keep a board still gets the edit on screen; it
    // just does not survive a reload. See `KnowledgeRepository.saveBoard`.
    await getRepository().saveBoard?.(boardId, next);
}

/**
 * Puts the new list on screen first, then in the vault. The list is the whole
 * of the state, so a failed write is recoverable by the next one — and a search
 * that vanished on save would be worse than one that outlives a failed write.
 */
async function writeSavedSearches(
    get: () => StoreState,
    set: (partial: Partial<StoreState>) => void,
    next: SavedSearch[],
): Promise<void> {
    const previous = get().savedSearches;

    set({ savedSearches: next });

    try {
        await getRepository().saveSavedSearches?.(next);
    } catch (e) {
        set({ savedSearches: previous });
        get().pushToast(e instanceof Error ? e.message : 'The search could not be saved.');
    }
}

export const useStore = create<StoreState>((set, get) => ({
    async addBoardColumn(name) {
        const label = name.trim();

        if (!label) {
            return;
        }

        await writeBoard(get, set, (board) => ({
            ...board,
            columns: [...board.columns, { id: columnId(board, label), name: label }],
        }));
    },
    async addComment(id, body) {
        const text = body.trim();
        const item = currentItem(get(), id);

        if (!text || !item) {
            return;
        }

        const comment: ItemComment = {
            at: new Date().toISOString(),
            body: text,
            id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        };

        await get().updateItem(id, { comments: [...(item.comments ?? []), comment] });
    },
    async addTag(id, tag) {
        const clean = tag.trim().replace(/^#/, '').toLowerCase();
        const item = get().items.find((item) => item.id === id);

        if (!clean || !item || item.tags.includes(clean)) {
            return;
        }

        await get().updateItem(id, { tags: [...item.tags, clean] });
    },

    applySavedSearch(id) {
        const saved = get().savedSearches.find((entry) => entry.id === id);

        if (!saved) {
            return;
        }

        // Through `selectView` rather than a bare `set`, so a saved search
        // closes the chat and the open item the same way picking the view by
        // hand does. Filters and query follow it, not the other way round.
        get().selectView(saved.view.kind, saved.view.val);
        set({ filters: saved.filters });
        get().setSearch(saved.query);
    },
    boardFilter: EMPTY_BOARD_FILTER,
    boardId: null,
    boards: {},
    bumpDuration(key, delta) {
        set((state) => ({
            prefs: {
                ...state.prefs,
                durations: {
                    ...state.prefs.durations,
                    [key]: Math.max(1, state.prefs.durations[key] + delta),
                },
            },
        }));
        persist(get());
    },

    captureOpen: false,

    capturePreset: null,
    chat: [],
    chatOpen: false,
    clearFilters() {
        set({ filters: EMPTY_FILTERS });
    },
    clearRecents() {
        set({ recentItemIds: [], recentSearches: [] });
        persist(get());
    },

    closeBoard() {
        set({ boardId: null });
    },

    closeCapture() {
        set({ captureOpen: false });
    },
    closeCommandMenu() {
        set({ commandMenuOpen: false });
    },

    closeOpenItem() {
        set({ openAs: null, openId: null });
    },

    closePhotoPicker() {
        set({ photoPickerItemId: null });
    },
    closeSettings() {
        set({ settingsOpen: false });
    },
    closeTask() {
        // The selection survives, the way closing a drawer leaves `selectedId`
        // alone in the library — and the rail collapses by width rather than
        // unmounting, so it has to keep drawing the task on the way out.
        set({ taskRailOpen: false });
    },
    collections: [],
    commandMenuOpen: false,
    async createCollection(input) {
        await getRepository().createCollection(input);
        await get().refresh();
    },
    async createItem(input) {
        const item = await getRepository().createItem(input);

        await get().refresh();
        // `refresh` fills the list, whose rows carry no body. Selecting without
        // also clearing and re-reading `detail` left the pane rendering the
        // bodyless list row, so a captured note or task opened blank.
        set({ detail: null, itemMeta: null, selectedId: item.id });
        void get().loadDetail(item.id);

        return item;
    },
    cycleFocusTask() {
        const queue = queueItems(get().items).filter((item) => !item.flags.done);

        if (queue.length === 0) {
            return;
        }

        const current = queue.findIndex((item) => item.id === get().focus.taskId);

        get().setFocusTask(queue[(current + 1) % queue.length].id);
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

            if (next) {
                void get().loadDetail(next);
            }
        }
    },

    async deleteSavedSearch(id) {
        await writeSavedSearches(
            get,
            set,
            get().savedSearches.filter((entry) => entry.id !== id),
        );
    },

    detail: null,

    dismissToast(id) {
        set({ toasts: get().toasts.filter((toast) => toast.id !== id) });
    },
    editorDirtyId: null,
    expandOpenItem() {
        set({ openAs: 'page' });
    },

    /* ---------------- focus timer ---------------- */

    async exportItemPdf(id) {
        const target = id ?? get().selectedId;

        if (!target) {
            get().pushToast('Open an item to export it.');

            return;
        }

        // `detail` is the only copy carrying a body, and a list row would print
        // as a title with nothing under it.
        const item =
            get().detail?.id === target ? get().detail : await getRepository().getItem(target);

        if (!item) {
            get().pushToast('That item could not be read.');

            return;
        }

        const destination = await pickPdfPath(item);

        if (!destination) {
            return;
        }

        try {
            await exportPdf(
                {
                    collectionName: get().collections.find(
                        (collection) => collection.id === item.collectionId,
                    )?.name,
                    item,
                },
                destination,
            );
            get().pushToast(`Exported ${pdfFileName(item)}.`, {
                label: 'Show in Finder',
                run: () => void revealPath(destination),
            });
        } catch (e) {
            // A rejected `invoke` arrives as a plain string, not an Error, so the
            // reason Rust gave would be dropped by an `instanceof` check alone.
            if (typeof e === 'string') {
                get().pushToast(e);
            } else {
                get().pushToast(e instanceof Error ? e.message : 'The export failed.');
            }
        }
    },

    async exportVault() {
        const repo = getRepository();

        if (!repo.exportTo) {
            return;
        }

        const destination = await pickExportFolder();

        if (!destination) {
            return;
        }

        try {
            const { files, path } = await repo.exportTo(destination);

            get().pushToast(
                `Exported ${files} ${files === 1 ? 'file' : 'files'} to ${workspaceName(path)}.`,
            );
        } catch (e) {
            get().pushToast(e instanceof Error ? e.message : 'The export failed.');
        }
    },

    filters: EMPTY_FILTERS,
    async finishOnboarding({ git, path, starter }) {
        set({ workspaceError: null });

        if (path !== null && path !== get().workspacePath) {
            await get().switchWorkspace(path);

            // The switch rolls the path back and records why, so a folder Lore
            // cannot read leaves the sheet up rather than dropping the user into
            // an empty window.
            if (get().workspaceError) {
                return false;
            }
        }

        // Only ever into a vault that came up empty — writing the sample library
        // over someone's existing notes would be unforgivable.
        if (starter && get().items.length === 0) {
            try {
                await seedDefaultVault();
                await get().refresh();
            } catch (e) {
                console.error('lore: could not write the starter vault', e);
            }
        }

        if (git && path !== null) {
            try {
                await initVaultGit(path);
            } catch (e) {
                // The vault is open and usable; only the tracking failed, so say so
                // rather than refusing the whole setup.
                set({
                    workspaceError: `The vault opened, but Git could not be set up: ${e instanceof Error ? e.message : String(e)}`,
                });
            }
        }

        set({ onboarded: true });
        persist(get());

        return true;
    },
    focus: {
        endsAt: null,
        phase: 'focus',
        remainingSec: persisted.prefs.durations.focus * 60,
        running: false,
        sessionIndex: 1,
        startedAt: null,
        taskId: null,
    },
    focusModeOpen: false,

    focusPopoverOpen: false,
    focusSessions: persisted.focusSessions,
    async hydrate() {
        if (hydrating) {
            return hydrating;
        }

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

    itemMeta: null,

    items: [],

    async loadDetail(id) {
        const item = await getRepository().getItem(id);

        // Ignore a response that lost the race to a newer selection.
        if (get().selectedId !== id) {
            void get().loadItemMeta(id);

            return;
        }

        const state = get();
        // Everything else still refreshes; only the body being typed into wins.
        const keepBody = state.editorDirtyId === id && state.detail?.id === id;

        set({ detail: item && keepBody ? { ...item, body: state.detail?.body } : item });
        void get().loadItemMeta(id);
    },

    async loadItemMeta(id) {
        const repo = getRepository();
        const meta = repo.itemMeta ? await repo.itemMeta(id).catch(() => null) : null;

        if (get().selectedId === id) {
            set({ itemMeta: meta });
        }
    },
    mainView: 'library',
    /**
     * The column goes; its cards stay tasks. They fall into the first column on
     * the next render because their `status` now names nothing — no rewrite of
     * every file, and undoing the delete puts them back where they were.
     */
    async moveBoardColumn(columnId, targetId) {
        await writeBoard(get, set, (board) => {
            const from = board.columns.findIndex((column) => column.id === columnId);
            const to = board.columns.findIndex((column) => column.id === targetId);

            if (from < 0 || to < 0 || from === to) {
                return board;
            }

            const columns = board.columns.slice();
            // Lifted out and put back in, not swapped: dragging a column three
            // places along should carry it past the others, not trade with the
            // one it landed on.
            const [moved] = columns.splice(from, 1);

            columns.splice(to, 0, moved);

            return { ...board, columns };
        });
    },

    onboarded: persisted.onboarded,

    onboardingStep: 'pick',
    openAs: null,

    openBoard(boardId) {
        // The filter belongs to the board being looked at, not to the surface:
        // carrying one board's filter onto the next hides cards for no reason
        // the user can see.
        set({ boardFilter: EMPTY_BOARD_FILTER, boardId, mainView: 'tasks', taskView: 'board' });
    },

    openCapture() {
        set({ captureOpen: true, capturePreset: null, focusPopoverOpen: false });
    },
    openCaptureIn(collectionId, column) {
        set({
            captureOpen: true,
            capturePreset: {
                collectionId,
                done: !!column.done,
                status: column.id,
                type: 'task',
            },
            focusPopoverOpen: false,
        });
    },
    openCommandMenu() {
        set({ commandMenuOpen: true });
    },

    openId: null,

    openItemPage(id) {
        get().selectItem(id);
        set({ openAs: 'page', openId: id });
    },

    openLinkedItem(id) {
        const { openAs, openId } = get();

        if (openAs === 'page' && openId !== null) {
            get().openItemPage(id);
        } else {
            get().selectItem(id);
        }
    },

    openPhotoPicker(itemId) {
        set({ photoPickerItemId: itemId });
    },

    openSettings(pane) {
        set({ settingsOpen: true, ...(pane ? { settingsPane: pane } : {}) });
    },

    async openWorkspacePicker() {
        const path = await pickWorkspaceFolder();

        if (path) {
            await get().switchWorkspace(path);
        }
    },

    photoPickerItemId: null,
    prefs: persisted.prefs,
    pushToast(message, action) {
        const toast = { action, id: crypto.randomUUID(), message };

        // A burst of actions should not stack into a column that covers the
        // list it is reporting on.
        set({ toasts: [...get().toasts, toast].slice(-3) });
    },
    recentItemIds: persisted.recentItemIds,
    recentSearches: persisted.recentSearches,
    recentWorkspaces: persisted.recentWorkspaces,
    recordRecentItem(id) {
        set({ recentItemIds: pushRecent(get().recentItemIds, id, MAX_RECENT_ITEMS) });
        persist(get());
    },
    recordRecentSearch(query) {
        const text = query.trim();

        if (text.length < MIN_RECENT_SEARCH) {
            return;
        }

        const kept = get().recentSearches.filter(
            (recentSearch) => recentSearch.toLowerCase() !== text.toLowerCase(),
        );

        set({ recentSearches: [text, ...kept].slice(0, MAX_RECENT_SEARCHES) });
        persist(get());
    },

    async refresh() {
        const repo = getRepository();
        const [items, collections, boards] = await Promise.all([
            repo.listItems(),
            repo.listCollections(),
            repo.listBoards?.() ?? {},
        ]);

        set({ boards, collections, items });

        // Re-read the body: a mutation may have changed it.
        const id = get().selectedId;

        if (id) {
            void get().loadDetail(id);
        }
    },

    async refreshSource(id) {
        const repo = getRepository();

        if (!repo.refreshItem) {
            return;
        }

        // Offline is the common case here, not an error: the cached copy is
        // already on screen and stays there.
        const item = await repo.refreshItem(id).catch(() => null);

        if (!item || get().selectedId !== id) {
            return;
        }

        if (item.updatedAt === get().detail?.updatedAt) {
            return;
        }

        await get().refresh();
        await get().loadDetail(id);
    },

    async reindexVault() {
        const repo = getRepository();

        if (!repo.reindex) {
            return;
        }

        try {
            const { indexed, removed } = await repo.reindex();

            await get().refresh();

            if (!indexed && !removed) {
                get().pushToast('The index was already up to date.');

                return;
            }

            const parts = [];

            if (indexed) {
                parts.push(`${indexed} ${indexed === 1 ? 'file' : 'files'} reindexed`);
            }

            if (removed) {
                parts.push(`${removed} ${removed === 1 ? 'entry' : 'entries'} dropped`);
            }

            get().pushToast(`${parts.join(', ')}.`);
        } catch (e) {
            get().pushToast(e instanceof Error ? e.message : 'The reindex failed.');
        }
    },

    async removeBoardColumn(columnId) {
        await writeBoard(get, set, (board) => {
            if (board.columns.length <= 1) {
                return board;
            }

            return { ...board, columns: board.columns.filter((column) => column.id !== columnId) };
        });
    },

    async removeComment(id, commentId) {
        const item = currentItem(get(), id);

        if (!item?.comments) {
            return;
        }

        await get().updateItem(id, {
            comments: item.comments.filter((comment) => comment.id !== commentId),
        });
    },

    async removeTag(id, tag) {
        const item = get().items.find((item) => item.id === id);

        if (!item) {
            return;
        }

        await get().updateItem(id, { tags: item.tags.filter((t) => t !== tag) });
    },

    async renameBoardColumn(columnId, name) {
        const label = name.trim();

        if (!label) {
            return;
        }

        await writeBoard(get, set, (board) => ({
            ...board,
            columns: board.columns.map((column) =>
                column.id === columnId ? { ...column, name: label } : column,
            ),
        }));
    },

    async renameItemFile(id, stem) {
        const repo = getRepository();

        if (!repo.renameItem) {
            return;
        }

        await repo.renameItem(id, stem);
        await get().refresh();
    },

    async reorderBoardColumn(columnId, direction) {
        await writeBoard(get, set, (board) => {
            const from = board.columns.findIndex((column) => column.id === columnId);
            const to = from + direction;

            if (from < 0 || to < 0 || to >= board.columns.length) {
                return board;
            }

            const columns = board.columns.slice();

            [columns[from], columns[to]] = [columns[to], columns[from]];

            return { ...board, columns };
        });
    },

    resetFocusInterval() {
        set((state) => ({
            focus: {
                ...state.focus,
                endsAt: null,
                remainingSec: phaseSeconds(state.focus.phase, state.prefs.durations),
                running: false,
                startedAt: null,
            },
        }));
    },

    restoreDefaultPrefs() {
        set({ prefs: DEFAULT_PREFS });
        persist(get());
        get().pushToast('Preferences are back to their defaults.');
    },

    async revealItemFile(id) {
        const path = currentItem(get(), id)?.path;

        if (!path) {
            return;
        }

        const shown = await revealVaultFile(get().workspacePath, path);

        if (!shown) {
            get().pushToast('Could not show the file.');
        }
    },

    savedSearches: [],

    async saveSearch(name) {
        const clean = name.trim();

        if (!clean) {
            return;
        }

        const { filters, savedSearches, search, view } = get();
        const entry: SavedSearch = {
            filters,
            id: crypto.randomUUID(),
            name: clean,
            query: search,
            view,
        };

        await writeSavedSearches(get, set, [...savedSearches, entry]);
    },

    schedule: persisted.schedule,

    scheduleItem(id, at) {
        set((state) => {
            const schedule = { ...state.schedule };

            if (at) {
                schedule[id] = at.toISOString();
            } else {
                delete schedule[id];
            }

            return { schedule };
        });
        persist(get());
    },

    search: '',

    searching: false,
    searchResults: null,
    selectedId: 'i1',
    selectItem(id) {
        // Opening an item always means the library — the calendar and the chat
        // are both places you leave to look at one.
        //
        // Cards and Table have no standing detail column, so choosing an item is
        // also what opens it, as a drawer or a page. List already shows it.
        const opens = get().prefs.viewMode !== 'list';

        set({
            chatOpen: false,
            detail: null,
            itemMeta: null,
            mainView: 'library',
            openAs: null,
            openId: opens ? id : null,
            selectedId: id,
        });
        get().recordRecentItem(id);
        void get().loadDetail(id);
    },
    selectTask(id) {
        set({
            chatOpen: false,
            detail: null,
            itemMeta: null,
            openAs: null,
            openId: null,
            selectedId: id,
            taskRailOpen: true,
        });
        get().recordRecentItem(id);
        void get().loadDetail(id);
    },
    selectView(kind, val = null) {
        set({
            chatOpen: false,
            mainView: 'library',
            openAs: null,
            openId: null,
            view: { kind, val },
        });
    },
    async sendChat(question) {
        const text = question.trim();

        if (!text) {
            return;
        }

        const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', text };

        set((state) => ({ chat: [...state.chat, userMsg] }));

        const result = await ai.chat(text, get().items);
        const aiMsg: ChatMessage = {
            id: `a_${Date.now()}`,
            role: 'ai',
            sources: result.sources,
            text: result.text,
        };

        set((state) => ({ chat: [...state.chat, aiMsg] }));
    },

    /* ---------------- onboarding ---------------- */

    setAccent(accent) {
        get().setPref('accent', accent);
    },

    setAppearance(appearance) {
        get().setPref('appearance', appearance);
    },

    /** Exactly one column can complete a task; choosing the current one clears it. */
    async setBoardDoneColumn(columnId) {
        await writeBoard(get, set, (board) => ({
            ...board,
            columns: board.columns.map((column) => {
                const done = column.id === columnId && !column.done;

                return done ? { ...column, done: true } : { ...column, done: undefined };
            }),
        }));
    },

    setBoardFilter(patch) {
        set({
            boardFilter: patch ? { ...get().boardFilter, ...patch } : EMPTY_BOARD_FILTER,
        });
    },

    async setBoardView(view) {
        await writeBoard(get, set, (board) => ({ ...board, view }));
    },

    setEditorDirty(id) {
        set({ editorDirtyId: id });
    },

    /* ---------------- settings ---------------- */

    setFilters(patch) {
        set((state) => ({ filters: { ...state.filters, ...patch } }));
    },

    setFocusTask(id) {
        set((state) => ({ focus: { ...state.focus, taskId: id } }));
    },

    setMainView(view) {
        set({ mainView: view });
    },
    setOnboardingStep(step) {
        set({ onboardingStep: step });
    },
    setOpenMode(mode) {
        // Whatever is open was opened the old way; close it rather than teleport
        // it from a drawer into a page.
        set({ openAs: null, openId: null });
        get().setPref('openMode', mode);
    },
    setPref(key, value) {
        set((state) => ({ prefs: { ...state.prefs, [key]: value } }));
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
    setTaskView(view) {
        // Choosing the tab means the overview. A single board is opened by
        // clicking it — in the overview or in the sidebar — so the tab itself
        // is always the way back out of one.
        set({ boardId: null, mainView: 'tasks', taskView: view });
    },

    setTheme(id) {
        const mode = effectiveTheme(get().prefs.appearance);

        get().setPref(mode === 'dark' ? 'darkTheme' : 'lightTheme', id);
    },

    settingsOpen: false,

    settingsPane: 'general',

    setViewMode(mode) {
        set({ openAs: null, openId: null });
        get().setPref('viewMode', mode);
    },

    sidebarVisible: true,

    skipFocusInterval() {
        finishInterval(get, set, 'skipped');
    },

    sort: 'newest',

    /**
     * Points Lore at another vault. `null` means the default one.
     *
     * Everything derived from the old vault is cleared before re-hydrating, so a
     * stale selection or search cannot leak across — the ids do not even mean the
     * same thing in a different folder.
     */
    stopFocus() {
        set((state) => ({
            focus: {
                endsAt: null,
                phase: 'focus',
                remainingSec: phaseSeconds('focus', state.prefs.durations),
                running: false,
                sessionIndex: 1,
                startedAt: null,
                // The task stays: stopping ends the session, not the intention.
                taskId: state.focus.taskId,
            },
        }));
    },

    async switchWorkspace(path) {
        const previous = get().workspacePath;

        if (path === previous) {
            return;
        }

        set({
            chatOpen: false,
            collections: [],
            detail: null,
            filters: EMPTY_FILTERS,
            hydrated: false,
            items: [],
            openAs: null,
            openId: null,
            recentItemIds: [],
            savedSearches: [],
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

        if (path) {
            set({ recentWorkspaces: rememberWorkspace(get().recentWorkspaces, path) });
        }

        persist(get());
        await broadcastWorkspaceChange(path);
    },

    taskRailOpen: false,

    taskView: 'summary',

    tickFocus() {
        const state = get();

        if (!state.focus.running) {
            return;
        }

        const remaining = remainingSeconds(state.focus);

        if (remaining > 0) {
            // Most ticks land inside the same second; writing an identical value
            // would re-render every subscriber for nothing.
            if (remaining !== state.focus.remainingSec) {
                set({ focus: { ...state.focus, remainingSec: remaining } });
            }

            return;
        }

        finishInterval(get, set, 'elapsed');
    },

    toasts: [],

    toggleCapture() {
        // Clears the preset with it: a capture opened from the menu or ⌥Space
        // is not the one a board column asked for, and a stale column would
        // file the next task somewhere the user never chose.
        set((state) => ({
            captureOpen: !state.captureOpen,
            capturePreset: null,
            focusPopoverOpen: false,
        }));
    },

    toggleChat() {
        set((state) => ({ chatOpen: !state.chatOpen }));
    },

    toggleCommandMenu() {
        set((state) => ({ commandMenuOpen: !state.commandMenuOpen }));
    },

    toggleFilter(facet, value) {
        set((state) => {
            const current = state.filters[facet] as string[];
            const next = current.includes(value)
                ? current.filter((v) => v !== value)
                : [...current, value];

            return { filters: { ...state.filters, [facet]: next } };
        });
    },

    toggleFocus() {
        if (!get().focus.running) {
            // Both of these need settling now, while there is still a gesture
            // behind the call and minutes before the interval ends: an audio
            // context only resumes on one, and a consent sheet raised at the
            // end would swallow the notification it was asked about.
            primeChime();
            void ensureNotificationPermission();
        }

        set((state) => {
            const running = !state.focus.running;
            const remaining =
                state.focus.remainingSec > 0
                    ? state.focus.remainingSec
                    : phaseSeconds(state.focus.phase, state.prefs.durations);

            return {
                focus: {
                    ...state.focus,
                    endsAt: running ? Date.now() + remaining * 1000 : null,
                    remainingSec: remaining,
                    running,
                    // The session's clock starts on the first start, not on every
                    // resume — otherwise a pause would shorten the block the
                    // calendar draws for it.
                    startedAt: running
                        ? (state.focus.startedAt ?? new Date().toISOString())
                        : state.focus.startedAt,
                },
            };
        });
    },

    toggleFocusMode() {
        set((state) => ({ focusModeOpen: !state.focusModeOpen, focusPopoverOpen: false }));
    },

    toggleFocusPopover() {
        set((state) => ({ focusPopoverOpen: !state.focusPopoverOpen }));
    },

    toggleProperties() {
        const open = !get().prefs.propertiesOpen;

        get().setPref('propertiesOpen', open);
    },
    toggleSidebar() {
        set((state) => ({ sidebarVisible: !state.sidebarVisible }));
    },

    async toggleStar(id) {
        const item = get().items.find((item) => item.id === id);

        if (!item) {
            return;
        }

        await get().updateItem(id, { flags: { ...item.flags, starred: !item.flags.starred } });
    },

    toggleSwitch(key) {
        set((state) => ({
            prefs: {
                ...state.prefs,
                switches: { ...state.prefs.switches, [key]: !state.prefs.switches[key] },
            },
        }));
        persist(get());
    },

    async trashVault() {
        const path = get().workspacePath ?? (await defaultVaultPath().catch(() => null));

        if (!path) {
            get().pushToast('There is no vault folder to delete.');

            return;
        }

        // Let go of the folder first: the engine holds a watcher and an index
        // open on it, and both would write back into a folder on its way out.
        await setWorkspace(null);

        try {
            const { invoke } = await import('@tauri-apps/api/core');

            await invoke('trash_path', { path });
        } catch (e) {
            // The vault is still there, so put the app back on it.
            await setWorkspace(get().workspacePath);
            get().pushToast(typeof e === 'string' ? e : 'Could not move the vault to the Trash.');

            return;
        }

        set({
            collections: [],
            detail: null,
            items: [],
            onboarded: false,
            onboardingStep: 'pick',
            recentItemIds: [],
            recentWorkspaces: get().recentWorkspaces.filter(
                (recentWorkspace) => recentWorkspace.path !== path,
            ),
            selectedId: null,
            settingsOpen: false,
            workspacePath: null,
        });
        persist(get());
        get().pushToast('The vault is in the Trash — recoverable until you empty it.');
    },

    async updateCollection(id, patch) {
        await getRepository().updateCollection(id, patch);
        await get().refresh();
    },

    async updateItem(id, patch) {
        await getRepository().updateItem(id, stampCompletion(currentItem(get(), id), patch));
        await get().refresh();
    },

    view: { kind: 'all', val: null },

    workspaceError: null,

    workspacePath: persisted.workspacePath,
}));
