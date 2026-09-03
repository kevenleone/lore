// In-memory repository backed by the seed data. Used for the static UI phase
// and unit tests; the SQLite-backed localRepository replaces it as the real
// source of truth in Phase 3.

import type { Collection, Item, TagCount, View } from '../store/types';

import { SEED_COLLECTIONS, SEED_ITEMS } from '../store/seed';
import { matchesView } from '../store/views';
import { withDerived, withoutBody } from './derive';
import {
    type CollectionPatch,
    type ItemPatch,
    type KnowledgeRepository,
    type NewCollection,
    type NewItem,
} from './repository';

export class MemoryRepository implements KnowledgeRepository {
    private collections: Collection[];
    private items: Item[];
    private seq = 0;

    constructor(items: Item[] = SEED_ITEMS, collections: Collection[] = SEED_COLLECTIONS) {
        // Clone so callers can't mutate the seed module's arrays.
        this.items = items.map((i) => ({ ...i }));
        this.collections = collections.map((c) => ({ ...c }));
    }

    async createCollection(input: NewCollection): Promise<Collection> {
        const collection: Collection = { ...input, id: `c_${Date.now()}_${this.seq++}` };
        this.collections.push(collection);
        return { ...collection };
    }

    async createItem(input: NewItem): Promise<Item> {
        const now = new Date().toISOString();
        const item: Item = {
            ...input,
            createdAt: now,
            deletedAt: null,
            id: `i_${Date.now()}_${this.seq++}`,
            updatedAt: now,
        };
        this.items.unshift(item);
        return withDerived(item);
    }

    async deleteCollection(id: string): Promise<void> {
        this.collections = this.collections.filter((c) => c.id !== id);
        for (const item of this.items) {
            if (item.collectionId === id) item.collectionId = undefined;
        }
    }

    async deleteItem(id: string): Promise<void> {
        const item = this.items.find((i) => i.id === id);
        if (item) item.deletedAt = new Date().toISOString();
    }

    async getItem(id: string): Promise<Item | null> {
        return this.live().find((i) => i.id === id) ?? null;
    }

    async listCollections(): Promise<Collection[]> {
        return this.collections.map((c) => ({ ...c }));
    }

    async listItems(view?: View): Promise<Item[]> {
        const all = this.live();
        const filtered = view ? all.filter((i) => matchesView(i, view)) : all;
        // Newest first (createdAt desc) to match the prototype's ordering.
        // Bodies are fetched per item by getItem — see derive.withoutBody.
        return filtered
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map(withoutBody);
    }

    async listTags(): Promise<TagCount[]> {
        const counts = new Map<string, number>();
        for (const item of this.live()) {
            for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
        return [...counts.entries()].map(([name, count]) => ({ count, name }));
    }

    async search(query: string): Promise<Item[]> {
        const q = query.trim().toLowerCase();
        if (!q) return this.listItems();
        return this.live().filter((i) => {
            const haystack = [
                i.title,
                i.domain ?? '',
                i.body ?? '',
                i.url ?? '',
                i.summary ?? '',
                i.tags.join(' '),
            ]
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }

    async updateCollection(id: string, patch: CollectionPatch): Promise<Collection> {
        const collection = this.collections.find((c) => c.id === id);
        if (!collection) throw new Error(`Collection not found: ${id}`);
        Object.assign(collection, patch);
        return { ...collection };
    }

    async updateItem(id: string, patch: ItemPatch): Promise<Item> {
        const item = this.items.find((i) => i.id === id);
        if (!item) throw new Error(`Item not found: ${id}`);
        Object.assign(item, patch, { updatedAt: new Date().toISOString() });
        return withDerived(item);
    }

    private live(): Item[] {
        // `snippet` / `domain` are derived, never stored — same rule as every
        // other repository, so tests exercise the real shape.
        return this.items.filter((i) => !i.deletedAt).map(withDerived);
    }
}
