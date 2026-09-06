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

import type { Collection, Item, ItemMeta, TagCount, View } from '../store/types';

export type CollectionPatch = Partial<Omit<Collection, 'id'>>;
export type ItemPatch = Partial<Omit<Item, 'createdAt' | 'id'>>;
export interface KnowledgeRepository {
    createCollection(input: NewCollection): Promise<Collection>;
    createItem(input: NewItem): Promise<Item>;
    /** Removes the collection and unfiles any items that referenced it. */
    deleteCollection(id: string): Promise<void>;
    deleteItem(id: string): Promise<void>;
    /** Releases connections/streams so a workspace switch can rebuild cleanly. */
    dispose?(): Promise<void> | void;

    getItem(id: string): Promise<Item | null>;
    /**
     * Per-file facts for the Properties panel. Optional: only the vault knows a
     * file's size or who links to it, so the other stores simply do not answer.
     */
    itemMeta?(id: string): Promise<ItemMeta | null>;
    listCollections(): Promise<Collection[]>;
    listItems(view?: View): Promise<Item[]>;
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

    updateCollection(id: string, patch: CollectionPatch): Promise<Collection>;

    updateItem(id: string, patch: ItemPatch): Promise<Item>;

    /**
     * Copies a captured file into the store and answers with the reference an
     * item's `image` holds — a vault-relative path for the vault, an object URL
     * for the in-memory store. Optional: only stores that own files can do it.
     */
    uploadAttachment?(file: File): Promise<string>;

    /**
     * The same, for a file the user addressed by URL rather than picked: the
     * store fetches it and keeps a copy, so the item does not depend on the
     * page it came from staying up.
     */
    uploadAttachmentFromUrl?(url: string): Promise<string>;
}
export type NewCollection = Omit<Collection, 'id'>;

export type NewItem = Omit<Item, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>;
