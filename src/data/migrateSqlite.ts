// One-shot import of the legacy `lore.db` into the Markdown vault.
//
// Runs in the renderer because that is the only place holding a plugin-sql
// handle. It never deletes the database — it renames it, because for a user
// mid-upgrade that file is the only copy of their library.

import type { Collection, Item } from "../store/types";
import { DB_NAME } from "./schema";
import { request } from "./sidecarClient";

/** Shape of a legacy row, before the url/body split. */
interface LegacyItemRow {
  id: string;
  type: string;
  title: string;
  domain: string | null;
  collection_id: string | null;
  tags: string;
  flags: string;
  summary: string | null;
  points: string | null;
  snippet: string | null;
  url: string | null;
  body: string | null;
  description: string | null;
  image: string | null;
  related: string;
  created_at: string;
  updated_at: string;
}

interface LegacyCollectionRow {
  id: string;
  name: string;
  color: string;
}

export interface MigrationResult {
  items: number;
  collections: number;
  backupPath: string;
}

const json = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

/**
 * Legacy row → domain item.
 *
 * `snippet` used to hold a link's URL and a note's body in the same column, so
 * this is where that finally comes apart for good. Phase 0 added the columns
 * and backfilled them, but a database from before that still needs the split.
 */
export function legacyRowToItem(r: LegacyItemRow, collectionName: (id: string) => string): Item {
  const isLink = r.type === "link";
  return {
    id: r.id,
    type: r.type as Item["type"],
    title: r.title,
    domain: r.domain ?? undefined,
    // The collection becomes a folder, so it is keyed by name from here on.
    collectionId: r.collection_id ? collectionName(r.collection_id) : undefined,
    tags: json<string[]>(r.tags, []),
    flags: json<Item["flags"]>(r.flags, {}),
    summary: r.summary ?? undefined,
    points: r.points ? json<string[]>(r.points, []) : undefined,
    url: r.url ?? (isLink ? r.snippet ?? undefined : undefined),
    body: r.body ?? (isLink ? undefined : r.snippet ?? undefined),
    description: r.description ?? undefined,
    image: r.image ?? undefined,
    related: json<string[]>(r.related, []),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Reads the legacy database and writes it into the open vault.
 *
 * Returns null when there is nothing to do — no database, or one with no live
 * rows — so the caller can treat "first run" and "already migrated" alike.
 */
export async function migrateSqlite(): Promise<MigrationResult | null> {
  interface LegacyDb {
    select<T>(query: string): Promise<T>;
    close(): Promise<boolean>;
  }

  let db: LegacyDb;
  try {
    const { default: Database } = await import("@tauri-apps/plugin-sql");
    db = (await Database.load(DB_NAME)) as unknown as LegacyDb;
  } catch {
    // No legacy database — a clean install.
    return null;
  }

  try {
    const [rows, collectionRows] = await Promise.all([
      db.select<LegacyItemRow[]>("SELECT * FROM items WHERE deleted_at IS NULL"),
      db.select<LegacyCollectionRow[]>("SELECT id, name, color FROM collections"),
    ]);
    if (rows.length === 0) return null;

    const nameById = new Map(collectionRows.map((c) => [c.id, c.name]));
    const collections: Collection[] = collectionRows.map((c) => ({
      id: c.name,
      name: c.name,
      color: c.color,
    }));
    const items = rows.map((r) => legacyRowToItem(r, (id) => nameById.get(id) ?? id));

    // The engine writes the tree in one pass and reindexes.
    await request("/migrate/sqlite", {
      method: "POST",
      body: JSON.stringify({ collections, items }),
    });

    const backupPath = await backupLegacyDb();
    return { items: items.length, collections: collections.length, backupPath };
  } finally {
    await db.close().catch(() => {});
  }
}

/**
 * Renames the legacy file rather than deleting it. If anything about this
 * migration turns out to be wrong, that database is the only way back.
 */
async function backupLegacyDb(): Promise<string> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("backup_legacy_db");
}
