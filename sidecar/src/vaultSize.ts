// What the vault weighs, and copying it somewhere else.
//
// Both walk the same tree and draw the same line through it: everything under
// `.lore/` is derived from the Markdown and rebuilt on the next open, so it is
// reported apart and never exported.

import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { LORE_DIR } from './vault';

export interface VaultSize {
    /** Bytes outside `.lore/`: the Markdown and anything pasted beside it. */
    content: number;
    /** Bytes under `.lore/` — the index and its caches. */
    derived: number;
    /** Files outside `.lore/`. */
    files: number;
}

/**
 * Copies the vault's own files — not the index — into a new folder under
 * `destination`, named after the vault and the day. An existing folder of that
 * name is never written into; the copy gets a numeric suffix instead, so
 * exporting twice in one day cannot overwrite the first one.
 */
export async function exportVault(
    root: string,
    destination: string,
): Promise<{ files: number; path: string }> {
    const target = await freeFolder(destination, exportName(root));
    await mkdir(target, { recursive: true });

    let files = 0;
    await walk(root, async (path, _bytes, derived) => {
        if (derived) return;
        const relative = path.slice(root.length + 1);
        const to = join(target, relative);
        await mkdir(join(to, '..'), { recursive: true });
        await copyFile(path, to);
        files += 1;
    });

    return { files, path: target };
}

export async function measureVault(root: string): Promise<VaultSize> {
    const size: VaultSize = { content: 0, derived: 0, files: 0 };

    await walk(root, async (path, bytes, derived) => {
        if (derived) {
            size.derived += bytes;
            return;
        }
        size.content += bytes;
        size.files += 1;
        void path;
    });

    return size;
}

async function exists(path: string): Promise<boolean> {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

function exportName(root: string): string {
    const name = root.split('/').filter(Boolean).pop() ?? 'vault';
    const day = new Date().toISOString().slice(0, 10);
    return `${name} export ${day}`;
}

async function freeFolder(destination: string, name: string): Promise<string> {
    for (let suffix = 0; suffix < 100; suffix += 1) {
        const candidate = join(destination, suffix ? `${name} (${suffix + 1})` : name);
        if (!(await exists(candidate))) return candidate;
    }
    throw new Error('a hundred exports in one day is enough');
}

/** Depth-first over every file, saying whether it is derived. */
async function walk(
    root: string,
    onFile: (path: string, bytes: number, derived: boolean) => Promise<void>,
    current = root,
): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
        const path = join(current, entry.name);
        // Symlinks are followed by neither: a link out of the vault would put
        // the export somewhere the user did not choose, and count bytes that
        // are not the vault's.
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) {
            await walk(root, onFile, path);
            continue;
        }
        if (!entry.isFile()) continue;
        const info = await stat(path);
        await onFile(path, info.size, path.startsWith(join(root, LORE_DIR)));
    }
}
