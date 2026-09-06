// The vault directory: path safety, the folders-are-collections mapping, and
// `.lore/`.

import type { Collection } from '@lore/types';

import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { slugify } from './slug';

export const LORE_DIR = '.lore';
export const TRASH_DIR = `${LORE_DIR}/trash`;
export const COLLECTIONS_FILE = `${LORE_DIR}/collections.json`;
export const WORKSPACE_FILE = `${LORE_DIR}/workspace.json`;
export const INDEX_FILE = `${LORE_DIR}/index.db`;

/** Never a collection: reserved for pasted files. */
export const ATTACHMENTS_DIR = 'attachments';

const GITIGNORE = `# Derived from the Markdown files — safe to delete, rebuilt on next open.
index.db
index.db-wal
index.db-shm
cache/
trash/
`;

export class Vault {
    constructor(readonly root: string) {}

    /** Creates `.lore/` and the gitignore that keeps derived files out of commits. */
    async ensureScaffold(): Promise<void> {
        await mkdir(this.path(LORE_DIR), { recursive: true });
        await mkdir(this.path(TRASH_DIR), { recursive: true });
        const ignorePath = this.path(`${LORE_DIR}/.gitignore`);
        if (!(await Bun.file(ignorePath).exists())) {
            await writeFile(ignorePath, GITIGNORE, 'utf8');
        }
    }

    /**
     * Collection folders. Only top-level directories count — nested folders are
     * deliberately not collections yet, since the sidebar has no tree.
     */
    async listCollectionFolders(): Promise<string[]> {
        const entries = await readdir(this.root, { withFileTypes: true });
        return entries
            .filter((e) => e.isDirectory() && !isIgnoredDir(e.name))
            .map((e) => e.name)
            .sort((a, b) => a.localeCompare(b));
    }

    /**
     * Folders ∪ collections.json. A folder with no entry is still a collection —
     * cloning a plain folder of Markdown has to Just Work, so the JSON is only
     * ever an enhancement.
     */
    async listCollections(): Promise<Collection[]> {
        const [folders, meta] = await Promise.all([
            this.listCollectionFolders(),
            this.readCollectionsFile(),
        ]);
        return folders
            .map((folder) => ({
                _order: meta[folder]?.order ?? Number.MAX_SAFE_INTEGER,
                color: meta[folder]?.color ?? hashColor(folder),
                id: folder,
                name: folder,
            }))
            .sort((a, b) => a._order - b._order || a.name.localeCompare(b.name))
            .map(({ _order, ...c }) => c);
    }

    /** Every `.md` file in the vault, as vault-relative paths. */
    async listMarkdown(): Promise<string[]> {
        const out: string[] = [];
        const walk = async (dirRel: string): Promise<void> => {
            const entries = await readdir(this.path(dirRel) || this.root, { withFileTypes: true });
            for (const e of entries) {
                const rel = dirRel ? `${dirRel}/${e.name}` : e.name;
                if (e.isDirectory()) {
                    if (!isIgnoredDir(e.name)) await walk(rel);
                } else if (e.name.endsWith('.md') && !isIgnoredFile(e.name)) {
                    out.push(rel);
                }
            }
        };
        await walk('');
        return out;
    }

    async move(fromRel: string, toRel: string): Promise<void> {
        const to = this.path(toRel);
        await mkdir(dirname(to), { recursive: true });
        await rename(this.path(fromRel), to);
    }

    path(relPath: string): string {
        return safeJoin(this.root, relPath);
    }

    /** Raw bytes of a file in `attachments/`. */
    async readAttachment(relPath: string): Promise<Uint8Array> {
        if (!relPath.startsWith(`${ATTACHMENTS_DIR}/`)) {
            throw new Error(`not an attachment: ${relPath}`);
        }
        return readFile(this.path(relPath));
    }

    async readCollectionsFile(): Promise<Record<string, { color?: string; order?: number }>> {
        try {
            const raw = await this.readText(COLLECTIONS_FILE);
            const parsed = JSON.parse(raw) as { collections?: unknown };
            if (!Array.isArray(parsed.collections)) return {};
            const out: Record<string, { color?: string; order?: number }> = {};
            for (const c of parsed.collections) {
                if (
                    c &&
                    typeof c === 'object' &&
                    typeof (c as { folder?: unknown }).folder === 'string'
                ) {
                    const { color, folder, order } = c as {
                        color?: string;
                        folder: string;
                        order?: number;
                    };
                    out[folder] = { color, order };
                }
            }
            return out;
        } catch {
            // Missing or malformed: colours fall back to the name hash, which is the
            // point — a plain folder of Markdown must work with no sidecar metadata.
            return {};
        }
    }

    async readText(relPath: string): Promise<string> {
        return readFile(this.path(relPath), 'utf8');
    }

    /**
     * Per-vault settings. Committed alongside the notes, so a vault carries its
     * own sidebar tag order rather than inheriting the app's sample one.
     */
    async readWorkspaceFile(): Promise<{ tagOrder: string[] }> {
        try {
            const parsed = JSON.parse(await this.readText(WORKSPACE_FILE)) as {
                tagOrder?: unknown;
            };
            const tagOrder = Array.isArray(parsed.tagOrder)
                ? parsed.tagOrder.filter((t): t is string => typeof t === 'string')
                : [];
            return { tagOrder };
        } catch {
            return { tagOrder: [] };
        }
    }

    /**
     * Copies a captured file into `attachments/` under a slugged, collision-free
     * name, and answers with its vault-relative path. The path is what goes on
     * the item: a URL would carry the sidecar's port, which changes every launch.
     */
    async writeAttachment(filename: string, bytes: Uint8Array): Promise<string> {
        const dir = this.path(ATTACHMENTS_DIR);
        await mkdir(dir, { recursive: true });
        const taken = new Set(await readdir(dir));
        const rel = `${ATTACHMENTS_DIR}/${uniqueAttachmentName(filename, taken)}`;
        await writeFile(this.path(rel), bytes);
        return rel;
    }

    async writeCollectionsFile(collections: readonly Collection[]): Promise<void> {
        const payload = {
            collections: collections.map((c, i) => ({ color: c.color, folder: c.id, order: i })),
            version: 1,
        };
        await this.writeText(COLLECTIONS_FILE, `${JSON.stringify(payload, null, 2)}\n`);
    }

    async writeText(relPath: string, text: string): Promise<void> {
        const full = this.path(relPath);
        await mkdir(dirname(full), { recursive: true });
        await writeFile(full, text, 'utf8');
    }

    async writeWorkspaceFile(tagOrder: readonly string[]): Promise<void> {
        await this.writeText(
            WORKSPACE_FILE,
            `${JSON.stringify({ tagOrder, version: 1 }, null, 2)}\n`,
        );
    }
}

/** The directory part of a vault-relative file path — "" at the root. */
export function collectionOf(relPath: string): string {
    const i = relPath.lastIndexOf('/');
    return i === -1 ? '' : relPath.slice(0, i);
}

/** Deterministic colour for a folder with no stored one. */
export function hashColor(name: string): string {
    const palette = ['#8a92b8', '#a88f6e', '#82a896', '#b0807c', '#9e8fb0', '#7f9bb3', '#a89a6e'];
    let h = 0;
    for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
}

/** Directories that are never collections and are never scanned for items. */
export function isIgnoredDir(name: string): boolean {
    return name.startsWith('.') || name === ATTACHMENTS_DIR || name === 'node_modules';
}

export function isIgnoredFile(name: string): boolean {
    return (
        name.startsWith('.') || name.endsWith('~') || name.endsWith('.swp') || name === '4913' // vim writes this to probe whether a directory is writable
    );
}

export function joinPath(collectionId: string | undefined, stem: string): string {
    return collectionId ? `${collectionId}/${stem}.md` : `${stem}.md`;
}

/**
 * Resolves a vault-relative path, refusing anything that escapes the vault.
 *
 * The sidecar takes paths over HTTP, so this is the boundary that stops a
 * crafted request reading or writing outside the folder the user opened.
 */
export function safeJoin(root: string, relPath: string): string {
    const full = resolve(root, relPath);
    const rel = relative(root, full);
    if (rel.startsWith('..') || rel.startsWith(`..${sep}`) || resolve(rel) === rel) {
        throw new Error(`path escapes the vault: ${relPath}`);
    }
    return full;
}

export function stemOf(relPath: string): string {
    const base = relPath.slice(relPath.lastIndexOf('/') + 1);
    return base.endsWith('.md') ? base.slice(0, -3) : base;
}

/**
 * A slugged `name.ext` that no file in `taken` already uses. The extension is
 * kept verbatim (lowercased) because it is what decides the served MIME type.
 */
export function uniqueAttachmentName(filename: string, taken: ReadonlySet<string>): string {
    const base = filename.slice(filename.lastIndexOf('/') + 1);
    const dot = base.lastIndexOf('.');
    const ext =
        dot > 0
            ? base
                  .slice(dot)
                  .toLowerCase()
                  .replace(/[^.a-z0-9]/g, '')
            : '';
    const stem = slugify(dot > 0 ? base.slice(0, dot) : base) || 'attachment';
    if (!taken.has(`${stem}${ext}`)) return `${stem}${ext}`;
    for (let n = 2; n < 1000; n += 1) {
        if (!taken.has(`${stem}-${n}${ext}`)) return `${stem}-${n}${ext}`;
    }
    return `${stem}-${Date.now().toString(36)}${ext}`;
}

export { join, resolve };
