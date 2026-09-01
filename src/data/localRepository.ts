// SQLite-backed repository — the offline-first source of truth. Uses
// @tauri-apps/plugin-sql. The DB is lazily opened, the schema created, and the
// seed loaded on first run (when the items table is empty).
//
// The dataset for a personal KB is small, so view filtering and search are done
// in JS (reusing matchesView) rather than in SQL — simpler and keeps one code
// path for filtering across all repositories. FTS5 can replace the LIKE-free
// search later if scale demands it.

import type Database from "@tauri-apps/plugin-sql";
import { SEED_COLLECTIONS, SEED_ITEMS } from "../store/seed";
import type { Collection, Item, ItemFlags, TagCount, View } from "../store/types";
import { matchesView } from "../store/views";
import {
  type CollectionPatch,
  type ItemPatch,
  type KnowledgeRepository,
  type NewCollection,
  type NewItem,
} from "./repository";
import { withDerived, withoutBody } from "./derive";
import {
  BACKFILL_STATEMENTS,
  DB_NAME,
  MIGRATION_STATEMENTS,
  SCHEMA_STATEMENTS,
} from "./schema";

interface ItemRow {
  id: string;
  type: string;
  title: string;
  domain: string | null;
  collection_id: string | null;
  tags: string;
  flags: string;
  summary: string | null;
  points: string | null;
  url: string | null;
  body: string | null;
  description: string | null;
  image: string | null;
  related: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

function rowToItem(r: ItemRow): Item {
  return withDerived({
    id: r.id,
    type: r.type as Item["type"],
    title: r.title,
    domain: r.domain ?? undefined,
    collectionId: r.collection_id ?? undefined,
    tags: JSON.parse(r.tags) as string[],
    flags: JSON.parse(r.flags) as ItemFlags,
    summary: r.summary ?? undefined,
    points: r.points ? (JSON.parse(r.points) as string[]) : undefined,
    url: r.url ?? undefined,
    body: r.body ?? undefined,
    description: r.description ?? undefined,
    image: r.image ?? undefined,
    related: JSON.parse(r.related) as string[],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  });
}

/** Column values, in INSERT/UPSERT order, for an item. */
function itemParams(i: Item): unknown[] {
  return [
    i.id,
    i.type,
    i.title,
    i.domain ?? null,
    i.collectionId ?? null,
    JSON.stringify(i.tags),
    JSON.stringify(i.flags),
    i.summary ?? null,
    i.points ? JSON.stringify(i.points) : null,
    i.url ?? null,
    i.body ?? null,
    i.description ?? null,
    i.image ?? null,
    JSON.stringify(i.related),
    i.createdAt,
    i.updatedAt,
    i.deletedAt ?? null,
  ];
}

// No placeholder reuse — createItem and updateItem both pass a full row, so a
// plain INSERT OR REPLACE is simplest and avoids ON CONFLICT/named-param quirks.
const UPSERT_SQL = `
INSERT OR REPLACE INTO items
  (id, type, title, domain, collection_id, tags, flags, summary, points, url, body, description, image, related, created_at, updated_at, deleted_at, dirty, synced_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, 1, NULL)
`;

export class LocalRepository implements KnowledgeRepository {
  private dbPromise: Promise<Database> | null = null;

  /** Drops the memoised connection so a later open starts clean. */
  async dispose(): Promise<void> {
    const pending = this.dbPromise;
    this.dbPromise = null;
    try {
      await (await pending)?.close();
    } catch {
      // Already closed, or never opened — nothing to release.
    }
  }

  private async db(): Promise<Database> {
    if (!this.dbPromise) {
      this.dbPromise = this.open();
    }
    return this.dbPromise;
  }

  private async open(): Promise<Database> {
    const { default: Database } = await import("@tauri-apps/plugin-sql");
    const db = await Database.load(DB_NAME);
    for (const stmt of SCHEMA_STATEMENTS) {
      await db.execute(stmt);
    }
    for (const stmt of MIGRATION_STATEMENTS) {
      try {
        await db.execute(stmt);
      } catch {
        // Column already exists — migration is a no-op.
      }
    }
    // Split the legacy overloaded `snippet` column into url/body. Idempotent.
    for (const stmt of BACKFILL_STATEMENTS) {
      await db.execute(stmt);
    }
    await this.seedIfEmpty(db);
    return db;
  }

  private async seedIfEmpty(db: Database): Promise<void> {
    const rows = await db.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM items");
    if (rows[0]?.n > 0) return;

    for (const c of SEED_COLLECTIONS) {
      await db.execute(
        "INSERT OR IGNORE INTO collections (id, name, color) VALUES ($1,$2,$3)",
        [c.id, c.name, c.color],
      );
    }
    for (const item of SEED_ITEMS) {
      await db.execute(UPSERT_SQL, itemParams({ ...item, deletedAt: null }));
    }
  }

  private async allLive(): Promise<Item[]> {
    const db = await this.db();
    const rows = await db.select<ItemRow[]>(
      "SELECT * FROM items WHERE deleted_at IS NULL ORDER BY created_at DESC",
    );
    return rows.map(rowToItem);
  }

  async listItems(view?: View): Promise<Item[]> {
    const all = await this.allLive();
    const filtered = view ? all.filter((i) => matchesView(i, view)) : all;
    // Bodies are fetched per item by getItem — see derive.withoutBody.
    return filtered.map(withoutBody);
  }

  async getItem(id: string): Promise<Item | null> {
    const db = await this.db();
    const rows = await db.select<ItemRow[]>(
      "SELECT * FROM items WHERE id = $1 AND deleted_at IS NULL",
      [id],
    );
    return rows[0] ? rowToItem(rows[0]) : null;
  }

  async createItem(input: NewItem): Promise<Item> {
    const now = new Date().toISOString();
    const item: Item = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    const db = await this.db();
    await db.execute(UPSERT_SQL, itemParams(item));
    return item;
  }

  async updateItem(id: string, patch: ItemPatch): Promise<Item> {
    const existing = await this.getItem(id);
    if (!existing) throw new Error(`Item not found: ${id}`);
    const updated: Item = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    const db = await this.db();
    await db.execute(UPSERT_SQL, itemParams(updated));
    return updated;
  }

  async deleteItem(id: string): Promise<void> {
    const db = await this.db();
    await db.execute(
      "UPDATE items SET deleted_at = $1, dirty = 1, synced_at = NULL WHERE id = $2",
      [new Date().toISOString(), id],
    );
  }

  async listCollections(): Promise<Collection[]> {
    const db = await this.db();
    return db.select<Collection[]>("SELECT id, name, color FROM collections");
  }

  async createCollection(input: NewCollection): Promise<Collection> {
    const collection: Collection = { ...input, id: crypto.randomUUID() };
    const db = await this.db();
    await db.execute("INSERT INTO collections (id, name, color) VALUES ($1,$2,$3)", [
      collection.id,
      collection.name,
      collection.color,
    ]);
    return collection;
  }

  async updateCollection(id: string, patch: CollectionPatch): Promise<Collection> {
    const db = await this.db();
    const rows = await db.select<Collection[]>("SELECT id, name, color FROM collections WHERE id = $1", [id]);
    const existing = rows[0];
    if (!existing) throw new Error(`Collection not found: ${id}`);
    const updated: Collection = { ...existing, ...patch };
    await db.execute("UPDATE collections SET name = $1, color = $2 WHERE id = $3", [
      updated.name,
      updated.color,
      id,
    ]);
    return updated;
  }

  async deleteCollection(id: string): Promise<void> {
    const db = await this.db();
    await db.execute("DELETE FROM collections WHERE id = $1", [id]);
    // Unfile items that referenced the removed collection.
    await db.execute(
      "UPDATE items SET collection_id = NULL, updated_at = $1, dirty = 1 WHERE collection_id = $2",
      [new Date().toISOString(), id],
    );
  }

  async listTags(): Promise<TagCount[]> {
    const counts = new Map<string, number>();
    for (const item of await this.allLive()) {
      for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count }));
  }

  async search(query: string): Promise<Item[]> {
    const q = query.trim().toLowerCase();
    const all = await this.allLive();
    if (!q) return all;
    return all.filter((i) => {
      const hay = [i.title, i.domain ?? "", i.body ?? "", i.url ?? "", i.summary ?? "", i.tags.join(" ")]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }
}
