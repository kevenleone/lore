import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LORE_DIR } from '../src/vault';
import { exportVault, measureVault } from '../src/vaultSize';

let root: string;
let destination: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-size-'));
    destination = await mkdtemp(join(tmpdir(), 'lore-dest-'));
});

afterEach(async () => {
    await rm(root, { force: true, recursive: true });
    await rm(destination, { force: true, recursive: true });
});

const write = async (rel: string, text: string) => {
    await mkdir(join(root, rel, '..'), { recursive: true });
    await writeFile(join(root, rel), text, 'utf8');
};

describe('measureVault', () => {
    it('counts the vault and its index apart', async () => {
        await write('note.md', 'x'.repeat(100));
        await write('Work/task.md', 'y'.repeat(50));
        await write(`${LORE_DIR}/index.db`, 'z'.repeat(999));

        const size = await measureVault(root);

        expect(size.files).toBe(2);
        expect(size.content).toBe(150);
        expect(size.derived).toBe(999);
    });

    it('is zero for an empty vault', async () => {
        expect(await measureVault(root)).toEqual({ content: 0, derived: 0, files: 0 });
    });
});

describe('exportVault', () => {
    it('copies the Markdown and leaves the index behind', async () => {
        await write('note.md', 'hello');
        await write('Work/task.md', 'todo');
        await write(`${LORE_DIR}/index.db`, 'derived');

        const result = await exportVault(root, destination);

        expect(result.files).toBe(2);
        expect(await readFile(join(result.path, 'note.md'), 'utf8')).toBe('hello');
        expect(await readFile(join(result.path, 'Work/task.md'), 'utf8')).toBe('todo');
        expect(await readdir(result.path)).not.toContain(LORE_DIR);
    });

    it('never writes into an export that is already there', async () => {
        await write('note.md', 'first');
        const first = await exportVault(root, destination);

        await write('note.md', 'second');
        const second = await exportVault(root, destination);

        expect(second.path).not.toBe(first.path);
        expect(await readFile(join(first.path, 'note.md'), 'utf8')).toBe('first');
        expect(await readFile(join(second.path, 'note.md'), 'utf8')).toBe('second');
    });
});
