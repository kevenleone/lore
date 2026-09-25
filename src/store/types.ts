// Core domain types for Lore's knowledge base.
// Shapes mirror the Claude Design prototype's seed data, with ISO timestamps
// added so the real app can derive relative `time` / human `date` at render.

import type { ThemeId } from '../theme/themes';

import { DEFAULT_DARK_THEME, DEFAULT_LIGHT_THEME } from '../theme/themes';

/**
 * A board column. The `id` is what a task's `status` holds, so renaming a
 * column leaves every card where it is.
 */
export interface BoardColumnConfig {
    /** Header tint; absent uses the neutral one. */
    color?: string;
    /**
     * Cards here are finished. Dropping one writes `done` and dragging it out
     * clears it, so Today, the counts and the focus queue stay true while the
     * column itself can be renamed, moved, or left out.
     */
    done?: boolean;
    id: string;
    name: string;
}

/**
 * A collection's board. Boards are per collection because a project's columns
 * are the project's own — "Needs review" means nothing to the reading list.
 */
export interface BoardConfig {
    columns: BoardColumnConfig[];
    view: BoardViewMode;
}

/** How a board lays its cards out. */
export type BoardViewMode = 'cards' | 'list';

/** Fields a capture surface should open with, set by whatever asked for it. */
export interface CapturePreset {
    collectionId: null | string;
    /**
     * Whether the column completes the task. A task captured into the Done
     * column has to arrive already `done`, or `boardColumnFor` reads it as an
     * open task sitting in the completing column and puts it back in the first
     * one — which looked like the column refusing to take a new task at all.
     */
    done?: boolean;
    /** The board column the new task lands in. */
    status?: string;
    type: ItemType;
}

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

export type IconName =
    'board' | 'calendar' | 'file' | 'globe' | 'inbox' | 'layers' | 'sun' | 'tag' | ItemType;

/**
 * A picked photo's attribution. Unsplash's API terms require the photographer's
 * name to link to their profile and the word Unsplash to link back, both
 * carrying the app's UTM parameters — so the name alone is not enough to store.
 */
export interface ImageCredit {
    name: string;
    /** The photographer's profile page, without UTM; `creditLinks` adds those. */
    profileUrl: string;
    provider: 'unsplash';
}

export interface Item {
    /**
     * The item's own content: the note/task/code text, or the user's notes on a
     * link. In the Markdown vault this is everything below the frontmatter.
     */
    body?: string;
    collectionId?: string;
    comments?: ItemComment[];
    /**
     * ISO 8601, stamped when `done` is turned on and cleared when it is turned
     * off. `updatedAt` is the file's last write, so a task edited months later
     * would claim to have been finished then — the timeline needs a date that
     * only moves when the task actually finishes.
     */
    completedAt?: string;
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
     * Who took `image`, when it came from a stock provider. Present only for a
     * picked photo: an OpenGraph image is the page's own and needs no credit.
     */
    imageCredit?: ImageCredit;
    /**
     * Vault-relative file path, supplied by the store that owns the file. Read
     * only — renaming goes through `renameItem`, since it has to rewrite every
     * wikilink pointing here.
     */
    path?: string;
    points?: string[];
    /** Absent means `'normal'`, so an ordinary item carries no priority at all. */
    priority?: Priority;
    /**
     * The item's own prose, above any checklist. Derived from `body` and never
     * persisted — a board card shows it as the task's description.
     */
    prose?: string;
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
    /**
     * Which board column this task sits in — a `BoardColumnConfig` id. A task
     * whose status names no column on its board falls into the first one.
     */
    status?: string;
    /**
     * Checklist tally, derived from `body` the way `snippet` is. A listed item
     * carries no body, and a board card has to draw a progress bar without one.
     */
    subtasks?: SubtaskCount;
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
 * Per-file facts the detail pane shows, read straight off the index rather
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
    /**
     * Frontmatter `related` entries pointing at nothing this vault holds, kept
     * verbatim. Usually a note not written yet rather than a mistake, which is
     * why the detail pane names them rather than hiding them: a link that shows
     * nothing at all is how a typo survives for months.
     */
    unresolved: string[];
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

/** A task's checklist tally, derived from its body and never persisted. */
export interface SubtaskCount {
    done: number;
    total: number;
}

/**
 * The board every collection starts with. Copied on first edit rather than
 * shared, so changing one board cannot move another's cards.
 */
export const DEFAULT_BOARD: BoardConfig = {
    columns: [
        { id: 'todo', name: 'To do' },
        { id: 'doing', name: 'In progress' },
        { done: true, id: 'done', name: 'Done' },
    ],
    view: 'cards',
};

/**
 * The board holding tasks that are in no collection. A collection id is a
 * folder name, which can never be empty, so this can never collide with one.
 */
export const UNFILED_BOARD = '';

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

/** The vault's link structure, as the graph surface draws it. */
export interface Graph {
    edges: GraphEdge[];
    nodes: GraphNode[];
}

export interface GraphEdge {
    source: string;
    target: string;
    /**
     * Where the link was written. A curated `related` entry and a mention in the
     * prose are both edges, but they are not the same claim, so the graph draws
     * them differently.
     */
    via: 'body' | 'related';
}

export interface GraphNode {
    /** How many edges touch it, in either direction. Sets the dot's size. */
    degree: number;
    id: string;
    title: string;
    type: ItemType;
}

/**
 * A named library state — the sidebar view, the filter bar and the query,
 * together. Stored in `.lore/workspace.json`, so a search travels with the
 * folder the way collection colours and boards do rather than living in this
 * machine's preferences.
 */
export interface SavedSearch {
    filters: Filters;
    id: string;
    name: string;
    /** The text query. Empty when the search is purely faceted. */
    query: string;
    view: View;
}

export interface TagCount {
    count: number;
    name: string;
}

/**
 * A skeleton for a new item, read from a Markdown file in `.lore/templates/`.
 * The file's frontmatter says what kind of item it makes; its body is the body,
 * placeholders and all.
 */
export interface Template {
    body: string;
    collectionId?: string;
    /** The file's stem, which is what the New menu shows. */
    name: string;
    tags: string[];
    /** Seeds the title. Left out when the template does not suggest one. */
    title?: string;
    type: ItemType;
}

export interface View {
    kind: ViewKind;
    /** collection id for `collection`, tag name for `tag`, else null. */
    val: null | string;
}

/**
 * A library view: a built-in, a collection, or a tag.
 *
 * `notes`, `links` and `files` are type reads — the sidebar's Library section
 * names every type an item can be except `task`, which has a surface of its
 * own. `files` is the remainder: the items that are a blob rather than prose or
 * a URL.
 */
export type ViewKind =
    'all' | 'collection' | 'files' | 'inbox' | 'links' | 'notes' | 'starred' | 'tag' | 'today';

/** The item types the `files` view gathers. */
export const FILE_TYPES: ItemType[] = ['code', 'image'];

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

/** Where the detail pane puts an item's thumbnail. */
export type BannerPlacement = 'cover' | 'inline';

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
    /** Edit note bodies in the block editor rather than a plain textarea. */
    blockEditor: boolean;
    /**
     * Hairlines down the left of nested collections, marking where a branch
     * begins. A vault of flat folders never draws one either way, so this only
     * ever matters once folders hold folders.
     */
    collectionRails: boolean;
    // Look & Feel
    counts: boolean;
    /**
     * Show a note's `summary`, `points` and `related` sections in the detail
     * pane. Named for what it does: nothing in Lore writes those fields, so a
     * switch called `autoSum` promising a summary after every capture was the
     * design's copy rather than the behaviour.
     */
    // Capture & AI
    detailSections: boolean;
    focusEnd: boolean;
    /**
     * Registered as a login item. The login item itself is the truth; this is
     * reconciled against it on boot, see `useStartupPrefs`.
     *
     * Named apart from the `launch` the design shipped, which no code read:
     * that key defaulted to true, so honouring a stored copy of it would
     * register a login item for everyone who upgrades. Same for `menuBarIcon`.
     */
    // General
    launchAtLogin: boolean;
    // Focus
    logFocus: boolean;
    /** Lore has a menu-bar icon. */
    menuBarIcon: boolean;
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
    blockEditor: false,
    collectionRails: true,
    counts: true,
    detailSections: true,
    focusEnd: true,
    launchAtLogin: false,
    logFocus: false,
    menuBarIcon: true,
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
    bannerPlacement: BannerPlacement;
    /** Collections whose children are folded away in the sidebar, by path. */
    collapsedCollections: string[];
    /**
     * Collection today's note is written into; null leaves it at the vault
     * root. Its own setting rather than `defaultCollection`: a journal is
     * usually kept apart from whatever captures happen to be landing.
     */
    dailyNoteCollection: null | string;
    /**
     * Template today's note starts from, by name; null writes it empty. A name
     * that no longer matches a file is treated as null, so deleting a template
     * does not break the hotkey.
     */
    dailyNoteTemplate: null | string;
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
    /**
     * Unsplash Access Key for the thumbnail picker. Null disables the search
     * outright — nothing reaches Unsplash until a key is pasted in Settings.
     */
    unsplashKey: null | string;
    viewMode: ViewMode;
    weekStart: WeekStart;
}

export const DEFAULT_PREFS: Prefs = {
    accent: DEFAULT_ACCENT,
    appearance: 'light',
    bannerPlacement: 'inline',
    collapsedCollections: [],
    dailyNoteCollection: null,
    dailyNoteTemplate: null,
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
    unsplashKey: null,
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
export type MainView = 'calendar' | 'graph' | 'library' | 'tasks';

/**
 * The tabs inside the Tasks surface. `board` holds both the overview and a
 * single collection's board — a project *is* a board, so they are one tab with
 * two states rather than two tabs indexing the same list of collections.
 */
export type TaskView = 'board' | 'summary' | 'upcoming';

/** A transient confirmation, shown for `TOAST_MS` and then dropped. */
export interface Toast {
    /**
     * An optional next step. A toast reporting a file it just wrote is the one
     * moment the user wants to go look at it, and the path is only known here.
     */
    action?: ToastAction;
    id: string;
    message: string;
}

export interface ToastAction {
    label: string;
    run: () => void;
}
