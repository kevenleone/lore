// Single place that decides which repository backs the app:
//   - inside Tauri  → VaultRepository (Markdown files, via the data engine)
//   - elsewhere     → MemoryRepository (Vite browser preview, unit tests)
//   - a window over one file provides its own (see `provideRepository`)

import type { KnowledgeRepository } from './repository';

import { MemoryRepository } from './memoryRepository';
import { VaultRepository } from './vaultRepository';

function isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

let instance: KnowledgeRepository | null = null;
let provided: KnowledgeRepository | null = null;
let workspacePath: null | string = null;

export function getRepository(): KnowledgeRepository {
    if (!instance) {
        instance = isTauri() ? new VaultRepository(workspacePath) : new MemoryRepository();
    }

    return instance;
}

/**
 * Backs this window with a repository of its own choosing, for one that is not
 * looking at a vault. It outlives `resetRepository`: the window it serves does
 * not change what it is looking at.
 */
export function provideRepository(repository: KnowledgeRepository | null): void {
    provided = repository;
    instance = repository;
}

/**
 * Tears the singleton down so the next `getRepository()` builds a fresh one.
 *
 * Opening a different workspace has to abandon the current store completely —
 * its connection and its file-watcher subscription — or the module-level cache
 * would hand back a repository still pointing at the previous vault.
 */
export async function resetRepository(): Promise<void> {
    if (provided) {
        return;
    }

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
