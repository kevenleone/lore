// Showing a vault folder in Finder.

import { defaultVaultPath } from '../data/vaultRepository';

/**
 * Opens the folder in the OS file manager. `null` means the default vault, the
 * one the host keeps beside its own data — the same fallback the repository
 * makes, so "Reveal" lands on the folder Lore is actually reading.
 *
 * Returns false outside Tauri, or when the platform refuses.
 */
export async function revealPath(path: null | string): Promise<boolean> {
    try {
        const { revealItemInDir } = await import('@tauri-apps/plugin-opener');
        await revealItemInDir(path ?? (await defaultVaultPath()));
        return true;
    } catch {
        return false;
    }
}
