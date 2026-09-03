// Single place that decides which repository backs the app:
//   - inside Tauri  → VaultRepository (Markdown files, via the data engine)
//   - elsewhere     → MemoryRepository (Vite browser preview, unit tests)
//
// LocalRepository (SQLite) is no longer selected. It stays in the tree only so
// the one-shot migration can still read a legacy `lore.db`; see migrateSqlite.

import type { KnowledgeRepository } from './repository';

import { MemoryRepository } from './memoryRepository';
import { VaultRepository } from './vaultRepository';

function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

let instance: KnowledgeRepository | null = null;
let workspacePath: null | string = null;

/**
 * Makes sure the backing store is ready before anything writes to it directly.
 * Only the SQLite import needs this; every normal call opens lazily on its own.
 */
export async function ensureWorkspaceOpen(): Promise<void> {
    const repo = getRepository();
    if (repo instanceof VaultRepository) await repo.ensureOpen();
}

export function getRepository(): KnowledgeRepository {
    if (!instance) {
        instance = isTauri() ? new VaultRepository(workspacePath) : new MemoryRepository();
    }
    return instance;
}

/**
 * Tears the singleton down so the next `getRepository()` builds a fresh one.
 *
 * Opening a different workspace has to abandon the current store completely —
 * its connection and its file-watcher subscription — or the module-level cache
 * would hand back a repository still pointing at the previous vault.
 */
export async function resetRepository(): Promise<void> {
    const current = instance;
    instance = null;
    await current?.dispose?.();
}

/**
 * Points the app at a different vault. The next `getRepository()` builds a
 * repository for it; the caller is responsible for re-hydrating the store.
 */
export async function setWorkspace(path: null | string): Promise<void> {
    workspacePath = path;
    await resetRepository();
}

export type { KnowledgeRepository } from './repository';
