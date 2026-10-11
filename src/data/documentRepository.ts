// One Markdown file, opened on its own, behind the same seam the vault sits
// behind — which is what lets the detail pane and the properties panel show it
// without knowing the difference.
//
// The host reads and writes the file; the engine turns its text into an item
// and a property edit back into text. Neither is told a path by this side.

import type { Collection, Item, ItemMeta, TagCount } from '../store/types';
import type { ItemPatch, KnowledgeRepository } from './repository';

import {
    CHANGED_ON_DISK,
    readDocument,
    splitBody,
    splitFrontmatter,
    type StandaloneDocument,
    writeDocument,
} from '../lib/standaloneDocument';
import { HttpError, request } from './sidecarClient';
import { clearable } from './vaultRepository';

export interface DocumentStatus {
    /** The file changed on disk under an edit that is not saved yet. */
    conflict: boolean;
    error: null | string;
    file: { name: string; path: string } | null;
    /** Bumped each time the file is taken from disk rather than from an edit. */
    revision: number;
}

interface Facts {
    created: string;
    id: string;
    modified: string;
    stem: string;
}

interface Open {
    core: string;
    item: Item;
    lead: string;
    prefix: string;
    read: StandaloneDocument;
    tail: string;
}

const NOT_DELETABLE = 'A file opened on its own is not deleted from Lore.';
const NOT_OPEN = 'The file could not be read.';
const NOT_A_VAULT = 'A file opened on its own has no collections.';
const UNREADABLE =
    'This file’s frontmatter is not something Lore can read, so its properties were left alone.';

export class DocumentRepository implements KnowledgeRepository {
    /**
     * Set while the editor is being replaced by what is on disk. Unmounting
     * flushes its draft, and that draft is the one the user chose to drop.
     */
    discarding = false;

    get status(): DocumentStatus {
        return this.current;
    }
    private current: DocumentStatus = { conflict: false, error: null, file: null, revision: 0 };
    private first: null | Promise<void> = null;

    private listeners = new Set<() => void>();

    private open: null | Open = null;

    // Reads and writes run one at a time: two saves in flight would have the
    // second one checked against a modified time the first is about to change.
    private queue: Promise<unknown> = Promise.resolve();

    createCollection(): Promise<Collection> {
        return Promise.reject(new Error(NOT_A_VAULT));
    }

    createItem(): Promise<Item> {
        return Promise.reject(new Error(NOT_A_VAULT));
    }

    deleteCollection(): Promise<void> {
        return Promise.reject(new Error(NOT_A_VAULT));
    }

    /** Refused: the file is what the window is showing, and it has no other. */
    deleteItem(): Promise<void> {
        return Promise.reject(new Error(NOT_DELETABLE));
    }

    async getItem(): Promise<Item | null> {
        return (await this.ready()).item;
    }

    async itemMeta(): Promise<ItemMeta | null> {
        return meta(await this.ready());
    }

    /** Writes what this window holds over whatever is on disk. */
    keepMine(): Promise<void> {
        return this.enqueue(async () => {
            if (this.open) {
                await this.write(this.open, true);
            }
        });
    }

    listCollections(): Promise<Collection[]> {
        return Promise.resolve([]);
    }

    async listItems(): Promise<Item[]> {
        return [(await this.ready()).item];
    }

    async listTags(): Promise<TagCount[]> {
        return (await this.ready()).item.tags.map((tag) => ({ count: 1, name: tag }));
    }

    /** Takes the file from disk, dropping anything not saved. */
    reload(): Promise<void> {
        return this.enqueue(async () => this.adopt(await readDocument()));
    }

    /**
     * Picks up an edit made elsewhere. `busy` is asked when the read comes
     * back, not when it was requested: unsaved typing is the conflict banner's
     * to resolve, never this.
     */
    reloadIfChanged(busy: () => boolean): Promise<void> {
        return this.enqueue(async () => {
            if (!this.open || this.current.conflict) {
                return;
            }

            const read = await readDocument().catch(() => null);

            if (read && read.modified !== this.open.read.modified && !busy()) {
                await this.adopt(read);
            }
        });
    }

    search(): Promise<Item[]> {
        return Promise.resolve([]);
    }

    /** What is held right now, for a caller that cannot wait a tick for it. */
    snapshot(): { item: Item; meta: ItemMeta } | null {
        return this.open ? { item: this.open.item, meta: meta(this.open) } : null;
    }

    subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);

        return () => this.listeners.delete(listener);
    };

    updateCollection(): Promise<Collection> {
        return Promise.reject(new Error(NOT_A_VAULT));
    }

    updateItem(_id: string, patch: ItemPatch): Promise<Item> {
        // Read now rather than when the queue reaches this: the flush being
        // dropped is the one happening as the flag is set.
        const dropped = this.discarding && 'body' in patch;

        return this.enqueue(async () => {
            if (!this.open) {
                await this.adopt(await readDocument());
            }

            const open = this.open;

            if (!open) {
                throw new Error(NOT_OPEN);
            }

            if (dropped) {
                return open.item;
            }

            const { next, refused } = await this.edited(open, patch);

            if (next.read.text !== open.read.text) {
                this.open = next;
                await this.write(next, false);
            }

            // After the write, whose success clears the error it finds.
            if (refused) {
                this.emit({ ...this.current, error: refused });
            }

            return next.item;
        });
    }

    private async adopt(read: StandaloneDocument): Promise<void> {
        const { body, prefix } = splitFrontmatter(read.text);
        const parts = splitBody(body);
        const parsed = await request<Item>('/documents/parse', {
            body: JSON.stringify({ facts: facts(read), text: read.text }),
            method: 'POST',
            // A window that cannot reach the engine still edits the body, which
            // needs nothing parsed; only the properties wait for it.
        }).catch(() => bare(read));

        this.discarding = this.open !== null;
        this.open = { ...parts, item: shown(parsed, parts.core, read), prefix, read };
        this.emit({
            conflict: false,
            error: null,
            file: { name: read.name, path: read.path },
            revision: this.current.revision + 1,
        });
    }

    /**
     * `open` with the patch applied. The body is this side's and always lands;
     * the properties are the engine's, and are left as they were if it refuses.
     */
    private async edited(
        open: Open,
        patch: ItemPatch,
    ): Promise<{ next: Open; refused: null | string }> {
        const { body, ...properties } = patch;
        const core = 'body' in patch ? (body ?? '') : open.core;
        // An empty file gains the line end a text file is expected to close with.
        const tail = open.core || open.tail || !core ? open.tail : '\n';
        const text = open.prefix + open.lead + core + tail;
        const read = { ...open.read, text };
        const retyped: Open = { ...open, core, item: shown(open.item, core, read), read, tail };

        if (Object.keys(properties).length === 0) {
            return { next: retyped, refused: null };
        }

        try {
            const patched = await request<{ item: Item; text: string }>('/documents/patch', {
                body: JSON.stringify({
                    facts: facts(read),
                    patch: clearable(properties),
                    text,
                }),
                method: 'POST',
            });
            const split = splitFrontmatter(patched.text);
            const parts = splitBody(split.body);
            const written = { ...read, text: patched.text };

            return {
                next: {
                    ...parts,
                    item: shown(patched.item, parts.core, written),
                    prefix: split.prefix,
                    read: written,
                },
                refused: null,
            };
        } catch (reason) {
            return {
                next: retyped,
                refused:
                    reason instanceof HttpError && reason.status === 422
                        ? UNREADABLE
                        : message(reason),
            };
        }
    }

    private emit(status: DocumentStatus): void {
        this.current = status;
        this.listeners.forEach((listener) => listener());
    }

    private enqueue<TResult>(task: () => Promise<TResult>): Promise<TResult> {
        const run = this.queue.then(task);

        this.queue = run.catch((reason: unknown) => {
            this.emit({ ...this.current, error: message(reason) });
        });

        return run;
    }

    private async ready(): Promise<Open> {
        if (!this.open) {
            this.first ??= this.reload().finally(() => {
                this.first = null;
            });
            await this.first;
        }

        if (!this.open) {
            throw new Error(NOT_OPEN);
        }

        return this.open;
    }

    private async write(open: Open, overwrite: boolean): Promise<void> {
        try {
            const modified = await writeDocument(
                open.read.text,
                overwrite ? null : open.read.modified,
            );

            open.read = { ...open.read, modified };
            this.emit({ ...this.current, conflict: false, error: null });
        } catch (reason) {
            // Reported rather than thrown: what was typed is still held here,
            // and the next save carries it.
            this.emit(
                reason === CHANGED_ON_DISK
                    ? { ...this.current, conflict: true }
                    : { ...this.current, error: message(reason) },
            );
        }
    }
}

/** What the window shows when the engine cannot be asked: the file, as a note. */
function bare(read: StandaloneDocument): Item {
    const { created, modified } = facts(read);

    return {
        createdAt: created,
        flags: {},
        id: read.path,
        related: [],
        tags: [],
        title: stem(read.name),
        type: 'note',
        updatedAt: modified,
    };
}

function facts(read: StandaloneDocument): Facts {
    const modified = new Date(read.modified ?? Date.now()).toISOString();

    return {
        created: read.created === null ? modified : new Date(read.created).toISOString(),
        id: read.path,
        modified,
        stem: stem(read.name),
    };
}

function message(reason: unknown): string {
    return reason instanceof Error ? reason.message : String(reason);
}

function meta({ core, item, read }: Open): ItemMeta {
    return {
        backlinks: [],
        modifiedAt: read.modified === null ? item.updatedAt : new Date(read.modified).toISOString(),
        path: read.name,
        size: new TextEncoder().encode(read.text).length,
        unresolved: [],
        words: core ? core.split(/\s+/).length : 0,
    };
}

/**
 * The engine's item, carrying the body exactly as this side split it — the
 * engine trims its own way, and the three parts have to add back up to the
 * file — and the name the panel shows for the file.
 */
function shown(item: Item, core: string, read: StandaloneDocument): Item {
    return { ...item, body: core || undefined, id: read.path, path: read.name };
}

function stem(name: string): string {
    return name.replace(/\.(md|markdown)$/i, '');
}
