import { invoke } from '@tauri-apps/api/core';

export interface CliStatus {
    installed: boolean;
    /** `lore`, or `lore-dev` / `lore-agent` in those builds. */
    name: string;
}

/** `null` where the host has no command to install: a browser, or not macOS. */
export async function cliStatus(): Promise<CliStatus | null> {
    try {
        return await invoke<CliStatus>('cli_status');
    } catch {
        return null;
    }
}

/**
 * Resolves with what is on disk afterwards, which is unchanged when the
 * password prompt was dismissed. Rejects with a sentence to show.
 */
export function setCliInstalled(installed: boolean): Promise<CliStatus> {
    return invoke<CliStatus>('set_cli_installed', { installed });
}
