// Opening a vault whose index was written by another version of Lore.
//
// The index is derived and disposable, so a schema bump throws it away and
// rebuilds from the files. Worth its own test now that the schema has been
// bumped for the first time: every existing vault takes this path once, and a
// vault that will not open reads to the user as lost notes.

import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { VaultStore } from '../src/index/store';
import { INDEX_FILE, LORE_DIR } from '../src/vault';

/** Not a real write-ahead log — SQLite discards one whose header does not match. */
const STALE_WAL = 'left behind by a database that is no longer here';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-rebuild-'));
    await mkdir(join(root, LORE_DIR), { recursive: true });
});

afterEach(async () => {
    await rm(root, { force: true, recursive: true });
});

const missing = async (path: string): Promise<boolean> =>
    stat(path).then(
        () => false,
        () => true,
    );

/** An index left by a Lore that numbered its schema differently. */
const writeForeignIndex = (): void => {
    const db = new Database(join(root, INDEX_FILE), { create: true });

    db.exec('PRAGMA journal_mode = WAL');
    db.run('CREATE TABLE meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
    db.run("INSERT INTO meta (k, v) VALUES ('schema_version', '999')");
    db.run('CREATE TABLE leftovers (x TEXT)');
    db.run("INSERT INTO leftovers (x) VALUES ('from the old schema')");
    db.close();
};

describe('opening an index from another version', () => {
    it('rebuilds it from the files, which are the truth', async () => {
        await writeFile(join(root, 'note.md'), '---\ntitle: Note\n---\n\nBody.\n', 'utf8');
        writeForeignIndex();

        const store = await VaultStore.open(root);

        expect(store.listItems().map((item) => item.title)).toEqual(['Note']);
    });

    it('survives the log files an unclean shutdown leaves beside it', async () => {
        await writeFile(join(root, 'note.md'), '---\ntitle: Note\n---\n\nBody.\n', 'utf8');
        writeForeignIndex();
        await writeFile(join(root, `${INDEX_FILE}-wal`), STALE_WAL, 'utf8');
        await writeFile(join(root, `${INDEX_FILE}-shm`), 'stale shared memory', 'utf8');

        const store = await VaultStore.open(root);

        expect(store.listItems().map((item) => item.title)).toEqual(['Note']);
        store.close();
    });

    it('opens a vault whose index was half-rebuilt and left headless', async () => {
        // The shape an interrupted rebuild leaves: an empty database file with
        // no tables in it, and the old shared-memory file still beside it.
        new Database(join(root, INDEX_FILE), { create: true }).close();
        await writeFile(join(root, `${INDEX_FILE}-shm`), 'stale shared memory', 'utf8');
        await writeFile(join(root, 'note.md'), '---\ntitle: Note\n---\n\nBody.\n', 'utf8');

        const store = await VaultStore.open(root);

        expect(store.listItems().map((item) => item.title)).toEqual(['Note']);
        store.close();
    });

    it('is gone, not merely emptied — a rebuild drops the old tables', async () => {
        writeForeignIndex();

        const store = await VaultStore.open(root);

        store.close();

        const db = new Database(join(root, INDEX_FILE), { readonly: true });
        const leftovers = db
            .query<{ name: string }, []>(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'leftovers'",
            )
            .get();

        db.close();

        expect(leftovers).toBeNull();
        expect(await missing(join(root, 'nothing-here'))).toBe(true);
    });
});
