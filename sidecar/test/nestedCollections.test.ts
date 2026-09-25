// Folders inside folders.
//
// A collection id *is* its path, so nesting is mostly a question of what the
// listing walks — and of everything that used to compare an id for equality
// where it now means "is under".

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { VaultStore } from '../src/index/store';
import { COLLECTIONS_FILE } from '../src/vault';

let root: string;
let store: VaultStore;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-nested-'));
});

afterEach(async () => {
    store?.close();
    await rm(root, { force: true, recursive: true });
});

const note = async (relPath: string, title: string): Promise<void> => {
    const slash = relPath.lastIndexOf('/');

    if (slash > 0) {
        await mkdir(join(root, relPath.slice(0, slash)), { recursive: true });
    }

    await writeFile(join(root, relPath), `---\ntitle: ${title}\n---\n\nBody.\n`, 'utf8');
};

const open = async (): Promise<void> => {
    store = await VaultStore.open(root);
};

const ids = async (): Promise<string[]> =>
    (await store.listCollections()).map((collection) => collection.id);

const collectionOfTitle = (title: string): string | undefined =>
    store.listItems().find((item) => item.title === title)?.collectionId;

describe('listing', () => {
    it('lists a folder inside a folder', async () => {
        await note('Work/Projects/one.md', 'One');
        await open();

        expect(await ids()).toEqual(['Work', 'Work/Projects']);
    });

    it('files a nested note into the collection that now exists', async () => {
        // The bug this closes: the id was already `Work/Projects` while the
        // listing stopped at `Work`, so the note belonged to nothing.
        await note('Work/Projects/one.md', 'One');
        await open();

        expect(collectionOfTitle('One')).toBe('Work/Projects');
        expect(await ids()).toContain('Work/Projects');
    });

    it('goes as deep as the folders do', async () => {
        await note('A/B/C/D/deep.md', 'Deep');
        await open();

        expect(await ids()).toEqual(['A', 'A/B', 'A/B/C', 'A/B/C/D']);
    });

    it('lists a folder with no notes of its own', async () => {
        await note('Work/Projects/one.md', 'One');
        await open();

        expect(await ids()).toContain('Work');
    });

    it('still ignores the folders it always ignored, at any depth', async () => {
        await note('Work/one.md', 'One');
        await mkdir(join(root, 'Work/.hidden'), { recursive: true });
        await mkdir(join(root, 'Work/node_modules'), { recursive: true });
        await open();

        expect(await ids()).toEqual(['Work']);
    });

    it('leaves a flat vault exactly as it was', async () => {
        await note('Work/one.md', 'One');
        await note('Reading/two.md', 'Two');
        await open();

        expect(await ids()).toEqual(['Reading', 'Work']);
    });
});

describe('creating', () => {
    it('makes a child when the name carries a path', async () => {
        await note('Work/one.md', 'One');
        await open();

        await store.createCollection('Work/Projects', '#888');

        expect(await ids()).toContain('Work/Projects');
    });

    it('makes the parent too, if it is not there yet', async () => {
        await note('root.md', 'Root');
        await open();

        await store.createCollection('Fresh/Child', '#888');

        expect(await ids()).toEqual(['Fresh', 'Fresh/Child']);
    });
});

describe('renaming a parent', () => {
    it('takes its children with it', async () => {
        await note('Work/Projects/one.md', 'One');
        await open();

        await store.updateCollection('Work', { name: 'Research' });

        expect(await ids()).toEqual(['Research', 'Research/Projects']);
        expect(collectionOfTitle('One')).toBe('Research/Projects');
    });

    it('rekeys a child’s stored colour rather than orphaning it', async () => {
        await note('Work/Projects/one.md', 'One');
        await open();
        await store.updateCollection('Work/Projects', { color: '#123456' });

        await store.updateCollection('Work', { name: 'Research' });

        const saved = JSON.parse(await readFile(join(root, COLLECTIONS_FILE), 'utf8')) as {
            collections: { color: string; folder: string }[];
        };
        const child = saved.collections.find((entry) => entry.folder === 'Research/Projects');

        expect(child?.color).toBe('#123456');
    });

    it('leaves a sibling that merely starts with the same letters alone', async () => {
        await note('Work/one.md', 'One');
        await note('Workshop/two.md', 'Two');
        await open();

        await store.updateCollection('Work', { name: 'Research' });

        expect(await ids()).toEqual(['Research', 'Workshop']);
    });
});

describe('deleting a parent', () => {
    it('unfiles every note beneath it, however deep', async () => {
        await note('Work/Projects/one.md', 'One');
        await note('Work/top.md', 'Top');
        await open();

        await store.deleteCollection('Work');

        expect(await ids()).toEqual([]);
        expect(collectionOfTitle('One')).toBeUndefined();
        expect(collectionOfTitle('Top')).toBeUndefined();
    });

    it('drops its children’s stored colours, so they cannot come back', async () => {
        await note('Work/Projects/one.md', 'One');
        await open();
        await store.updateCollection('Work/Projects', { color: '#123456' });

        await store.deleteCollection('Work');

        const saved = JSON.parse(await readFile(join(root, COLLECTIONS_FILE), 'utf8')) as {
            collections: { folder: string }[];
        };

        expect(saved.collections).toEqual([]);
    });

    it('leaves a sibling with a similar name alone', async () => {
        await note('Work/one.md', 'One');
        await note('Workshop/two.md', 'Two');
        await open();

        await store.deleteCollection('Work');

        expect(await ids()).toEqual(['Workshop']);
        expect(collectionOfTitle('Two')).toBe('Workshop');
    });
});

describe('filenames', () => {
    it('lets the same stem live in a parent and its child', async () => {
        await note('Work/notes.md', 'Parent copy');
        await note('Work/Projects/notes.md', 'Child copy');
        await open();

        expect(store.listItems()).toHaveLength(2);
        expect(collectionOfTitle('Parent copy')).toBe('Work');
        expect(collectionOfTitle('Child copy')).toBe('Work/Projects');
    });
});
