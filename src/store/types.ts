// Core domain types for Baloon's knowledge base.
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

/** Accent options from the prototype's `accent` prop. */
export const ACCENTS = ["#5b5bd6", "#2f8f6b", "#c2622d", "#3a3a44"] as const;
export type Accent = (typeof ACCENTS)[number];
export const DEFAULT_ACCENT: Accent = "#5b5bd6";

/** List sort order. */
export type SortOrder = "newest" | "oldest" | "title";
