// SQLite schema for the local (source-of-truth) store. JSON-encoded columns
// keep the shape close to the Item type; the `dirty` / `synced_at` / `deleted_at`
// columns are the groundwork for optional Convex sync later (last-writer-wins
// outbox + tombstones).

export const DB_NAME = "sqlite:baloon.db";

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS collections (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL,
  color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
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
  related       TEXT NOT NULL DEFAULT '[]',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT,
  dirty         INTEGER NOT NULL DEFAULT 1,
  synced_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_items_created    ON items(created_at);
CREATE INDEX IF NOT EXISTS idx_items_collection ON items(collection_id);
CREATE INDEX IF NOT EXISTS idx_items_deleted    ON items(deleted_at);
`;
