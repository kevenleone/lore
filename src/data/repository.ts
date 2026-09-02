// The storage/sync seam. Every UI and store interaction goes through a
// KnowledgeRepository, so the app is agnostic to where data lives:
//   - memoryRepository  — seed-backed, for the static UI phase and tests
//   - localRepository   — SQLite via @tauri-apps/plugin-sql (source of truth)
//   - vaultRepository   — the Markdown vault, via the Bun sidecar
//
// Keeping this interface narrow is what makes swapping the backing store a
// config change rather than a rewrite.
//
// `matchesView` used to live here; it moved to store/views.ts so the data layer
// no longer imports from the store and vice versa.

import type { Collection, Item, TagCount, View } from "../store/types";

export type NewItem = Omit<Item, "id" | "createdAt" | "updatedAt" | "deletedAt">;
export type ItemPatch = Partial<Omit<Item, "id" | "createdAt">>;
export type NewCollection = Omit<Collection, "id">;
export type CollectionPatch = Partial<Omit<Collection, "id">>;

export interface KnowledgeRepository {
  listItems(view?: View): Promise<Item[]>;
  getItem(id: string): Promise<Item | null>;
  createItem(input: NewItem): Promise<Item>;
  updateItem(id: string, patch: ItemPatch): Promise<Item>;
  deleteItem(id: string): Promise<void>;

  listCollections(): Promise<Collection[]>;
  createCollection(input: NewCollection): Promise<Collection>;
  updateCollection(id: string, patch: CollectionPatch): Promise<Collection>;
  /** Removes the collection and unfiles any items that referenced it. */
  deleteCollection(id: string): Promise<void>;

  listTags(): Promise<TagCount[]>;

  /**
   * Renames the file behind an item. Separate from `updateItem` because a
   * retitle deliberately leaves the filename alone — a rename rewrites every
   * inbound link and churns history, so it only happens when asked for.
   */
  renameItem?(id: string, stem: string): Promise<Item>;

  /** ⌘K full-text search across titles, snippets, summaries, tags. */
  search(query: string): Promise<Item[]>;

  /**
   * Optional reactive hook — implemented by the vault store's file watcher;
   * returns an unsubscribe.
   */
  subscribe?(cb: () => void): () => void;

  /** Releases connections/streams so a workspace switch can rebuild cleanly. */
  dispose?(): void | Promise<void>;
}
