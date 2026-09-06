// The optional vault tracking `Lore Onboarding.dc.html` offers. Both routes act
// on a folder path rather than the open workspace, because onboarding asks
// before anything is open.

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { gitStatus, initGit } from '../src/git';

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-git-'));
});

afterEach(async () => {
    await rm(root, { force: true, recursive: true });
});

const exists = (path: string) =>
    access(path).then(
        () => true,
        () => false,
    );

describe('gitStatus', () => {
    it('reports a plain folder as untracked', async () => {
        expect(await gitStatus(root)).toEqual({ tracked: false });
    });

    it('reports a folder that already has .git as tracked', async () => {
        await mkdir(join(root, '.git'));
        expect(await gitStatus(root)).toEqual({ tracked: true });
    });

    it('answers rather than throwing for a folder that is not there', async () => {
        expect(await gitStatus(join(root, 'nowhere'))).toEqual({ tracked: false });
    });
});

describe('initGit', () => {
    it('turns the folder into a repository and writes a .gitignore', async () => {
        expect(await initGit(root)).toEqual({ tracked: true });
        expect(await exists(join(root, '.git'))).toBe(true);
        expect(await Bun.file(join(root, '.gitignore')).text()).toContain('.lore/index.db');
    });

    it('creates the folder when it does not exist yet', async () => {
        const fresh = join(root, 'Lore Vault');
        expect(await initGit(fresh)).toEqual({ tracked: true });
        expect(await exists(join(fresh, '.git'))).toBe(true);
    });

    it("leaves an existing repository and the user's own .gitignore alone", async () => {
        await initGit(root);
        await writeFile(join(root, '.gitignore'), 'mine\n', 'utf8');

        expect(await initGit(root)).toEqual({ tracked: true });
        expect(await Bun.file(join(root, '.gitignore')).text()).toBe('mine\n');
    });
});
