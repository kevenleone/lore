// Core domain types for Lore's knowledge base.
// Shapes mirror the Claude Design prototype's seed data, with ISO timestamps
// added so the real app can derive relative `time` / human `date` at render.

export interface ChatMessage {
    id: string;
    role: 'ai' | 'user';
    sources?: ChatSource[];
    text: string;
}

export interface ChatSource {
    itemId: string;
}

export interface Collection {
    color: string;
    id: string;
    name: string;
}

/** The multi-select facets of `Filters` — the ones the bar toggles as chips. */
export type FilterFacet = 'categories' | 'collectionIds' | 'tags';

/**
 * The library filter bar's state, applied on top of the current `View` and the
 * search query. Every field is a widening choice within itself and a narrowing
 * one against the others: an item matches when it has *one of* the chosen tags
 * *and* one of the chosen categories *and* so on. Empty means "no constraint".
 */
export interface Filters {
    /** Item types, shown in the bar as "Category". */
    categories: ItemType[];
    collectionIds: string[];
    /** Local calendar day (`YYYY-MM-DD`), inclusive. Matched on `createdAt`. */
    from: null | string;
    tags: string[];
    /** Local calendar day (`YYYY-MM-DD`), inclusive. */
    to: null | string;
}

export type IconName = 'calendar' | 'file' | 'hash' | 'inbox' | 'layers' | 'star' | ItemType;

export interface Item {
    /**
     * The item's own content: the note/task/code text, or the user's notes on a
     * link. In the Markdown vault this is everything below the frontmatter.
     */
    body?: string;
    collectionId?: string;
    comments?: ItemComment[];
    /** ISO 8601. Display strings (`2m`, `Today, 14:30`) are derived at render. */
    createdAt: string;
    /** Soft-delete tombstone for future Convex sync. */
    deletedAt?: null | string;
    /** A link's own description (e.g. OpenGraph/meta description). */
    description?: string;
    domain?: string;
    flags: ItemFlags;
    id: string;
    /** Preview image URL (e.g. OpenGraph image for links). */
    image?: string;
    /**
     * Vault-relative file path, supplied by the store that owns the file. Read
     * only — renaming goes through `renameItem`, since it has to rewrite every
     * wikilink pointing here.
     */
    path?: string;
    points?: string[];
    related: string[];
    /**
     * Derived one-line preview for the list pane — `body`'s first line, or a
     * link's `description`/`url`. Computed on read by every repository and never
     * persisted; see `deriveSnippet`.
     */
    snippet?: string;
    /** AI-generated summary (distinct from a link's own description). */
    summary?: string;
    tags: string[];
    title: string;
    type: ItemType;
    updatedAt: string;
    /**
     * Where a link points. Links only — this used to share `snippet` with note
     * bodies, which is why `snippet` is now derived rather than stored.
     */
    url?: string;
}

/**
 * A note left on an item. Stored in the file's own frontmatter, so it travels
 * with the note rather than living in a database beside it.
 */
export interface ItemComment {
    /** ISO 8601. */
    at: string;
    author?: string;
    body: string;
    id: string;
}

export interface ItemFlags {
    /**
     * Ticked off in the focus queue. It stays on the item rather than removing
     * it from Today, so a finished task reads as finished instead of vanishing.
     */
    done?: boolean;
    inbox?: boolean;
    starred?: boolean;
    today?: boolean;
}

/**
 * Per-file facts the Properties panel shows, read straight off the index rather
 * than carried on `Item`: `listItems()` re-runs after every mutation, so putting
 * file stats on the item would cost the whole vault on each save.
 */
export interface ItemMeta {
    /** Items whose frontmatter `related` points at this one. */
    backlinks: Item[];
    /** ISO 8601, from the file's mtime on disk. */
    modifiedAt: string;
    path: string;
    /** Bytes on disk, frontmatter included. */
    size: number;
    words: number;
}

export type ItemType = 'code' | 'image' | 'link' | 'note' | 'task';

export const EMPTY_FILTERS: Filters = {
    categories: [],
    collectionIds: [],
    from: null,
    tags: [],
    to: null,
};

export interface TagCount {
    count: number;
    name: string;
}

export interface View {
    kind: ViewKind;
    /** collection id for `collection`, tag name for `tag`, else null. */
    val: null | string;
}

/** A library view: the four built-ins, a collection, or a tag. */
export type ViewKind = 'all' | 'collection' | 'inbox' | 'starred' | 'tag' | 'today';

/**
 * Lore's accent palette (`Lore Settings.dc.html` → Look & Feel → Accent).
 * Graphite is the brand default; Slate blue is the dark-mode substitute the
 * design swaps in for accents that are too dark on a dark ground.
 */
export const ACCENTS = ['#393A4A', '#5b5bd6', '#3f8f6a', '#c4553d', '#8a92b8'] as const;
export type Accent = (typeof ACCENTS)[number];
export const ACCENT_NAMES: Record<Accent, string> = {
    '#393A4A': 'Graphite',
    '#3f8f6a': 'Fern',
    '#5b5bd6': 'Indigo',
    '#8a92b8': 'Slate blue',
    '#c4553d': 'Clay',
};
export const DEFAULT_ACCENT: Accent = '#393A4A';

export type AiMode = 'cloud' | 'local';

/* ------------------------------------------------------------------ *
 * Onboarding / account
 * ------------------------------------------------------------------ */

/** Light/dark/system preference. `theme/tokens.ts` resolves `auto` at runtime. */
export type Appearance = 'auto' | 'dark' | 'light';

export interface Auth {
    /** Address the magic link went to, or the signed-in account's address. */
    email: null | string;
    mode: AuthMode;
    /** Display name, once an account exists. */
    name: null | string;
}

/**
 * How this install is signed in. `null` means onboarding has not finished —
 * `Lore Onboarding.dc.html` runs until the user picks a lane.
 */
export type AuthMode = 'account' | 'anonymous' | null;

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

export type Density = 'Compact' | 'Cozy' | 'Roomy';

export type NotificationStyle = 'Alert' | 'Banner';

/** Which card the onboarding sheet is showing. */
export type OnboardingStep = 'anon' | 'magic' | 'signin';
/**
 * Where an item goes when it is opened from Cards or Table. Neither view keeps
 * a permanent detail column, so opening one has to put it somewhere: over the
 * grid as a drawer, or in place of it as a full page.
 */
export type OpenMode = 'drawer' | 'page';
/** The ten panes in the settings sheet's rail, in order. */
export type SettingsPane =
    | 'about'
    | 'account'
    | 'cal'
    | 'capture'
    | 'focus'
    | 'general'
    | 'keys'
    | 'look'
    | 'notif'
    | 'sync';
/** List sort order. */
export type SortOrder = 'newest' | 'oldest' | 'title';

/** Every boolean switch in the settings sheet, keyed as in the design. */
export interface Switches {
    attachNotes: boolean;
    autoBreak: boolean;
    // Capture & AI
    autoSum: boolean;
    autoTag: boolean;
    calPersonal: boolean;
    calShared: boolean;
    calWork: boolean;
    chime: boolean;
    clip: boolean;
    // Look & Feel
    counts: boolean;
    // Notifications
    digest: boolean;
    // Focus
    dnd: boolean;
    dock: boolean;
    dueTasks: boolean;
    dupe: boolean;
    // Sync
    e2e: boolean;
    focusEnd: boolean;
    // General
    launch: boolean;
    logFocus: boolean;
    menubar: boolean;
    motion: boolean;
    preview: boolean;
    quiet: boolean;
    showFocus: boolean;
    // Calendar
    showTasks: boolean;
    sounds: boolean;
    syncErr: boolean;
    // Account
    touchid: boolean;
    wifi: boolean;
}

/** How the library pane lays its items out. */
export type ViewMode = 'cards' | 'list' | 'table';

export type WeekStart = 'Monday' | 'Sunday';

export const DEFAULT_SWITCHES: Switches = {
    attachNotes: true,
    autoBreak: true,
    autoSum: true,
    autoTag: true,
    calPersonal: true,
    calShared: false,
    calWork: true,
    chime: true,
    clip: true,
    counts: true,
    digest: true,
    dnd: true,
    dock: false,
    dueTasks: true,
    dupe: true,
    e2e: true,
    focusEnd: true,
    launch: true,
    logFocus: false,
    menubar: true,
    motion: false,
    preview: true,
    quiet: true,
    showFocus: true,
    showTasks: true,
    sounds: false,
    syncErr: true,
    touchid: true,
    wifi: false,
};

/** Focus-timer interval lengths, in minutes. */
export interface Durations {
    focus: number;
    long: number;
    short: number;
}

/**
 * Everything the settings sheet writes. Persisted to localStorage today; the
 * repository can take it over when there is a backend to hold it.
 */
export interface Prefs {
    accent: Accent;
    aiMode: AiMode;
    appearance: Appearance;
    density: Density;
    durations: Durations;
    longBreakAfter: number;
    notifStyle: NotificationStyle;
    openMode: OpenMode;
    /** Whether the right-hand Properties panel is showing. */
    propertiesOpen: boolean;
    switches: Switches;
    textSize: number;
    viewMode: ViewMode;
    weekStart: WeekStart;
}

export const DEFAULT_PREFS: Prefs = {
    accent: DEFAULT_ACCENT,
    aiMode: 'cloud',
    appearance: 'light',
    density: 'Cozy',
    durations: { focus: 25, long: 15, short: 5 },
    longBreakAfter: 4,
    notifStyle: 'Banner',
    openMode: 'drawer',
    propertiesOpen: false,
    switches: DEFAULT_SWITCHES,
    textSize: 1,
    viewMode: 'list',
    weekStart: 'Monday',
};

/* ------------------------------------------------------------------ *
 * Focus timer
 * ------------------------------------------------------------------ */

/** Granularity of the calendar view. */
export type CalendarScale = 'Day' | 'Month' | 'Week';

/**
 * Which interval the timer is in. The names double as keys into `Durations`,
 * so a phase resolves to its length without a lookup table.
 */
export type FocusPhase = 'focus' | 'long' | 'short';

/** A finished focus interval. Drawn on the calendar as a hatched block. */
export interface FocusSession {
    /** ISO 8601. */
    endedAt: string;
    id: string;
    /** ISO 8601. */
    startedAt: string;
    /** The item that was in "Working on" when the interval ran, if any. */
    taskId: null | string;
}

export interface FocusState {
    /**
     * Epoch ms the current interval ends at, while it runs. The countdown is
     * derived from the clock rather than accumulated from ticks, so a throttled
     * background tab does not make the timer run slow.
     */
    endsAt: null | number;
    phase: FocusPhase;
    /** Authoritative while paused; refreshed from `endsAt` on every tick. */
    remainingSec: number;
    running: boolean;
    /** 1-based position in the current cycle, up to `longBreakAfter`. */
    sessionIndex: number;
    /** ISO 8601, set when the running interval started. */
    startedAt: null | string;
    taskId: null | string;
}

/** Which surface the window's main area is showing. */
export type MainView = 'calendar' | 'library';
