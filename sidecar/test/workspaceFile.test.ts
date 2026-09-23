// `.lore/workspace.json` — the per-vault settings file. It is committed and
// hand-editable, so the tests that matter are the ones about surviving a file
// someone else wrote.

import type { SavedSearch } from '@lore/types';

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LORE_DIR, Vault, WORKSPACE_FILE } from '../src/vault';

let root: string;
let vault: Vault;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-ws-'));
    vault = new Vault(root);
    await mkdir(join(root, LORE_DIR), { recursive: true });
});

afterEach(async () => {
    await rm(root, { force: true, recursive: true });
});

const writeRaw = (text: string) => writeFile(join(root, WORKSPACE_FILE), text, 'utf8');
const readRaw = async () => JSON.parse(await readFile(join(root, WORKSPACE_FILE), 'utf8'));

const search = (over: Partial<SavedSearch> = {}): SavedSearch => ({
    filters: { categories: [], collectionIds: [], from: null, tags: ['product'], to: null },
    id: 's1',
    name: 'Product reading',
    query: '',
    view: { kind: 'all', val: null },
    ...over,
});

describe('readWorkspaceFile', () => {
    it('answers empty when there is no file at all', async () => {
        expect(await vault.readWorkspaceFile()).toEqual({ savedSearches: [], tagOrder: [] });
    });

    it('answers empty rather than throwing on a file that is not JSON', async () => {
        await writeRaw('{ this is not json');

        expect(await vault.readWorkspaceFile()).toEqual({ savedSearches: [], tagOrder: [] });
    });

    it('keeps the entries it can read and drops the ones it cannot', async () => {
        await writeRaw(
            JSON.stringify({
                savedSearches: [
                    search(),
                    { id: 'no-name' },
                    'not an object',
                    search({ id: 's2', name: 'Second' }),
                ],
                tagOrder: ['product', 42, 'research'],
            }),
        );

        const parsed = await vault.readWorkspaceFile();

        expect(parsed.savedSearches.map((entry) => entry.id)).toEqual(['s1', 's2']);
        expect(parsed.tagOrder).toEqual(['product', 'research']);
    });

    it('drops a search whose filters are the wrong shape', async () => {
        await writeRaw(
            JSON.stringify({ savedSearches: [search({ filters: { tags: 'product' } })] }),
        );

        expect((await vault.readWorkspaceFile()).savedSearches).toEqual([]);
    });
});

describe('writeWorkspaceFile', () => {
    it('round-trips a saved search', async () => {
        await vault.writeWorkspaceFile({ savedSearches: [search()] });

        expect((await vault.readWorkspaceFile()).savedSearches).toEqual([search()]);
    });

    it('leaves the other half of the file alone', async () => {
        // The two have separate writers that arrive independently; saving a
        // search must not drop the tag order the sidebar wrote a moment ago.
        await vault.writeWorkspaceFile({ tagOrder: ['product', 'research'] });
        await vault.writeWorkspaceFile({ savedSearches: [search()] });

        const parsed = await vault.readWorkspaceFile();

        expect(parsed.tagOrder).toEqual(['product', 'research']);
        expect(parsed.savedSearches).toHaveLength(1);
    });

    it('keeps the file versioned so a later schema can tell what it is reading', async () => {
        await vault.writeWorkspaceFile({ savedSearches: [] });

        expect((await readRaw()).version).toBe(1);
    });
});
