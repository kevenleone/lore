import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { readKnownVaults, recordVault } from '../../src/services/known-vaults';
import { Workspace } from '../../src/services/workspace';

let dir: string;
let file: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lore-known-vaults-'));
    file = join(dir, 'App Support', 'vaults.json');
});

afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
});

describe('known vaults', () => {
    it('knows none before a vault is opened, or when the file is unreadable', async () => {
        expect(await readKnownVaults(file)).toEqual({ current: null, recent: [] });

        await recordVault(file, '/a');
        await writeFile(file, '{ not json');
        expect(await readKnownVaults(file)).toEqual({ current: null, recent: [] });
    });

    it('makes the last vault opened current, and keeps each once, newest first', async () => {
        await recordVault(file, '/a', new Date('2026-10-01T00:00:00Z'));
        await recordVault(file, '/b', new Date('2026-10-02T00:00:00Z'));
        await recordVault(file, '/a', new Date('2026-10-03T00:00:00Z'));

        expect(await readKnownVaults(file)).toEqual({
            current: '/a',
            recent: [
                { openedAt: '2026-10-03T00:00:00.000Z', path: '/a' },
                { openedAt: '2026-10-02T00:00:00.000Z', path: '/b' },
            ],
        });
    });

    it('forgets the oldest past ten', async () => {
        for (let index = 0; index < 12; index++) {
            await recordVault(file, `/vault-${index}`);
        }

        const { recent } = await readKnownVaults(file);

        expect(recent).toHaveLength(10);
        expect(recent[0].path).toBe('/vault-11');
    });

    it('hears of every vault the engine opens', async () => {
        const workspace = new Workspace();
        const opened: string[] = [];

        workspace.onOpen = (root) => opened.push(root);
        await workspace.open(dir);
        await workspace.close();

        expect(opened).toEqual([dir]);
    });
});
