// Core domain types for Lore's knowledge base.
// Shapes mirror the Claude Design prototype's seed data, with ISO timestamps
// added so the real app can derive relative `time` / human `date` at render.

import type { ThemeId } from '../theme/themes';

import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME } from '../theme/themes';

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
    /**
     * Deadline, as a local calendar day (`YYYY-MM-DD`). Day-granular on purpose:
     * a due date is a day, while `schedule` is where an item sits on the
     * calendar's clock. The two are independent.
     */
    dueAt?: string;
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
    /** Absent means `'normal'`, so an ordinary item carries no priority at all. */
    priority?: Priority;
    related: string[];
    /**
     * Derived one-line preview for the list pane — `body`'s first line, or a
     * link's `description`/`url`. Computed on read by every repository and never
     * persisted; see `deriveSnippet`.
     */
    snippet?: string;
    /**
     * Set when the body is a cached copy of a document that lives somewhere else.
     * Its presence is what makes an item read-only; dropping it is how the user
     * takes ownership of the text.
     */
    source?: ItemSource;
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

/**
 * Where a virtual document's body came from. `ref` is usually `HEAD`, which
 * tracks the repository's default branch rather than pinning a branch name.
 */
export interface ItemSource {
    /** ISO 8601 timestamp of the last successful fetch. */
    fetched: string;
    kind: 'github';
    /** The URL the Markdown is read from. */
    raw: string;
    ref: string;
}

export type ItemType = 'code' | 'image' | 'link' | 'note' | 'task';

/** A task's urgency. `'normal'` is the default and is never persisted. */
export type Priority = 'high' | 'low' | 'normal' | 'urgent';

export const PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent'];

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
export const ACCENTS = [
    '#393A4A',
    '#5b5bd6',
    '#3f8f6a',
    '#237a7a',
    '#c4553d',
    '#96661f',
    '#8a92b8',
] as const;
export type Accent = (typeof ACCENTS)[number];
export const ACCENT_NAMES: Record<Accent, string> = {
    '#237a7a': 'Teal',
    '#393A4A': 'Graphite',
    '#3f8f6a': 'Fern',
    '#5b5bd6': 'Indigo',
    '#8a92b8': 'Slate blue',
    '#96661f': 'Ochre',
    '#c4553d': 'Clay',
};
export const DEFAULT_ACCENT: Accent = '#393A4A';

/* ------------------------------------------------------------------ *
 * Onboarding
 * ------------------------------------------------------------------ */

/** Light/dark/system preference. `theme/tokens.ts` resolves `auto` at runtime. */
export type Appearance = 'auto' | 'dark' | 'light';

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

export type Density = 'Compact' | 'Cozy' | 'Roomy';

export type NotificationStyle = 'Alert' | 'Banner';

/**
 * Which card the onboarding sheet is showing: the three ways in, the
 * new-vault form, or the existing-folder list.
 */
export type OnboardingStep = 'create' | 'open' | 'pick';

/**
 * Where an item goes when it is opened from Cards or Table. Neither view keeps
 * a permanent detail column, so opening one has to put it somewhere: over the
 * grid as a drawer, or in place of it as a full page.
 */
export type OpenMode = 'drawer' | 'page';
/** The panes in the settings sheet's rail, in order. */
export type SettingsPane =
    'about' | 'cal' | 'capture' | 'focus' | 'general' | 'keys' | 'look' | 'notif' | 'vault';
/** List sort order. */
export type SortOrder = 'newest' | 'oldest' | 'title';
/**
 * Every boolean switch in the settings sheet. A key earns its place here only
 * once something outside `components/settings/` reads it — `switches.test.ts`
 * fails when one loses its last reader, so a toggle can never quietly become
 * decoration again.
 */
export interface Switches {
    autoBreak: boolean;
    // Capture & AI
    autoSum: boolean;
    /** Edit note bodies in the block editor rather than a plain textarea. */
    blockEditor: boolean;
    // Look & Feel
    counts: boolean;
    focusEnd: boolean;
    // Focus
    logFocus: boolean;
    motion: boolean;
    quiet: boolean;
    /** Open the block editor in raw Markdown mode. */
    rawMarkdownDefault: boolean;
    showFocus: boolean;
    // Calendar
    showTasks: boolean;
    // Notifications
    sounds: boolean;
    statusBar: boolean;
}

/** What onboarding decided about the vault, handed to `finishOnboarding`. */
export interface VaultSetup {
    /** Run `git init` in the folder once it exists. */
    git: boolean;
    /** The folder to hold the vault; null keeps the default one beside app data. */
    path: null | string;
    /** Write the sample library, for the "start from a starter vault" lane. */
    starter: boolean;
}

/** How the library pane lays its items out. */
export type ViewMode = 'cards' | 'list' | 'table';

export type WeekStart = 'Monday' | 'Sunday';

export const DEFAULT_SWITCHES: Switches = {
    autoBreak: true,
    autoSum: true,
    blockEditor: false,
    counts: true,
    focusEnd: true,
    logFocus: false,
    motion: false,
    quiet: true,
    rawMarkdownDefault: false,
    showFocus: true,
    showTasks: true,
    sounds: false,
    statusBar: true,
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
    appearance: Appearance;
    /** The theme style used whenever the effective mode is dark. */
    darkTheme: ThemeId;
    /**
     * The tab a capture opens on. `'auto'` leaves the surface to decide: the
     * command bar infers the type from what was typed, the composer opens on
     * Link.
     */
    defaultCaptureType: 'auto' | ItemType;
    /** Collection new captures are filed into; null means the Inbox. */
    defaultCollection: null | string;
    density: Density;
    durations: Durations;
    /** The theme style used whenever the effective mode is light. */
    lightTheme: ThemeId;
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
    appearance: 'light',
    darkTheme: DEFAULT_DARK_THEME,
    defaultCaptureType: 'auto',
    defaultCollection: null,
    density: 'Cozy',
    durations: { focus: 25, long: 15, short: 5 },
    lightTheme: DEFAULT_LIGHT_THEME,
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

/** A transient confirmation, shown for `TOAST_MS` and then dropped. */
export interface Toast {
    id: string;
    message: string;
}
