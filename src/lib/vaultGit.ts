// The optional Git tracking offered by `Lore Onboarding.dc.html`.
//
// These talk to the data engine directly rather than through KnowledgeRepository
// because they act on a folder path, not on the open vault: onboarding asks
// about folders before any of them has been opened.
//
// Outside Tauri there is no engine, so both answer as if the folder were plain.
// The browser preview shows the picker, not a working vault.

import { request } from '../data/sidecarClient';

interface GitStatus {
    tracked: boolean;
}

/** Runs `git init` in the folder, unless it is already a repository. */
export async function initVaultGit(path: string): Promise<boolean> {
    if (!hasEngine()) return false;
    const status = await request<GitStatus>('/git/init', {
        body: JSON.stringify({ path }),
        method: 'POST',
    });
    return status.tracked;
}

/** Whether the folder is already under Git. Never throws — this only labels a row. */
export async function isVaultTracked(path: string): Promise<boolean> {
    if (!hasEngine()) return false;
    try {
        const status = await request<GitStatus>('/git/status', {
            body: JSON.stringify({ path }),
            method: 'POST',
        });
        return status.tracked;
    } catch {
        return false;
    }
}

function hasEngine(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
