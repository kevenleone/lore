// The watcher path end to end: a file appearing on disk must reindex *and*
// notify. An earlier version notified without reindexing, so a subscriber
// refreshed and read a stale index — these tests exist to keep that fixed.

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Workspace } from '../src/workspace';

let root: string;
let workspace: Workspace;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-watch-'));
    workspace = new Workspace();
    await workspace.open(root);
});

afterEach(async () => {
    await workspace.close();
    await rm(root, { force: true, recursive: true });
});

/** Waits for a condition, since watch events are inherently asynchronous. */
async function eventually(check: () => boolean, ms = 4000): Promise<boolean> {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
        if (check()) return true;
        await Bun.sleep(50);
    }
    return false;
}

describe('watcher', () => {
    it('indexes a file dropped in by hand, without an explicit reindex', async () => {
        await mkdir(join(root, 'Reading List'), { recursive: true });
        await writeFile(
            join(root, 'Reading List/dropped-in.md'),
            '---\ntype: link\ntitle: Dropped in\nurl: https://example.test\n---\n\nbody\n',
            'utf8',
        );

        const found = await eventually(() =>
            workspace.current.listItems().some((i) => i.title === 'Dropped in'),
        );
        expect(found).toBe(true);

        const item = workspace.current.listItems().find((i) => i.title === 'Dropped in')!;
        expect(item.collectionId).toBe('Reading List');
    });

    it('notifies subscribers only after the index is up to date', async () => {
        // This is the ordering the bug got wrong: a subscriber that reads on the
        // signal must already see the change.
        let seenAtNotify: string[] = [];
        workspace.subscribe(() => {
            seenAtNotify = workspace.current.listItems().map((i) => i.title);
        });

        await writeFile(join(root, 'later.md'), '---\ntitle: Later\n---\n\nb\n', 'utf8');

        const ok = await eventually(() => seenAtNotify.includes('Later'));
        expect(ok).toBe(true);
    });

    it('notices a file being removed', async () => {
        await writeFile(join(root, 'gone.md'), '---\ntitle: Gone\n---\n\nb\n', 'utf8');
        expect(await eventually(() => workspace.current.listItems().length === 1)).toBe(true);

        await rm(join(root, 'gone.md'));
        expect(await eventually(() => workspace.current.listItems().length === 0)).toBe(true);
    });
});
