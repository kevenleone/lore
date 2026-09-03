// Watches the vault so an edit made outside Lore — a git pull, Obsidian, vim —
// shows up in the app without a restart.

import { type FSWatcher, watch } from 'node:fs';

import { isIgnoredFile, LORE_DIR } from './vault';

const DEBOUNCE_MS = 150;

export interface Watcher {
    close(): void;
}

/**
 * Calls `onChange` after the vault settles.
 *
 * Deciding which of those paths are the sidecar's own writes happens in the
 * Workspace, not here: it needs to read the file to compare hashes, which this
 * synchronous callback cannot do.
 */
export function watchVault(root: string, onChange: (paths: string[]) => void): Watcher {
    let timer: null | ReturnType<typeof setTimeout> = null;
    let pending = new Set<string>();
    let watcher: FSWatcher | null = null;

    const flush = () => {
        timer = null;
        const paths = [...pending];
        pending = new Set();
        if (paths.length) onChange(paths);
    };

    try {
        watcher = watch(root, { recursive: true }, (_event, filename) => {
            if (!filename) return;
            const rel = filename.toString().replace(/\\/g, '/');
            if (isNoise(rel)) return;
            pending.add(rel);
            if (timer) clearTimeout(timer);
            timer = setTimeout(flush, DEBOUNCE_MS);
        });
    } catch {
        // Recursive watching is unavailable on some Linux kernels. The vault still
        // works — external edits just need an explicit reindex.
        watcher = null;
    }

    return {
        close() {
            if (timer) clearTimeout(timer);
            watcher?.close();
        },
    };
}

/** Paths that change constantly and never represent an item. */
function isNoise(relPath: string): boolean {
    if (!relPath) return true;
    const parts = relPath.split(/[\\/]/);
    if (parts.some((p) => p === LORE_DIR || p === '.git' || p === 'node_modules')) return true;
    const name = parts[parts.length - 1];
    return isIgnoredFile(name) || name === '.DS_Store' || !name.endsWith('.md');
}
