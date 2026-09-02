// The vault store: the index plus the read/write operations the routes expose.
// This is where the file tree and the derived index are kept in agreement.

import { mkdir, rm, rmdir, stat } from "node:fs/promises";
import type { Database } from "bun:sqlite";
import type { Collection, Item, TagCount } from "@lore/types";
import { hashContent, openIndex, IndexVersionMismatch, type FileRow } from "./db";
import {
  Vault,
  collectionOf,
  INDEX_FILE,
  joinPath,
  stemOf,
  TRASH_DIR,
} from "../vault";
import { parseFile, serializeFile, toItem } from "../markdown";
import { newId, uniqueStem } from "../slug";
import { resolveRelated, serializeRelated, type Resolver } from "../links";
import { deriveDomain, deriveSnippet } from "@lore/derive";

/** A row's Item, rehydrated with the body and the derived fields. */
function rowToItem(row: FileRow, withBody: boolean): Item {
  const base = JSON.parse(row.json) as Item;
  const item: Item = { ...base, collectionId: collectionOf(row.path) || undefined };
  if (withBody) item.body = row.body || undefined;
  return {
    ...item,
    snippet: deriveSnippet({ type: item.type, body: row.body, description: item.description, url: item.url }),
    domain: item.domain ?? deriveDomain(item.url),
  };
}

export class VaultStore {
  private db: Database;

  private constructor(readonly vault: Vault, db: Database) {
    this.db = db;
  }

  static async open(root: string): Promise<VaultStore> {
    const vault = new Vault(root);
    await vault.ensureScaffold();
    const dbPath = vault.path(INDEX_FILE);
    let db: Database;
    try {
      db = openIndex(dbPath);
    } catch (e) {
      if (!(e instanceof IndexVersionMismatch)) throw e;
      // Stale schema: throw the index away rather than migrating it.
      await rm(dbPath, { force: true });
      db = openIndex(dbPath);
    }
    const store = new VaultStore(vault, db);
    await store.reconcile();
    return store;
  }

  close(): void {
    this.db.close();
  }

  /* ---------------- resolver ---------------- */

  private resolver(): Resolver {
    const byStem = this.db.query<{ id: string }, [string]>(
      "SELECT id FROM files WHERE stem = ? COLLATE NOCASE LIMIT 1",
    );
    const byId = this.db.query<{ stem: string }, [string]>("SELECT stem FROM files WHERE id = ?");
    return {
      idForStem: (stem) => byStem.get(stem)?.id,
      hasId: (id) => !!byId.get(id),
      stemForId: (id) => byId.get(id)?.stem,
    };
  }

  /* ---------------- indexing ---------------- */

  /**
   * Brings the index in line with the files.
   *
   * mtime+size is the cheap check; the content hash only runs on what already
   * looks changed, because checkouts, rsync and `cp -p` all set mtimes
   * backwards and would otherwise leave stale rows behind.
   */
  async reconcile(): Promise<{ indexed: number; removed: number }> {
    const paths = await this.vault.listMarkdown();
    const seen = new Set(paths);

    const existing = new Map<string, FileRow>();
    for (const row of this.db.query<FileRow, []>("SELECT * FROM files").all()) {
      existing.set(row.path, row);
    }

    let indexed = 0;
    for (const path of paths) {
      const st = await stat(this.vault.path(path));
      const prev = existing.get(path);
      const mtime = Math.floor(st.mtimeMs);
      if (prev && prev.mtime_ms === mtime && prev.size === st.size) continue;

      const raw = await this.vault.readText(path);
      const hash = hashContent(raw);
      if (prev && prev.hash === hash) {
        this.db.run("UPDATE files SET mtime_ms = ?, size = ? WHERE path = ?", [mtime, st.size, path]);
        continue;
      }
      this.indexOne(path, raw, mtime, st.size, hash, prev?.id);
      indexed += 1;
    }

    let removed = 0;
    for (const path of existing.keys()) {
      if (!seen.has(path)) {
        this.forget(path);
        removed += 1;
      }
    }

    // A second pass resolves links whose targets were indexed after them.
    if (indexed > 0) this.reresolveAll();
    return { indexed, removed };
  }

  private indexOne(
    path: string,
    raw: string,
    mtimeMs: number,
    size: number,
    hash: string,
    knownId?: string,
  ): FileRow {
    const parsed = parseFile(raw);
    const stem = stemOf(path);
    const id = (typeof parsed.data.id === "string" && parsed.data.id) || knownId || newId();
    const { ids, unresolved } = resolveRelated(parsed.data.related, this.resolver());

    const item = toItem(parsed, {
      collectionId: collectionOf(path),
      stem,
      id,
      mtime: new Date(mtimeMs).toISOString(),
      relatedIds: ids,
    });

    const { body, ...withoutBody } = item;
    const row: FileRow = {
      path,
      id,
      stem,
      mtime_ms: mtimeMs,
      size,
      hash,
      json: JSON.stringify(withoutBody),
      body: body ?? "",
      unresolved: JSON.stringify(unresolved),
      extra: JSON.stringify(parsed.extra),
      indexed_at: Date.now(),
    };

    // A file may have moved: clear any previous row for this id first.
    this.db.run("DELETE FROM files WHERE id = ? AND path <> ?", [id, path]);
    this.db.run(
      `INSERT OR REPLACE INTO files
       (path, id, stem, mtime_ms, size, hash, json, body, unresolved, extra, indexed_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [row.path, row.id, row.stem, row.mtime_ms, row.size, row.hash, row.json, row.body, row.unresolved, row.extra, row.indexed_at],
    );
    this.writeLinks(id, parsed.data.related, ids);
    this.writeFts(id, item, row.body);
    return row;
  }

  private writeLinks(srcId: string, rawRelated: unknown, ids: string[]): void {
    this.db.run("DELETE FROM links WHERE src_id = ?", [srcId]);
    if (!Array.isArray(rawRelated)) return;
    const insert = this.db.query(
      "INSERT OR REPLACE INTO links (src_id, target_raw, target_id) VALUES (?,?,?)",
    );
    const resolver = this.resolver();
    for (const raw of rawRelated) {
      if (typeof raw !== "string") continue;
      const target = raw.replace(/^\[\[|\]\]$/g, "").split("|")[0].split("#")[0].trim();
      const resolved = resolver.idForStem(target) ?? (ids.includes(target) ? target : null);
      insert.run(srcId, raw, resolved);
    }
  }

  private writeFts(id: string, item: Item, body: string): void {
    this.db.run("DELETE FROM items_fts WHERE id = ?", [id]);
    this.db.run(
      "INSERT INTO items_fts (id, title, body, summary, tags, description, url) VALUES (?,?,?,?,?,?,?)",
      [id, item.title, body, item.summary ?? "", item.tags.join(" "), item.description ?? "", item.url ?? ""],
    );
  }

  private forget(path: string): void {
    const row = this.db.query<{ id: string }, [string]>("SELECT id FROM files WHERE path = ?").get(path);
    this.db.run("DELETE FROM files WHERE path = ?", [path]);
    if (row) {
      this.db.run("DELETE FROM links WHERE src_id = ?", [row.id]);
      this.db.run("DELETE FROM items_fts WHERE id = ?", [row.id]);
    }
  }

  /** Re-points links whose target has since appeared. Lets dead links self-heal. */
  private reresolveAll(): void {
    const resolver = this.resolver();
    const rows = this.db.query<FileRow, []>("SELECT * FROM files").all();
    for (const row of rows) {
      const unresolved = JSON.parse(row.unresolved) as string[];
      if (unresolved.length === 0) continue;
      const item = JSON.parse(row.json) as Item;
      const combined = [...item.related.map((id) => resolver.stemForId(id) ?? id), ...unresolved];
      const next = resolveRelated(
        combined.map((s) => (s.startsWith("[[") ? s : `[[${s}]]`)),
        resolver,
      );
      if (next.unresolved.length === unresolved.length) continue;
      item.related = next.ids;
      this.db.run("UPDATE files SET json = ?, unresolved = ? WHERE path = ?", [
        JSON.stringify(item),
        JSON.stringify(next.unresolved),
        row.path,
      ]);
      this.writeLinks(row.id, combined, next.ids);
    }
  }

  /* ---------------- reads ---------------- */

  listItems(): Item[] {
    return this.db
      .query<FileRow, []>("SELECT * FROM files")
      .all()
      .map((r) => rowToItem(r, false))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getItem(id: string): Item | null {
    const row = this.db.query<FileRow, [string]>("SELECT * FROM files WHERE id = ?").get(id);
    return row ? rowToItem(row, true) : null;
  }

  listTags(): TagCount[] {
    const counts = new Map<string, number>();
    for (const item of this.listItems()) {
      for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  search(query: string): Item[] {
    const q = query.trim();
    if (!q) return this.listItems();
    // Prefix-match every term so search feels live as you type.
    const match = q
      .split(/\s+/)
      .map((t) => `${t.replace(/["*]/g, "")}*`)
      .join(" ");
    try {
      const ids = this.db
        .query<{ id: string }, [string]>(
          "SELECT id FROM items_fts WHERE items_fts MATCH ? ORDER BY rank",
        )
        .all(match)
        .map((r) => r.id);
      const byId = new Map(this.listItems().map((i) => [i.id, i]));
      return ids.map((id) => byId.get(id)).filter((i): i is Item => !!i);
    } catch {
      // A malformed FTS expression should degrade to no results, not a 500.
      return [];
    }
  }

  async listCollections(): Promise<Collection[]> {
    return this.vault.listCollections();
  }

  /* ---------------- writes ---------------- */

  async createItem(input: Omit<Item, "id" | "createdAt" | "updatedAt">): Promise<Item> {
    const id = newId();
    const now = new Date().toISOString();
    const item: Item = { ...input, id, createdAt: now, updatedAt: now };
    const stem = uniqueStem(item.title, id, this.takenStems(item.collectionId));
    const path = joinPath(item.collectionId, stem);
    await this.writeItem(path, item, []);
    return this.getItem(id)!;
  }

  async updateItem(id: string, patch: Partial<Item>): Promise<Item | null> {
    const row = this.db.query<FileRow, [string]>("SELECT * FROM files WHERE id = ?").get(id);
    if (!row) return null;

    const current = rowToItem(row, true);
    const next: Item = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
    const unresolved = JSON.parse(row.unresolved) as string[];
    const extra = JSON.parse(row.extra) as Record<string, unknown>;

    // A collection change is a file move — the folder is the collection.
    const targetCollection = patch.collectionId !== undefined ? patch.collectionId : current.collectionId;
    let path = row.path;
    if ((targetCollection || "") !== (current.collectionId || "")) {
      path = joinPath(targetCollection || undefined, row.stem);
      await this.vault.move(row.path, path);
      this.db.run("DELETE FROM files WHERE path = ?", [row.path]);
    }

    await this.writeItem(path, { ...next, collectionId: targetCollection || undefined }, unresolved, extra);
    return this.getItem(id);
  }

  /** Deletes by moving to `.lore/trash/` — git is the undo, but not for free. */
  async deleteItem(id: string): Promise<boolean> {
    const row = this.db.query<FileRow, [string]>("SELECT * FROM files WHERE id = ?").get(id);
    if (!row) return false;
    await this.vault.move(row.path, `${TRASH_DIR}/${Date.now()}-${row.stem}.md`);
    this.forget(row.path);
    return true;
  }

  private takenStems(collectionId: string | undefined): Set<string> {
    const prefix = collectionId ?? "";
    const stems = new Set<string>();
    for (const row of this.db.query<FileRow, []>("SELECT * FROM files").all()) {
      if (collectionOf(row.path) === prefix) stems.add(row.stem);
    }
    return stems;
  }

  private async writeItem(
    path: string,
    item: Item,
    unresolved: readonly string[],
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    const related = serializeRelated(item.related, unresolved, this.resolver());
    const text = serializeFile(item, related, extra);
    await this.vault.writeText(path, text);
    const st = await stat(this.vault.path(path));
    this.indexOne(path, text, Math.floor(st.mtimeMs), st.size, hashContent(text), item.id);
  }

  /* ---------------- collections ---------------- */

  async createCollection(name: string, color: string): Promise<Collection> {
    await mkdir(this.vault.path(name), { recursive: true });
    const existing = await this.vault.listCollections();
    await this.vault.writeCollectionsFile([...existing, { id: name, name, color }]);
    return { id: name, name, color };
  }

  async updateCollection(id: string, patch: { name?: string; color?: string }): Promise<Collection | null> {
    const collections = await this.vault.listCollections();
    const current = collections.find((c) => c.id === id);
    if (!current) return null;

    const nextId = patch.name ?? current.id;
    if (nextId !== id) {
      await this.vault.move(id, nextId);
      // Every child's path changed; the reconcile pass picks them up.
      this.db.run("DELETE FROM files WHERE path LIKE ?", [`${id}/%`]);
    }
    const next = { id: nextId, name: nextId, color: patch.color ?? current.color };
    await this.vault.writeCollectionsFile(collections.map((c) => (c.id === id ? next : c)));
    await this.reconcile();
    return next;
  }

  /** Unfiles children to the vault root, then removes the folder. */
  async deleteCollection(id: string): Promise<void> {
    const rows = this.db
      .query<FileRow, [string]>("SELECT * FROM files WHERE path LIKE ?")
      .all(`${id}/%`);
    for (const row of rows) {
      const stems = this.takenStems(undefined);
      const stem = stems.has(row.stem) ? uniqueStem(row.stem, row.id, stems) : row.stem;
      await this.vault.move(row.path, `${stem}.md`);
      this.db.run("DELETE FROM files WHERE path = ?", [row.path]);
    }
    // rmdir refuses a non-empty directory, which is the behaviour we want:
    // anything unexpected still in there is left alone rather than deleted.
    await rmdir(this.vault.path(id)).catch(() => {});
    const collections = await this.vault.listCollections();
    await this.vault.writeCollectionsFile(collections.filter((c) => c.id !== id));
    await this.reconcile();
  }
}
