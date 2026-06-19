// Single place that decides which repository backs the app:
//   - inside Tauri  → LocalRepository (SQLite, the source of truth)
//   - elsewhere     → MemoryRepository (Vite browser preview, unit tests)
// A future setting can return a Convex-backed repository here without touching
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

export type { KnowledgeRepository } from "./repository";
