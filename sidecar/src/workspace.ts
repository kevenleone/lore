// Holds the currently-open vault, and swaps it when the user opens another
// folder. One place owns the store, the watcher and the SSE subscribers, so a
// switch has exactly one teardown path.

import type { Item } from '@lore/types';

import { hashContent } from './index/db';
import { VaultStore } from './index/store';
import { type Watcher, watchVault } from './watch';

type Subscriber = (paths: string[]) => void;

export class Workspace {
    get current(): VaultStore {
        if (!this.store) throw new WorkspaceNotOpen();
        return this.store;
    }
    get isOpen(): boolean {
        return this.store !== null;
    }
    get path(): null | string {
        return this.store?.vault.root ?? null;
    }
    /**
     * Content this process last wrote to each path, so the watcher can recognise
     * its own echo. Keyed by hash rather than by time because a single write
     * produces several filesystem events on macOS — a one-shot mark is consumed
     * by the first and the rest leak through.
     */
    private selfWrites = new Map<string, { at: number; hash: string }>();

    private store: null | VaultStore = null;

    private subscribers = new Set<Subscriber>();

    private watcher: null | Watcher = null;

    async close(): Promise<void> {
        this.watcher?.close();
        this.watcher = null;
        this.store?.close();
        this.store = null;
    }

    /** Announce a change the sidecar made itself, so the UI stays in step. */
    notify(paths: string[] = []): void {
        this.emit(paths);
    }

    /* ---------------- change notification ---------------- */

    async open(root: string): Promise<{ itemCount: number; path: string }> {
        await this.close();
        this.store = await VaultStore.open(root);
        // Without this the watcher fires on every save Lore makes, so each edit
        // costs a needless reconcile and a refresh round-trip back to the UI.
        this.store.onWrite = (rel, text) => this.markSelfWrite(rel, text);
        this.watcher = watchVault(root, (paths) => void this.onFilesChanged(paths));
        return { itemCount: this.store.listItems().length, path: root };
    }

    /** Re-reads from disk and tells subscribers. */
    async reconcile(): Promise<{ indexed: number; removed: number }> {
        const result = await this.current.reconcile();
        if (result.indexed || result.removed) this.emit([]);
        return result;
    }

    subscribe(fn: Subscriber): () => void {
        this.subscribers.add(fn);
        return () => this.subscribers.delete(fn);
    }

    private emit(paths: string[]): void {
        for (const fn of this.subscribers) fn(paths);
    }

    /** Records what we wrote, so the events it produces can be recognised. */
    private markSelfWrite(relPath: string, text: null | string): void {
        if (text === null) {
            // A move: there is no content to compare, so fall back to a short window.
            this.selfWrites.set(relPath, { at: Date.now(), hash: '' });
            return;
        }
        this.selfWrites.set(relPath, { at: Date.now(), hash: hashContent(text) });
    }

    private async onFilesChanged(paths: string[]): Promise<void> {
        if (!this.store) return;
        const external: string[] = [];
        for (const path of paths) {
            if (!(await this.wasSelfWrite(path))) external.push(path);
        }
        // Everything in this batch was our own doing, and indexOne already recorded
        // it — reindexing and refreshing the UI would be pure waste.
        if (external.length === 0) return;

        try {
            await this.current.reconcile();
        } catch {
            // The workspace may have closed mid-event; the next open reconciles.
            return;
        }
        this.emit(external);
    }

    /**
     * True when the file on disk still holds exactly what we wrote.
     *
     * Comparing content rather than counting events is what makes this correct in
     * both directions: several events for one write are all recognised, and an
     * edit by someone else lands with a different hash and gets through even if
     * it arrives moments after ours.
     */
    private async wasSelfWrite(relPath: string): Promise<boolean> {
        const mark = this.selfWrites.get(relPath);
        if (!mark) return false;
        if (Date.now() - mark.at > 5000) {
            this.selfWrites.delete(relPath);
            return false;
        }
        // A move leaves nothing to compare against.
        if (!mark.hash) return true;
        try {
            return hashContent(await this.current.vault.readText(relPath)) === mark.hash;
        } catch {
            // Gone — a delete is a real change.
            return false;
        }
    }
}

export class WorkspaceNotOpen extends Error {
    constructor() {
        super('no workspace is open');
        this.name = 'WorkspaceNotOpen';
    }
}

export type { Item };
