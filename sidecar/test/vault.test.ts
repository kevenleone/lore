// The vault engine, against real temp directories. These are the tests the
// data layer never had while it was SQLite-only.

import type { Item } from '@lore/types';

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { VaultStore } from '../src/index/store';
import { parseWikilink, rewriteRelated } from '../src/links';
import { parseFile, serializeFile, splitFrontmatter, toItem } from '../src/markdown';
import { slugify, uniqueStem } from '../src/slug';
import { collectionOf, hashColor, safeJoin, stemOf } from '../src/vault';

let root: string;
let store: VaultStore;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-vault-'));
});

afterEach(async () => {
    store?.close();
    await rm(root, { force: true, recursive: true });
});

const open = async () => {
    store = await VaultStore.open(root);
    return store;
};

const write = async (rel: string, text: string) => {
    await mkdir(join(root, rel, '..'), { recursive: true });
    await writeFile(join(root, rel), text, 'utf8');
};

const baseItem = (over: Partial<Item> = {}): Omit<Item, 'createdAt' | 'id' | 'updatedAt'> => ({
    flags: {},
    related: [],
    tags: [],
    title: 'A note',
    type: 'note',
    ...over,
});

/* ------------------------------------------------------------------ */

describe('slugify', () => {
    it('makes a filesystem-safe stem from a title', () => {
        expect(slugify('How Linear builds product')).toBe('how-linear-builds-product');
    });

    it('strips accents rather than emitting them', () => {
        expect(slugify('Café résumé')).toBe('cafe-resume');
    });

    it('drops path separators so a title can never escape its folder', () => {
        expect(slugify('../../etc/passwd')).toBe('etc-passwd');
    });

    it('avoids Windows reserved names', () => {
        expect(slugify('CON')).toBe('con-note');
    });

    it('falls back to an id when the title slugs to nothing', () => {
        expect(uniqueStem('🎉🎉', '01ABCDEF', new Set())).toBe('untitled-abcdef');
    });

    it('suffixes on collision instead of overwriting', () => {
        const taken = new Set(['notes', 'notes-2']);
        expect(uniqueStem('Notes', 'X', taken)).toBe('notes-3');
    });
});

describe('safeJoin', () => {
    it('refuses to escape the vault', () => {
        expect(() => safeJoin('/vault', '../etc/passwd')).toThrow();
        expect(() => safeJoin('/vault', 'a/../../b')).toThrow();
    });

    it('allows paths inside the vault', () => {
        expect(safeJoin('/vault', 'Work/note.md')).toBe('/vault/Work/note.md');
    });
});

describe('path helpers', () => {
    it('reads the collection from the parent folder', () => {
        expect(collectionOf('Reading List/a.md')).toBe('Reading List');
        expect(collectionOf('a.md')).toBe('');
        expect(stemOf('Reading List/a.md')).toBe('a');
    });

    it('gives a folder a stable colour without collections.json', () => {
        expect(hashColor('Work')).toBe(hashColor('Work'));
        expect(hashColor('Work')).toMatch(/^#[0-9a-f]{6}$/);
    });
});

describe('markdown format', () => {
    it('round-trips an item through serialize and parse', () => {
        const item: Item = {
            body: 'My notes.',
            createdAt: '2026-01-01T00:00:00.000Z',
            description: 'D',
            flags: { inbox: true, starred: true },
            id: 'ID1',
            image: 'https://i',
            points: ['p1', 'p2'],
            related: [],
            summary: 'S',
            tags: ['product'],
            title: 'Linear',
            type: 'link',
            updatedAt: '2026-01-02T00:00:00.000Z',
            url: 'https://linear.app',
        };
        const text = serializeFile(item, ['[[other]]']);
        const parsed = parseFile(text);
        const back = toItem(parsed, { id: 'ID1', mtime: '', relatedIds: [], stem: 'linear' });

        expect(back.title).toBe('Linear');
        expect(back.url).toBe('https://linear.app');
        expect(back.tags).toEqual(['product']);
        expect(back.flags).toEqual({ inbox: true, starred: true });
        expect(back.points).toEqual(['p1', 'p2']);
        expect(back.body).toBe('My notes.');
        expect(back.createdAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('round-trips a task deadline and priority', () => {
        const item = {
            ...baseItem({ dueAt: '2026-03-04', priority: 'urgent', type: 'task' }),
            createdAt: '2026-01-01T00:00:00.000Z',
            id: 'T1',
            updatedAt: '2026-01-01T00:00:00.000Z',
        } as Item;
        const text = serializeFile(item, []);
        expect(text).toContain('due: 2026-03-04');
        expect(text).toContain('priority: urgent');

        const back = toItem(parseFile(text), { id: 'T1', mtime: '', relatedIds: [], stem: 't' });
        expect(back.dueAt).toBe('2026-03-04');
        expect(back.priority).toBe('urgent');
    });

    it('writes no priority key for an ordinary item', () => {
        const item = {
            ...baseItem({ priority: 'normal' }),
            createdAt: '2026-01-01T00:00:00.000Z',
            id: 'N1',
            updatedAt: '2026-01-01T00:00:00.000Z',
        } as Item;
        expect(serializeFile(item, [])).not.toContain('priority:');
    });

    it('degrades a hand-written deadline or priority it cannot read', () => {
        const back = toItem(parseFile('---\ndue: someday\npriority: asap\n---\nx'), {
            id: 'H1',
            mtime: '2026-01-01T00:00:00.000Z',
            relatedIds: [],
            stem: 'h',
        });
        expect(back.dueAt).toBeUndefined();
        expect(back.priority).toBeUndefined();
    });

    it('reads an unquoted YAML date, which parses as a Date', () => {
        const back = toItem(parseFile('---\ndue: 2026-03-04\n---\nx'), {
            id: 'D1',
            mtime: '2026-01-01T00:00:00.000Z',
            relatedIds: [],
            stem: 'd',
        });
        expect(back.dueAt).toBe('2026-03-04');
    });

    it('round-trips comments through the frontmatter', () => {
        const comment = {
            at: '2026-01-03T00:00:00.000Z',
            author: 'Keven',
            body: 'Worth revisiting.',
            id: 'c1',
        };
        const text = serializeFile({ ...baseItem(), comments: [comment] } as Item, []);
        expect(text).toContain('comments:');

        const back = toItem(parseFile(text), {
            id: 'ID1',
            mtime: '',
            relatedIds: [],
            stem: 'a-note',
        });
        expect(back.comments).toEqual([comment]);
    });

    it('fills in what a hand-written comment leaves out, and drops bodyless ones', () => {
        const parsed = parseFile(
            '---\ntitle: A\ncreated: 2026-02-01T00:00:00.000Z\ncomments:\n  - body: Just text\n  - author: nobody\n---\n\nb',
        );
        const back = toItem(parsed, { id: 'ID1', mtime: '', relatedIds: [], stem: 'a' });

        expect(back.comments).toHaveLength(1);
        expect(back.comments![0].body).toBe('Just text');
        expect(back.comments![0].at).toBe('2026-02-01T00:00:00.000Z');
        expect(back.comments![0].id).toBeTruthy();
    });

    it('keeps a ticked-off item ticked off across a round trip', () => {
        const text = serializeFile(
            {
                ...baseItem(),
                createdAt: '',
                flags: { done: true, today: true },
                id: 'I',
                updatedAt: '',
            } as Item,
            [],
        );
        const back = toItem(parseFile(text), { id: 'I', mtime: '', relatedIds: [], stem: 'i' });

        expect(back.flags).toEqual({ done: true, today: true });
    });

    it('writes flags flat and omits the false ones', () => {
        const text = serializeFile(
            {
                ...baseItem(),
                createdAt: '',
                flags: { starred: true },
                id: 'I',
                updatedAt: '',
            } as Item,
            [],
        );
        expect(text).toContain('starred: true');
        expect(text).not.toContain('inbox:');
        expect(text).not.toContain('flags:');
    });

    it('never writes collectionId — the folder is the collection', () => {
        const text = serializeFile(
            {
                ...baseItem({ collectionId: 'Work' }),
                createdAt: '',
                id: 'I',
                updatedAt: '',
            } as Item,
            [],
        );
        expect(text).not.toContain('collectionId');
    });

    it('treats a plain markdown file with no frontmatter as a note', () => {
        const parsed = parseFile('# Hello\n\nSome text.');
        const item = toItem(parsed, {
            id: 'I',
            mtime: '2026-01-01T00:00:00.000Z',
            relatedIds: [],
            stem: 'hello',
        });
        expect(item.type).toBe('note');
        // Falls back to the first heading for a title.
        expect(item.title).toBe('Hello');
        expect(item.body).toContain('Some text.');
    });

    it('falls back to the filename when there is no title or heading', () => {
        const item = toItem(parseFile('just text'), {
            id: 'I',
            mtime: '2026-01-01T00:00:00.000Z',
            relatedIds: [],
            stem: 'my-file',
        });
        expect(item.title).toBe('my-file');
    });

    it('survives malformed YAML instead of dropping the file', () => {
        const parsed = parseFile('---\n: : bad\n---\n\nbody');
        expect(parsed.body).toBe('body');
    });

    it('preserves unknown frontmatter keys another tool added', () => {
        const parsed = parseFile('---\ntitle: T\nobsidianField: keep-me\n---\n\nb');
        expect(parsed.extra).toEqual({ obsidianField: 'keep-me' });
        const text = serializeFile(
            { ...baseItem({ title: 'T' }), createdAt: '', id: 'I', updatedAt: '' } as Item,
            [],
            parsed.extra,
        );
        expect(text).toContain('obsidianField: keep-me');
    });

    it('splits frontmatter only when it opens on the first line', () => {
        expect(splitFrontmatter('no fm').yaml).toBeNull();
        expect(splitFrontmatter('---\na: 1\n---\nbody').yaml).toBe('a: 1\n');
    });
});

describe('wikilinks', () => {
    it('strips alias and heading down to the target', () => {
        expect(parseWikilink('[[note#Heading|Alias]]')).toBe('note');
    });

    it('rewrites a target while keeping alias and heading', () => {
        expect(rewriteRelated(['[[old#H|A]]', '[[other]]'], 'old', 'new')).toEqual([
            '[[new#H|A]]',
            '[[other]]',
        ]);
    });
});

/* ------------------------------------------------------------------ */

describe('store: items', () => {
    it('creates a file named after the title, in the collection folder', async () => {
        const s = await open();
        await s.createCollection('Reading List', '#8a92b8');
        const item = await s.createItem(
            baseItem({ collectionId: 'Reading List', title: 'How Linear builds product' }),
        );

        const text = await readFile(
            join(root, 'Reading List/how-linear-builds-product.md'),
            'utf8',
        );
        expect(text).toStartWith('---\n');
        expect(text).toContain('title: How Linear builds product');
        expect(item.collectionId).toBe('Reading List');
    });

    it('puts an uncollected item at the vault root', async () => {
        const s = await open();
        await s.createItem(baseItem({ title: 'Loose note' }));
        expect(await Bun.file(join(root, 'loose-note.md')).exists()).toBe(true);
    });

    it('omits the body from listItems but returns it from getItem', async () => {
        const s = await open();
        const created = await s.createItem(
            baseItem({ body: 'Line one\nLine two', title: 'With body' }),
        );

        const listed = s.listItems().find((i) => i.id === created.id)!;
        expect(listed.body).toBeUndefined();
        // The preview still works, because snippet is derived.
        expect(listed.snippet).toBe('Line one');

        expect(s.getItem(created.id)!.body).toBe('Line one\nLine two');
    });

    it("derives a link's snippet and domain without storing them", async () => {
        const s = await open();
        const created = await s.createItem(
            baseItem({
                description: 'Desc',
                title: 'L',
                type: 'link',
                url: 'https://www.example.com/x',
            }),
        );
        const item = s.getItem(created.id)!;
        expect(item.snippet).toBe('Desc');
        expect(item.domain).toBe('example.com');

        const text = await readFile(join(root, 'l.md'), 'utf8');
        expect(text).not.toContain('snippet:');
        expect(text).not.toContain('domain:');
    });

    it('moves the file when the collection changes', async () => {
        const s = await open();
        await s.createCollection('Work', '#8a92b8');
        const item = await s.createItem(baseItem({ title: 'Movable' }));
        expect(await Bun.file(join(root, 'movable.md')).exists()).toBe(true);

        await s.updateItem(item.id, { collectionId: 'Work' });
        expect(await Bun.file(join(root, 'movable.md')).exists()).toBe(false);
        expect(await Bun.file(join(root, 'Work/movable.md')).exists()).toBe(true);
        expect(s.getItem(item.id)!.collectionId).toBe('Work');
    });

    it('does not rename the file when the title changes', async () => {
        const s = await open();
        const item = await s.createItem(baseItem({ title: 'Original' }));
        await s.updateItem(item.id, { title: 'Completely different' });

        // Renaming would churn git history and break inbound wikilinks.
        expect(await Bun.file(join(root, 'original.md')).exists()).toBe(true);
        expect(s.getItem(item.id)!.title).toBe('Completely different');
    });

    it('deletes to trash rather than unlinking', async () => {
        const s = await open();
        const item = await s.createItem(baseItem({ title: 'Doomed' }));
        await s.deleteItem(item.id);

        expect(s.getItem(item.id)).toBeNull();
        expect(await Bun.file(join(root, 'doomed.md')).exists()).toBe(false);
        const trashed = await s.vault.listMarkdown();
        expect(trashed).toEqual([]); // trash is not scanned
        const { readdir } = await import('node:fs/promises');
        expect((await readdir(join(root, '.lore/trash'))).length).toBe(1);
    });
});

describe('store: collections', () => {
    it('treats a bare folder as a collection with no collections.json', async () => {
        await write('Imported/a.md', '---\ntitle: A\n---\n\nbody');
        const s = await open();
        const collections = await s.listCollections();
        expect(collections.map((c) => c.id)).toContain('Imported');
        expect(collections.find((c) => c.id === 'Imported')!.color).toMatch(/^#/);
    });

    it('unfiles children to the root when a collection is deleted', async () => {
        // This is the contract memoryRepository.test.ts asserts, as a file move.
        const s = await open();
        await s.createCollection('Work', '#8a92b8');
        const item = await s.createItem(baseItem({ collectionId: 'Work', title: 'Filed' }));

        await s.deleteCollection('Work');

        expect((await s.listCollections()).map((c) => c.id)).not.toContain('Work');
        expect(s.getItem(item.id)!.collectionId).toBeUndefined();
        expect(await Bun.file(join(root, 'filed.md')).exists()).toBe(true);
    });

    it('keeps item ids when a collection is renamed', async () => {
        const s = await open();
        await s.createCollection('Work', '#8a92b8');
        const item = await s.createItem(baseItem({ collectionId: 'Work', title: 'Kept' }));

        await s.updateCollection('Work', { name: 'Job' });

        expect(s.getItem(item.id)!.collectionId).toBe('Job');
        expect(await Bun.file(join(root, 'Job/kept.md')).exists()).toBe(true);
    });

    it('ignores dot-directories and attachments/', async () => {
        await mkdir(join(root, 'attachments'), { recursive: true });
        await write('attachments/pic.md', '# not an item');
        const s = await open();
        expect((await s.listCollections()).map((c) => c.id)).not.toContain('attachments');
        expect(s.listItems().length).toBe(0);
    });
});

describe('store: wikilinks', () => {
    it('resolves related to ids in memory and writes stems to disk', async () => {
        const s = await open();
        const a = await s.createItem(baseItem({ title: 'Alpha' }));
        const b = await s.createItem(baseItem({ related: [a.id], title: 'Beta' }));

        expect(s.getItem(b.id)!.related).toEqual([a.id]);
        const text = await readFile(join(root, 'beta.md'), 'utf8');
        expect(text).toContain('[[alpha]]');
        expect(text).not.toContain(a.id);
    });

    it('preserves a link whose target does not exist yet', async () => {
        // Linking to a note you have not written is the normal workflow; Lore must
        // never be the reason it disappears on the next save.
        await write('a.md', '---\ntitle: A\nrelated:\n  - "[[not-yet-written]]"\n---\n\nbody');
        const s = await open();
        const item = s.listItems()[0];

        expect(item.related).toEqual([]);

        await s.updateItem(item.id, { title: 'A renamed' });
        const text = await readFile(join(root, 'a.md'), 'utf8');
        expect(text).toContain('[[not-yet-written]]');
    });

    it('heals a dead link once its target appears', async () => {
        await write('a.md', '---\ntitle: A\nrelated:\n  - "[[later]]"\n---\n\nb');
        const s = await open();
        expect(s.listItems()[0].related).toEqual([]);

        await write('later.md', '---\ntitle: Later\n---\n\nb');
        await s.reconcile();

        const a = s.listItems().find((i) => i.title === 'A')!;
        const later = s.listItems().find((i) => i.title === 'Later')!;
        expect(a.related).toEqual([later.id]);
    });
});

describe('store: itemMeta', () => {
    it('reports the file stats and who links here', async () => {
        const s = await open();
        const target = await s.createItem(baseItem({ body: 'one two three', title: 'Target' }));
        const source = await s.createItem(baseItem({ related: [target.id], title: 'Source' }));

        const meta = s.itemMeta(target.id)!;
        expect(meta.path).toBe('target.md');
        expect(meta.words).toBe(3);
        expect(meta.size).toBeGreaterThan(0);
        expect(meta.backlinks.map((b) => b.id)).toEqual([source.id]);

        // The inbound side is one-directional: the source has no backlinks of its own.
        expect(s.itemMeta(source.id)!.backlinks).toEqual([]);
    });

    it('is null for an unknown id', async () => {
        const s = await open();
        expect(s.itemMeta('nope')).toBeNull();
    });
});

describe('store: index', () => {
    it('rebuilds from the files after the index is deleted', async () => {
        const s = await open();
        await s.createItem(baseItem({ body: 'content', title: 'Durable' }));
        s.close();

        await rm(join(root, '.lore/index.db'), { force: true });
        store = await VaultStore.open(root);

        const item = store.listItems().find((i) => i.title === 'Durable')!;
        expect(item).toBeDefined();
        expect(store.getItem(item.id)!.body).toBe('content');
    });

    it('picks up an external edit on reconcile', async () => {
        const s = await open();
        const item = await s.createItem(baseItem({ title: 'Edited' }));

        // Simulate an edit from Obsidian or a git pull.
        const path = join(root, 'edited.md');
        const text = await readFile(path, 'utf8');
        await writeFile(path, text.replace('title: Edited', 'title: Edited elsewhere'), 'utf8');
        await s.reconcile();

        expect(s.getItem(item.id)!.title).toBe('Edited elsewhere');
    });

    it('notices a change even when the mtime lies', async () => {
        // git checkout, rsync and `cp -p` all set mtimes backwards.
        const s = await open();
        const item = await s.createItem(baseItem({ body: 'one', title: 'Sneaky' }));
        const path = join(root, 'sneaky.md');
        const before = await import('node:fs/promises').then((fs) => fs.stat(path));

        const text = await readFile(path, 'utf8');
        await writeFile(path, text.replace('one', 'two-different-length'), 'utf8');
        const { utimes } = await import('node:fs/promises');
        await utimes(path, before.atime, before.mtime);

        await s.reconcile();
        expect(s.getItem(item.id)!.body).toContain('two-different-length');
    });

    it('drops items whose files are gone', async () => {
        const s = await open();
        const item = await s.createItem(baseItem({ title: 'Vanishing' }));
        await rm(join(root, 'vanishing.md'));
        await s.reconcile();
        expect(s.getItem(item.id)).toBeNull();
    });
});

describe('store: search and tags', () => {
    it('finds an item by a word in its body', async () => {
        const s = await open();
        await s.createItem(
            baseItem({ body: 'mentions perceptual uniformity', title: 'Nothing obvious' }),
        );
        const hits = s.search('perceptual');
        expect(hits.map((i) => i.title)).toEqual(['Nothing obvious']);
    });

    it('prefix-matches so search works while typing', async () => {
        const s = await open();
        await s.createItem(baseItem({ title: 'Roadmap' }));
        expect(s.search('roadm').length).toBe(1);
    });

    it('returns nothing rather than throwing on a malformed query', async () => {
        const s = await open();
        await s.createItem(baseItem({ title: 'X' }));
        expect(s.search('"""').length).toBe(0);
    });

    it('counts tags across items', async () => {
        const s = await open();
        await s.createItem(baseItem({ tags: ['design', 'work'], title: 'A' }));
        await s.createItem(baseItem({ tags: ['design'], title: 'B' }));
        expect(s.listTags()).toEqual([
            { count: 2, name: 'design' },
            { count: 1, name: 'work' },
        ]);
    });
});

describe('search reaches what the list pane cannot', () => {
    it('finds a word past the first line, which the preview never shows', async () => {
        // The derived snippet is only the body's first line, and listItems omits
        // the body entirely — so the client-side filter cannot reach this word.
        const s = await open();
        await s.createItem(
            baseItem({
                body: 'Agenda\n\nWe agreed to defer the antialiasing work.',
                title: 'Meeting notes',
            }),
        );
        await s.createItem(baseItem({ body: 'Unrelated.', title: 'Other' }));

        const listed = s.listItems().find((i) => i.title === 'Meeting notes')!;
        expect(listed.body).toBeUndefined();
        expect(listed.snippet).toBe('Agenda');

        expect(s.search('antialiasing').map((i) => i.title)).toEqual(['Meeting notes']);
    });

    it("finds a word beyond the derived preview's cut-off", async () => {
        const s = await open();
        const long = `${'filler '.repeat(60)}needle`;
        await s.createItem(baseItem({ body: long, title: 'Long note' }));

        const listed = s.listItems()[0];
        expect(listed.snippet!.length).toBeLessThanOrEqual(200);
        expect(listed.snippet).not.toContain('needle');

        expect(s.search('needle')).toHaveLength(1);
    });

    it('matches a link by its url and description', async () => {
        const s = await open();
        await s.createItem(
            baseItem({
                description: 'Perceptual color',
                title: 'Opaque',
                type: 'link',
                url: 'https://oklch.com',
            }),
        );
        expect(s.search('oklch')).toHaveLength(1);
        expect(s.search('perceptual')).toHaveLength(1);
    });

    it('requires every term, so more words narrow the result', async () => {
        const s = await open();
        await s.createItem(baseItem({ body: 'shared word here', title: 'Alpha' }));
        await s.createItem(baseItem({ body: 'shared other', title: 'Beta' }));
        expect(s.search('shared')).toHaveLength(2);
        expect(s.search('shared word')).toHaveLength(1);
    });
});

describe('rename', () => {
    it('renames the file and rewrites every inbound wikilink', async () => {
        // This is the only consumer of the links table — before this existed, the
        // table was written on every index and never read.
        const s = await open();
        const target = await s.createItem(baseItem({ title: 'Original' }));
        const linker = await s.createItem(
            baseItem({ related: [target.id], title: 'Points at it' }),
        );

        expect(await readFile(join(root, 'points-at-it.md'), 'utf8')).toContain('[[original]]');

        await s.renameItem(target.id, 'Renamed thing');

        expect(await Bun.file(join(root, 'renamed-thing.md')).exists()).toBe(true);
        expect(await Bun.file(join(root, 'original.md')).exists()).toBe(false);

        // The link followed, so nothing dangles.
        const raw = await readFile(join(root, 'points-at-it.md'), 'utf8');
        expect(raw).toContain('[[renamed-thing]]');
        expect(raw).not.toContain('[[original]]');
        expect(s.getItem(linker.id)!.related).toEqual([target.id]);
    });

    it('keeps the id, so the item is the same item', async () => {
        const s = await open();
        const item = await s.createItem(baseItem({ body: 'kept', title: 'Before' }));
        const after = await s.renameItem(item.id, 'After');
        expect(after!.id).toBe(item.id);
        expect(after!.body).toBe('kept');
    });

    it('suffixes rather than overwriting an existing file', async () => {
        const s = await open();
        await s.createItem(baseItem({ title: 'Taken' }));
        const other = await s.createItem(baseItem({ title: 'Other' }));

        await s.renameItem(other.id, 'Taken');

        expect(await Bun.file(join(root, 'taken.md')).exists()).toBe(true);
        expect(await Bun.file(join(root, 'taken-2.md')).exists()).toBe(true);
        expect(s.listItems()).toHaveLength(2);
    });

    it('stays inside its collection folder', async () => {
        const s = await open();
        await s.createCollection('Work', '#8a92b8');
        const item = await s.createItem(baseItem({ collectionId: 'Work', title: 'Filed' }));
        await s.renameItem(item.id, 'Refiled');
        expect(await Bun.file(join(root, 'Work/refiled.md')).exists()).toBe(true);
        expect(s.getItem(item.id)!.collectionId).toBe('Work');
    });

    it('is a no-op when the name does not change', async () => {
        const s = await open();
        const item = await s.createItem(baseItem({ title: 'Same' }));
        const after = await s.renameItem(item.id, 'Same');
        expect(after!.id).toBe(item.id);
        expect(await Bun.file(join(root, 'same.md')).exists()).toBe(true);
    });
});
