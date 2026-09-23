// The storage/sync seam. Every UI and store interaction goes through a
// KnowledgeRepository, so the app is agnostic to where data lives:
//   - memoryRepository  — seed-backed, for the static UI phase and tests
//   - vaultRepository   — the Markdown vault, via the Bun sidecar (source of truth)
//
// Keeping this interface narrow is what makes swapping the backing store a
// config change rather than a rewrite.
//
// `matchesView` used to live here; it moved to store/views.ts so the data layer
// no longer imports from the store and vice versa.

import type {
    BoardConfig,
    Collection,
    Item,
    ItemMeta,
    SavedSearch,
    TagCount,
    Template,
    View,
} from '../store/types';

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
    /**
     * Copies the vault's own files into a folder the user picked, leaving the
     * derived index behind. Optional: only a store backed by files has anything
     * to export.
     */
    exportTo?(path: string): Promise<{ files: number; path: string }>;
    getItem(id: string): Promise<Item | null>;
    /**
     * Per-file facts for the Properties panel. Optional: only the vault knows a
     * file's size or who links to it, so the other stores simply do not answer.
     */
    itemMeta?(id: string): Promise<ItemMeta | null>;
    /**
     * Every board, keyed by collection id; `UNFILED_BOARD` is the one for tasks
     * in no collection. A board with no entry uses `DEFAULT_BOARD`, so a vault
     * that has never had a column edited stores nothing at all.
     *
     * Optional, alongside `itemMeta` and `exportTo`: a store with nowhere to put
     * a board answers with nothing rather than with a lie, and every board falls
     * back to the default columns.
     */
    listBoards?(): Promise<Record<string, BoardConfig>>;
    listCollections(): Promise<Collection[]>;
    listItems(view?: View): Promise<Item[]>;

    /**
     * The vault's named searches. Optional: a store with nowhere to keep them
     * answers with nothing and the sidebar simply has no Saved section.
     */
    listSavedSearches?(): Promise<SavedSearch[]>;

    listTags(): Promise<TagCount[]>;

    /**
     * The skeletons in `.lore/templates/`. Optional: a store with no folder
     * behind it has none, and the New menu simply offers only the blank item.
     */
    listTemplates?(): Promise<Template[]>;

    /**
     * Re-reads a virtual document from its origin. Safe to call on every open —
     * the engine holds the interval and answers with the item either way.
     */
    refreshItem?(id: string): Promise<Item>;

    /**
     * Re-reads every file and brings the index back in line with them. Optional:
     * only a store with an index derived from something else can drift from it.
     */
    reindex?(): Promise<ReindexResult>;

    /**
     * Renames the file behind an item. Separate from `updateItem` because a
     * retitle deliberately leaves the filename alone — a rename rewrites every
     * inbound link and churns history, so it only happens when asked for.
     */
    renameItem?(id: string, stem: string): Promise<Item>;

    /** Replaces one board; null drops it back to `DEFAULT_BOARD`. Optional. */
    saveBoard?(id: string, board: BoardConfig | null): Promise<void>;

    /**
     * Replaces the whole list. They are renamed and reordered as a set, so
     * writing one at a time would buy nothing but a merge problem.
     */
    saveSavedSearches?(searches: readonly SavedSearch[]): Promise<void>;

    /** ⌘K full-text search across titles, snippets, summaries, tags. */
    search(query: string): Promise<Item[]>;

    /** Bytes on disk, split into the vault's own files and the index. */
    size?(): Promise<VaultSize>;

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
}
export type NewCollection = Omit<Collection, 'id'>;

export type NewItem = Omit<Item, 'createdAt' | 'deletedAt' | 'id' | 'updatedAt'>;

export interface ReindexResult {
    /** Files whose contents were read back into the index. */
    indexed: number;
    /** Rows dropped because the file behind them is gone. */
    removed: number;
}

export interface VaultSize {
    /** Bytes outside `.lore/`: the Markdown and anything pasted beside it. */
    content: number;
    /** Bytes under `.lore/` — the index, rebuilt whenever it is missing. */
    derived: number;
    files: number;
}
