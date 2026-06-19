// The storage/sync seam. Every UI and store interaction goes through a
// KnowledgeRepository, so the app is agnostic to where data lives:
//   - memoryRepository  — seed-backed, for the static UI phase and tests
//   - localRepository   — SQLite via @tauri-apps/plugin-sql (source of truth)
//   - convexRepository  — optional remote sync (deferred)
//
// Keeping this interface narrow is what makes "offline-first now, Convex later"
// a config swap rather than a rewrite.

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

  /** ⌘K full-text search across titles, snippets, summaries, tags. */
  search(query: string): Promise<Item[]>;

  /** Optional reactive hook (Convex provides this); returns an unsubscribe. */
  subscribe?(cb: () => void): () => void;
}

/** Apply a view filter to an item list (shared by every repository impl). */
export function matchesView(item: Item, view: View): boolean {
  switch (view.kind) {
    case "all":
      return true;
    case "inbox":
      return !!item.flags.inbox;
    case "today":
      return !!item.flags.today;
    case "starred":
      return !!item.flags.starred;
    case "collection":
      return item.collectionId === view.val;
    case "tag":
      return !!view.val && item.tags.includes(view.val);
    default:
      return true;
  }
}
