// Opening a folder as a vault.
//
// A workspace is just a directory of Markdown. Switching means pointing the
// engine at a different one and rebuilding everything derived from it — which
// includes the Quick Capture window, running in its own webview with its own
// repository instance.

import type { WorkspaceRef } from '../store/persisted';

/** How many recent workspaces to remember. */
const MAX_RECENTS = 8;

/** Sent by the host; the id is `open_paths.rs`'s. */
const WORKSPACE_REQUESTED = 'workspace:open';

/** Broadcast so other windows abandon their repository too. */
export const WORKSPACE_CHANGED = 'workspace:changed';

/**
 * Tells the other windows the vault moved.
 *
 * Without this the capture window keeps its own repository pointed at the old
 * vault, and the next ⌥Space capture is written into the folder the user just
 * navigated away from.
 */
export async function broadcastWorkspaceChange(path: null | string): Promise<void> {
    try {
        const { emit } = await import('@tauri-apps/api/event');

        await emit(WORKSPACE_CHANGED, { path });
    } catch {
        // Outside Tauri — there is only one window.
    }
}

/**
 * The user's home directory, for shortening paths to `~/…`. Null outside Tauri,
 * where there is no home to resolve against.
 */
export async function homeDirectory(): Promise<null | string> {
    try {
        const { homeDir } = await import('@tauri-apps/api/path');

        return (await homeDir()).replace(/\/+$/, '');
    } catch {
        return null;
    }
}

/** Listens for a workspace change from another window. */
export async function onWorkspaceChanged(
    handler: (path: null | string) => void,
): Promise<() => void> {
    try {
        const { listen } = await import('@tauri-apps/api/event');

        return await listen<{ path: null | string }>(WORKSPACE_CHANGED, (event) =>
            handler(event.payload?.path ?? null),
        );
    } catch {
        return () => {};
    }
}

/**
 * Listens for a folder handed to Lore from outside — `lore .`, or a folder
 * dropped on the Dock icon.
 */
export async function onWorkspaceRequested(handler: (path: string) => void): Promise<() => void> {
    try {
        const { listen } = await import('@tauri-apps/api/event');

        return await listen<string>(WORKSPACE_REQUESTED, (event) => handler(event.payload));
    } catch {
        return () => {};
    }
}

/** Opens the native folder picker for an export destination. */
export async function pickExportFolder(): Promise<null | string> {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const picked = await open({
        directory: true,
        multiple: false,
        title: 'Export the vault into…',
    });

    return typeof picked === 'string' ? picked : null;
}

/**
 * Opens the native folder picker. Resolves to null when the user cancels.
 */
export async function pickWorkspaceFolder(): Promise<null | string> {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const picked = await open({ directory: true, multiple: false, title: 'Open a Lore vault' });

    return typeof picked === 'string' ? picked : null;
}

/** Most-recently-used ordering, de-duplicated by path. */
export function rememberWorkspace(recents: readonly WorkspaceRef[], path: string): WorkspaceRef[] {
    const entry: WorkspaceRef = {
        lastOpenedAt: new Date().toISOString(),
        name: workspaceName(path),
        path,
    };

    return [entry, ...recents.filter((recent) => recent.path !== path)].slice(0, MAX_RECENTS);
}

/**
 * Where a brand-new vault is offered, per `Lore Onboarding.dc.html`:
 * `~/Documents/Lore Vault`. Null outside Tauri — the browser preview has no
 * filesystem to put one in.
 */
export async function suggestedVaultPath(): Promise<null | string> {
    try {
        const { documentDir, join } = await import('@tauri-apps/api/path');

        return await join(await documentDir(), 'Lore Vault');
    } catch {
        return null;
    }
}

/**
 * The folder Lore was launched with, once. The host holds it because a cold
 * start asks before this window is listening; taking it clears it, so a reload
 * does not switch vaults a second time.
 */
export async function takeRequestedWorkspace(): Promise<null | string> {
    try {
        const { invoke } = await import('@tauri-apps/api/core');

        return (await invoke<null | string>('take_pending_workspace')) ?? null;
    } catch {
        return null;
    }
}

/** `/Users/x/Documents/Lore Vault` → `~/Documents/Lore Vault`. */
export function tildePath(path: string, home: null | string): string {
    if (!home || !path.startsWith(`${home}/`)) {
        return path;
    }

    return `~${path.slice(home.length)}`;
}

/** The folder's own name, which is what the switcher shows. */
export function workspaceName(path: string): string {
    const parts = path.replace(/\/+$/, '').split('/');

    return parts[parts.length - 1] || path;
}
