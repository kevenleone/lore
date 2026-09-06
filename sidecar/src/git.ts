// Optional Git tracking for a vault, as offered by `Lore Onboarding.dc.html`.
//
// Lore only ever runs `git init`. It never adds a remote, never commits on the
// user's behalf from here, and never touches a repository that already exists —
// the vault is the user's folder and its history is theirs.

import { access, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Written at the vault root, next to the one `ensureScaffold` writes inside
 * `.lore/`. That one keeps derived files out of commits when `.lore/` is itself
 * tracked; this one is what a repository rooted at the vault needs.
 */
const GITIGNORE = `# Lore's derived index and caches — rebuilt on next open.
.lore/index.db
.lore/index.db-wal
.lore/index.db-shm
.lore/cache/
.lore/trash/
.DS_Store
`;

export interface GitStatus {
    /** True once `<root>/.git` exists, whoever created it. */
    tracked: boolean;
}

/** Whether the folder is already a Git repository. Never throws. */
export async function gitStatus(root: string): Promise<GitStatus> {
    try {
        await access(join(root, '.git'));
        return { tracked: true };
    } catch {
        return { tracked: false };
    }
}

/**
 * Turns the folder into a repository, unless it already is one.
 *
 * Answering `tracked: true` for a folder Lore did not initialise is the point:
 * the caller asked for the vault to be under Git, and it is.
 */
export async function initGit(root: string): Promise<GitStatus> {
    if (await gitStatus(root).then((s) => s.tracked)) return { tracked: true };

    await mkdir(root, { recursive: true });
    const init = Bun.spawn(['git', 'init'], { cwd: root, stderr: 'pipe', stdout: 'pipe' });
    if ((await init.exited) !== 0) {
        throw new Error((await new Response(init.stderr).text()).trim() || 'git init failed');
    }

    await writeGitignore(root);
    return { tracked: true };
}

/** Leaves an existing `.gitignore` alone — it is the user's file, not Lore's. */
async function writeGitignore(root: string): Promise<void> {
    const path = join(root, '.gitignore');
    if (await Bun.file(path).exists()) return;
    await Bun.write(path, GITIGNORE);
}
