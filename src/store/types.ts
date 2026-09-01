// Core domain types for Lore's knowledge base.
// Shapes mirror the Claude Design prototype's seed data, with ISO timestamps
// added so the real app can derive relative `time` / human `date` at render.

export type ItemType = "link" | "note" | "task" | "code" | "image";

export type IconName =
  | ItemType
  | "file"
  | "inbox"
  | "layers"
  | "calendar"
  | "star"
  | "hash";

export interface ItemFlags {
  inbox?: boolean;
  today?: boolean;
  starred?: boolean;
}

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  domain?: string;
  collectionId?: string;
  tags: string[];
  flags: ItemFlags;
  /** AI-generated summary (distinct from a link's own description). */
  summary?: string;
  points?: string[];
  /**
   * Where a link points. Links only — this used to share `snippet` with note
   * bodies, which is why `snippet` is now derived rather than stored.
   */
  url?: string;
  /**
   * The item's own content: the note/task/code text, or the user's notes on a
   * link. In the Markdown vault this is everything below the frontmatter.
   */
  body?: string;
  /**
   * Derived one-line preview for the list pane — `body`'s first line, or a
   * link's `description`/`url`. Computed on read by every repository and never
   * persisted; see `deriveSnippet`.
   */
  snippet?: string;
  /** A link's own description (e.g. OpenGraph/meta description). */
  description?: string;
  /** Preview image URL (e.g. OpenGraph image for links). */
  image?: string;
  related: string[];
  /** ISO 8601. Display strings (`2m`, `Today, 14:30`) are derived at render. */
  createdAt: string;
  updatedAt: string;
  /** Soft-delete tombstone for future Convex sync. */
  deletedAt?: string | null;
}

export interface Collection {
  id: string;
  name: string;
  color: string;
}

export interface TagCount {
  name: string;
  count: number;
}

/** A library view: the four built-ins, a collection, or a tag. */
export type ViewKind =
  | "all"
  | "inbox"
  | "today"
  | "starred"
  | "collection"
  | "tag";

export interface View {
  kind: ViewKind;
  /** collection id for `collection`, tag name for `tag`, else null. */
  val: string | null;
}

export interface ChatSource {
  itemId: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  sources?: ChatSource[];
}

/**
 * Lore's accent palette (`Lore Settings.dc.html` → Look & Feel → Accent).
 * Graphite is the brand default; Slate blue is the dark-mode substitute the
 * design swaps in for accents that are too dark on a dark ground.
 */
export const ACCENTS = ["#393A4A", "#5b5bd6", "#3f8f6a", "#c4553d", "#8a92b8"] as const;
export type Accent = (typeof ACCENTS)[number];
export const ACCENT_NAMES: Record<Accent, string> = {
  "#393A4A": "Graphite",
  "#5b5bd6": "Indigo",
  "#3f8f6a": "Fern",
  "#c4553d": "Clay",
  "#8a92b8": "Slate blue",
};
export const DEFAULT_ACCENT: Accent = "#393A4A";

/** List sort order. */
export type SortOrder = "newest" | "oldest" | "title";

/* ------------------------------------------------------------------ *
 * Onboarding / account
 * ------------------------------------------------------------------ */

/**
 * How this install is signed in. `null` means onboarding has not finished —
 * `Lore Onboarding.dc.html` runs until the user picks a lane.
 */
export type AuthMode = "account" | "anonymous" | null;

/** Which card the onboarding sheet is showing. */
export type OnboardingStep = "signin" | "anon" | "magic";

export interface Auth {
  mode: AuthMode;
  /** Address the magic link went to, or the signed-in account's address. */
  email: string | null;
  /** Display name, once an account exists. */
  name: string | null;
}

/* ------------------------------------------------------------------ *
 * Settings
 * ------------------------------------------------------------------ */

export type Density = "Cozy" | "Compact" | "Roomy";
export type NotificationStyle = "Banner" | "Alert";
export type AiMode = "cloud" | "local";
export type WeekStart = "Monday" | "Sunday";

/** The ten panes in the settings sheet's rail, in order. */
export type SettingsPane =
  | "general"
  | "account"
  | "look"
  | "keys"
  | "notif"
  | "capture"
  | "sync"
  | "focus"
  | "cal"
  | "about";

/** Every boolean switch in the settings sheet, keyed as in the design. */
export interface Switches {
  // General
  launch: boolean;
  menubar: boolean;
  dock: boolean;
  clip: boolean;
  // Account
  touchid: boolean;
  // Look & Feel
  counts: boolean;
  motion: boolean;
  // Notifications
  digest: boolean;
  dueTasks: boolean;
  focusEnd: boolean;
  syncErr: boolean;
  sounds: boolean;
  quiet: boolean;
  // Capture & AI
  autoSum: boolean;
  autoTag: boolean;
  preview: boolean;
  dupe: boolean;
  // Sync
  e2e: boolean;
  wifi: boolean;
  // Focus
  dnd: boolean;
  autoBreak: boolean;
  chime: boolean;
  logFocus: boolean;
  // Calendar
  showTasks: boolean;
  showFocus: boolean;
  attachNotes: boolean;
  calWork: boolean;
  calPersonal: boolean;
  calShared: boolean;
}

export const DEFAULT_SWITCHES: Switches = {
  launch: true, menubar: true, dock: false, clip: true,
  touchid: true,
  counts: true, motion: false,
  digest: true, dueTasks: true, focusEnd: true, syncErr: true, sounds: false, quiet: true,
  autoSum: true, autoTag: true, preview: true, dupe: true,
  e2e: true, wifi: false,
  dnd: true, autoBreak: true, chime: true, logFocus: false,
  showTasks: true, showFocus: true, attachNotes: true,
  calWork: true, calPersonal: true, calShared: false,
};

/** Focus-timer interval lengths, in minutes. */
export interface Durations {
  focus: number;
  short: number;
  long: number;
}

/**
 * Everything the settings sheet writes. Persisted to localStorage today; the
 * repository can take it over when there is a backend to hold it.
 */
export interface Prefs {
  appearance: import("../theme/tokens").Appearance;
  accent: Accent;
  density: Density;
  textSize: number;
  notifStyle: NotificationStyle;
  aiMode: AiMode;
  weekStart: WeekStart;
  longBreakAfter: number;
  durations: Durations;
  switches: Switches;
}

export const DEFAULT_PREFS: Prefs = {
  appearance: "light",
  accent: DEFAULT_ACCENT,
  density: "Cozy",
  textSize: 1,
  notifStyle: "Banner",
  aiMode: "cloud",
  weekStart: "Monday",
  longBreakAfter: 4,
  durations: { focus: 25, short: 5, long: 15 },
  switches: DEFAULT_SWITCHES,
};
