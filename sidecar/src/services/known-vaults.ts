import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export interface KnownVaults {
    /** The vault Lore opened last, which is the one it has open now if it is running. */
    current: null | string;
    recent: RecentVault[];
}

export interface RecentVault {
    openedAt: string;
    path: string;
}

const MAX_RECENT = 10;

export async function readKnownVaults(file: string): Promise<KnownVaults> {
    try {
        const saved = JSON.parse(await readFile(file, 'utf8')) as Partial<KnownVaults>;
        const recent = Array.isArray(saved.recent)
            ? saved.recent.filter(
                  (entry): entry is RecentVault =>
                      typeof entry?.path === 'string' && typeof entry.openedAt === 'string',
              )
            : [];

        return { current: typeof saved.current === 'string' ? saved.current : null, recent };
    } catch {
        return { current: null, recent: [] };
    }
}

export async function recordVault(file: string, path: string, now = new Date()): Promise<void> {
    const { recent } = await readKnownVaults(file);
    const known: KnownVaults = {
        current: path,
        recent: [
            { openedAt: now.toISOString(), path },
            ...recent.filter((entry) => entry.path !== path),
        ].slice(0, MAX_RECENT),
    };
    // The CLI may read this while the app writes it.
    const partial = `${file}.${process.pid}.tmp`;

    await mkdir(dirname(file), { recursive: true });
    await writeFile(partial, `${JSON.stringify(known, null, 4)}\n`);
    await rename(partial, file);
}
