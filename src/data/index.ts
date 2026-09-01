// Single place that decides which repository backs the app:
//   - inside Tauri  → LocalRepository (SQLite, the source of truth)
//   - elsewhere     → MemoryRepository (Vite browser preview, unit tests)
// The Markdown vault (via the Bun sidecar) slots in here later without touching
// the UI.

import { LocalRepository } from "./localRepository";
import { MemoryRepository } from "./memoryRepository";
import type { KnowledgeRepository } from "./repository";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let instance: KnowledgeRepository | null = null;

export function getRepository(): KnowledgeRepository {
  if (!instance) {
    instance = isTauri() ? new LocalRepository() : new MemoryRepository();
  }
  return instance;
}

/**
 * Tears the singleton down so the next `getRepository()` builds a fresh one.
 *
 * Nothing calls this yet — it exists because opening a different workspace has
 * to abandon the current store completely (its connection, and later its
 * file-watcher subscription). Without it the module-level cache would hand back
 * a repository still pointing at the previous vault.
 */
export async function resetRepository(): Promise<void> {
  const current = instance;
  instance = null;
  await current?.dispose?.();
}

export type { KnowledgeRepository } from "./repository";
