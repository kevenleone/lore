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
import { INDEX_FILE, indexFileFor, LORE_DIR } from '../src/vault';

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

describe('opening an index that is not a database at all', () => {
    // What an interrupted rebuild actually leaves. Only a schema mismatch used
    // to be recovered here; anything else rethrew, which is how a disposable
    // file turned into a vault that would not open.
    const corrupt = () => writeFile(join(root, INDEX_FILE), 'garbage, not a database', 'utf8');

    it('throws it away and rebuilds from the files', async () => {
        await writeFile(join(root, 'note.md'), '---\ntitle: Note\n---\n\nBody.\n', 'utf8');
        await corrupt();

        const store = await VaultStore.open(root);

        expect(store.listItems().map((item) => item.title)).toEqual(['Note']);
        store.close();
    });

    it('clears the journal files with it, rather than inheriting them', async () => {
        // SQLite makes its own -wal and -shm on the way back in, so what is
        // asserted is that the stale ones went, not that none exist.
        await writeFile(join(root, 'note.md'), '---\ntitle: Note\n---\n\nBody.\n', 'utf8');
        await corrupt();
        await writeFile(join(root, `${INDEX_FILE}-wal`), STALE_WAL, 'utf8');
        await writeFile(join(root, `${INDEX_FILE}-shm`), 'stale shared memory', 'utf8');

        const store = await VaultStore.open(root);

        expect(store.listItems().map((item) => item.title)).toEqual(['Note']);
        store.close();

        const wal = Bun.file(join(root, `${INDEX_FILE}-wal`));

        expect((await wal.exists()) ? await wal.text() : '').not.toContain(STALE_WAL);
    });

    it('recovers a vault that is only truncated, not scrambled', async () => {
        await writeFile(join(root, 'note.md'), '---\ntitle: Note\n---\n\nBody.\n', 'utf8');
        (await VaultStore.open(root)).close();
        await writeFile(join(root, INDEX_FILE), '', 'utf8');

        const store = await VaultStore.open(root);

        expect(store.listItems().map((item) => item.title)).toEqual(['Note']);
        store.close();
    });

    it('leaves the notes alone — only the derived file is thrown away', async () => {
        const note = join(root, 'note.md');

        await writeFile(note, '---\ntitle: Note\n---\n\nBody.\n', 'utf8');
        await corrupt();
        (await VaultStore.open(root)).close();

        expect(await Bun.file(note).text()).toContain('Body.');
    });
});

describe('the index each build uses', () => {
    it('gives production the plain name, so no vault reindexes on upgrade', () => {
        expect(indexFileFor('prod')).toBe(`${LORE_DIR}/index.db`);
        expect(indexFileFor(undefined)).toBe(`${LORE_DIR}/index.db`);
    });

    it('gives a dev or agent build one of its own', () => {
        // A vault is a folder of Markdown and any Lore may open it; what they
        // must not share is one derived database.
        expect(indexFileFor('dev')).toBe(`${LORE_DIR}/index-dev.db`);
        expect(indexFileFor('agent')).toBe(`${LORE_DIR}/index-agent.db`);
    });

    it('never lets a mode name escape into a path', () => {
        expect(indexFileFor('../../etc/passwd')).toBe(`${LORE_DIR}/index-etcpasswd.db`);
    });

    it('keeps them all inside .lore, and distinct', () => {
        const names = ['prod', 'dev', 'agent'].map(indexFileFor);

        expect(new Set(names).size).toBe(3);
        expect(names.every((name) => name.startsWith(`${LORE_DIR}/`))).toBe(true);
    });
});
