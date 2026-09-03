// The derived index. Everything here is rebuildable from the Markdown files, so
// nothing is ever migrated: a version bump or a corrupt file means delete and
// rescan. That is what keeps "derived, deletable, rebuildable" true rather than
// aspirational.

import { Database } from 'bun:sqlite';

export const SCHEMA_VERSION = 1;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS files (
  path       TEXT PRIMARY KEY,
  id         TEXT NOT NULL UNIQUE,
  stem       TEXT NOT NULL,
  mtime_ms   INTEGER NOT NULL,
  size       INTEGER NOT NULL,
  hash       TEXT NOT NULL,
  json       TEXT NOT NULL,   -- the Item without its body
  body       TEXT NOT NULL,
  unresolved TEXT NOT NULL DEFAULT '[]',
  extra      TEXT NOT NULL DEFAULT '{}',
  indexed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_files_stem ON files(stem COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS links (
  src_id     TEXT NOT NULL,
  target_raw TEXT NOT NULL,
  target_id  TEXT,
  PRIMARY KEY (src_id, target_raw)
);
CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id);

CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  id UNINDEXED, title, body, summary, tags, description, url,
  tokenize='porter unicode61'
);

CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
`;

export interface FileRow {
    body: string;
    extra: string;
    hash: string;
    id: string;
    indexed_at: number;
    json: string;
    mtime_ms: number;
    path: string;
    size: number;
    stem: string;
    unresolved: string;
}

export class IndexVersionMismatch extends Error {
    constructor() {
        super('index schema version mismatch');
        this.name = 'IndexVersionMismatch';
    }
}

export function hashContent(text: string): string {
    const h = new Bun.CryptoHasher('sha256');
    h.update(text);
    return h.digest('hex');
}

export function openIndex(path: string): Database {
    const db = new Database(path, { create: true });
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA synchronous = NORMAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.run(SCHEMA);

    const row = db.query<{ v: string }, []>("SELECT v FROM meta WHERE k = 'schema_version'").get();
    if (!row) {
        db.run("INSERT INTO meta (k, v) VALUES ('schema_version', ?)", [String(SCHEMA_VERSION)]);
    } else if (Number(row.v) !== SCHEMA_VERSION) {
        // Never migrate — the files are the truth, so a rebuild is always cheaper
        // and safer than a schema migration.
        db.close();
        throw new IndexVersionMismatch();
    }
    return db;
}
