// Holds the currently-open vault, and swaps it when the user opens another
// folder. One place owns the store, the watcher and the SSE subscribers, so a
// switch has exactly one teardown path.

import type { Item } from "@lore/types";
import { VaultStore } from "./index/store";
import { watchVault, type Watcher } from "./watch";

type Subscriber = (paths: string[]) => void;

export class Workspace {
  private store: VaultStore | null = null;
  private watcher: Watcher | null = null;
  private subscribers = new Set<Subscriber>();
  /** Paths this process just wrote, so the watcher can ignore its own echo. */
  private selfWrites = new Map<string, number>();

  get current(): VaultStore {
    if (!this.store) throw new WorkspaceNotOpen();
    return this.store;
  }

  get path(): string | null {
    return this.store?.vault.root ?? null;
  }

  get isOpen(): boolean {
    return this.store !== null;
  }

  async open(root: string): Promise<{ path: string; itemCount: number }> {
    await this.close();
    this.store = await VaultStore.open(root);
    this.watcher = watchVault(
      root,
      (paths) => this.emit(paths),
      (rel) => this.wasSelfWrite(rel),
    );
    return { path: root, itemCount: this.store.listItems().length };
  }

  async close(): Promise<void> {
    this.watcher?.close();
    this.watcher = null;
    this.store?.close();
    this.store = null;
  }

  /* ---------------- change notification ---------------- */

  subscribe(fn: Subscriber): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  /** Announce a change the sidecar made itself, so the UI stays in step. */
  notify(paths: string[] = []): void {
    this.emit(paths);
  }

  private emit(paths: string[]): void {
    for (const fn of this.subscribers) fn(paths);
  }

  /**
   * Marks a path as written by us. The watcher event arrives a moment later and
   * is dropped; the mark expires so an external edit to the same file soon
   * after is still noticed.
   */
  markSelfWrite(relPath: string): void {
    this.selfWrites.set(relPath, Date.now());
  }

  private wasSelfWrite(relPath: string): boolean {
    const at = this.selfWrites.get(relPath);
    if (at === undefined) return false;
    this.selfWrites.delete(relPath);
    return Date.now() - at < 2000;
  }

  /** Re-reads from disk and tells subscribers. */
  async reconcile(): Promise<{ indexed: number; removed: number }> {
    const result = await this.current.reconcile();
    if (result.indexed || result.removed) this.emit([]);
    return result;
  }
}

export class WorkspaceNotOpen extends Error {
  constructor() {
    super("no workspace is open");
    this.name = "WorkspaceNotOpen";
  }
}

export type { Item };
