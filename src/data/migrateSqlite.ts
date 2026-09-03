// One-shot import of the legacy `lore.db` into the Markdown vault.
//
// Runs in the renderer because that is the only place holding a plugin-sql
// handle. It never deletes the database — it renames it, because for a user
// mid-upgrade that file is the only copy of their library.

import type { Collection, Item } from '../store/types';

import { request } from './sidecarClient';

/**
 * Stores to import from.
 *
 * Only `lore.db`. `baloon.db` predates the rename and is deliberately left
 * alone: renaming the database started a fresh, re-seeded `lore.db`, so a user
 * who upgraded through it has the same nine sample items in both. Importing
 * both would silently duplicate every one of them, and there is no way to tell
 * a re-seeded sample from a real capture that happens to share its title.
 *
 * The old file is never touched, so anything genuinely in it can still be
 * recovered by hand.
 */
const LEGACY_DBS = ['lore.db'] as const;

export interface MigrationResult {
    collections: number;
    items: number;
    /** Which stores were imported, for the notice. */
    sources: string[];
}

interface LegacyCollectionRow {
    color: string;
    id: string;
    name: string;
}

/** Shape of a legacy row, before the url/body split. */
interface LegacyItemRow {
    body: null | string;
    collection_id: null | string;
    created_at: string;
    description: null | string;
    domain: null | string;
    flags: string;
    id: string;
    image: null | string;
    points: null | string;
    related: string;
    snippet: null | string;
    summary: null | string;
    tags: string;
    title: string;
    type: string;
    updated_at: string;
    url: null | string;
}

const json = <T>(raw: null | string, fallback: T): T => {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
};

interface LegacyDb {
    close(): Promise<boolean>;
    select<T>(query: string): Promise<T>;
}

/**
 * Legacy row → domain item.
 *
 * `snippet` used to hold a link's URL and a note's body in the same column, so
 * this is where that finally comes apart for good. Phase 0 added the columns
 * and backfilled them, but a database from before that still needs the split.
 */
export function legacyRowToItem(r: LegacyItemRow, collectionName: (id: string) => string): Item {
    const isLink = r.type === 'link';
    return {
        body: r.body ?? (isLink ? undefined : (r.snippet ?? undefined)),
        // The collection becomes a folder, so it is keyed by name from here on.
        collectionId: r.collection_id ? collectionName(r.collection_id) : undefined,
        createdAt: r.created_at,
        description: r.description ?? undefined,
        domain: r.domain ?? undefined,
        flags: json<Item['flags']>(r.flags, {}),
        id: r.id,
        image: r.image ?? undefined,
        points: r.points ? json<string[]>(r.points, []) : undefined,
        related: json<string[]>(r.related, []),
        summary: r.summary ?? undefined,
        tags: json<string[]>(r.tags, []),
        title: r.title,
        type: r.type as Item['type'],
        updatedAt: r.updated_at,
        url: r.url ?? (isLink ? (r.snippet ?? undefined) : undefined),
    };
}

/**
 * Imports every legacy store into the open vault.
 *
 * Returns null when there was nothing anywhere, so the caller can treat "clean
 * install" and "already imported" alike. Each store is renamed only after its
 * own import succeeds, so a failure part-way leaves the rest recoverable.
 */
export async function migrateSqlite(): Promise<MigrationResult | null> {
    let items = 0;
    let collections = 0;
    const sources: string[] = [];

    for (const file of LEGACY_DBS) {
        const imported = await migrateOne(file);
        if (!imported) continue;
        items += imported.items;
        collections += imported.collections;
        sources.push(file);
    }

    return sources.length ? { collections, items, sources } : null;
}

/**
 * Renames the legacy file rather than deleting it. If anything about this
 * import turns out to be wrong, that database is the only way back.
 */
async function backupLegacyDb(file: string): Promise<string> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<string>('backup_legacy_db', { file });
}

async function migrateOne(file: string): Promise<{ collections: number; items: number } | null> {
    let db: LegacyDb;
    try {
        const { default: Database } = await import('@tauri-apps/plugin-sql');
        db = (await Database.load(`sqlite:${file}`)) as unknown as LegacyDb;
    } catch {
        // Not present — nothing to import from this one.
        return null;
    }

    try {
        const [rows, collectionRows] = await Promise.all([
            db.select<LegacyItemRow[]>('SELECT * FROM items WHERE deleted_at IS NULL'),
            db.select<LegacyCollectionRow[]>('SELECT id, name, color FROM collections'),
        ]);
        if (rows.length === 0) return null;

        const nameById = new Map(collectionRows.map((c) => [c.id, c.name]));
        const collections: Collection[] = collectionRows.map((c) => ({
            color: c.color,
            id: c.name,
            name: c.name,
        }));
        const items = rows.map((r) => legacyRowToItem(r, (id) => nameById.get(id) ?? id));

        // The engine writes the tree in one pass and reindexes.
        await request('/migrate/sqlite', {
            body: JSON.stringify({ collections, items }),
            method: 'POST',
        });

        await backupLegacyDb(file);
        return { collections: collections.length, items: items.length };
    } catch {
        // Leave this store untouched and let the others through; the next launch
        // finds the vault still short and tries again.
        return null;
    } finally {
        await db.close().catch(() => {});
    }
}
