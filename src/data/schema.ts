// SQLite schema for the local store. JSON-encoded columns keep the shape close
// to the Item type.
//
// `snippet` is legacy: it used to hold a note's body AND a link's URL. Those are
// now the separate `body` and `url` columns, and `snippet` is derived on read
// (see data/derive.ts). BACKFILL_STATEMENTS moves old rows across; the column
// stays so a downgrade still finds its data.

export const DB_NAME = 'sqlite:lore.db';

// One statement per array entry — tauri-plugin-sql runs `execute` as a single
// prepared statement, so a multi-statement string would silently run only the
// first. Each statement is executed separately on first open.
export const SCHEMA_STATEMENTS = [
    `CREATE TABLE IF NOT EXISTS collections (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL,
    color TEXT NOT NULL
  )`,
    `CREATE TABLE IF NOT EXISTS items (
    id            TEXT PRIMARY KEY,
    type          TEXT NOT NULL,
    title         TEXT NOT NULL,
    domain        TEXT,
    collection_id TEXT,
    tags          TEXT NOT NULL DEFAULT '[]',
    flags         TEXT NOT NULL DEFAULT '{}',
    summary       TEXT,
    points        TEXT,
    snippet       TEXT,
    url           TEXT,
    body          TEXT,
    description   TEXT,
    image         TEXT,
    related       TEXT NOT NULL DEFAULT '[]',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    deleted_at    TEXT,
    dirty         INTEGER NOT NULL DEFAULT 1,
    synced_at     TEXT
  )`,
    `CREATE INDEX IF NOT EXISTS idx_items_created    ON items(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_items_collection ON items(collection_id)`,
    `CREATE INDEX IF NOT EXISTS idx_items_deleted    ON items(deleted_at)`,
];

// Idempotent migrations for databases created before a column existed. Each is
// run inside a try/catch (a "duplicate column" error means it's already there).
export const MIGRATION_STATEMENTS = [
    `ALTER TABLE items ADD COLUMN image TEXT`,
    `ALTER TABLE items ADD COLUMN description TEXT`,
    `ALTER TABLE items ADD COLUMN url TEXT`,
    `ALTER TABLE items ADD COLUMN body TEXT`,
];

// One-time split of the overloaded `snippet` column. Guarded by `IS NULL` on the
// destination so it is idempotent and never clobbers a real edit.
export const BACKFILL_STATEMENTS = [
    `UPDATE items SET url  = snippet WHERE type =  'link' AND url  IS NULL AND snippet IS NOT NULL`,
    `UPDATE items SET body = snippet WHERE type <> 'link' AND body IS NULL AND snippet IS NOT NULL`,
];
