// Opening a folder as a vault.
//
// A workspace is just a directory of Markdown. Switching means pointing the
// engine at a different one and rebuilding everything derived from it — which
// includes the Quick Capture window, running in its own webview with its own
// repository instance.

import type { WorkspaceRef } from "../store/persisted";

/** How many recent workspaces to remember. */
const MAX_RECENTS = 8;

/** Broadcast so other windows abandon their repository too. */
export const WORKSPACE_CHANGED = "workspace:changed";

/** The folder's own name, which is what the switcher shows. */
export function workspaceName(path: string): string {
  const parts = path.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] || path;
}

/**
 * Opens the native folder picker. Resolves to null when the user cancels.
 */
export async function pickWorkspaceFolder(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const picked = await open({ directory: true, multiple: false, title: "Open a Lore vault" });
  return typeof picked === "string" ? picked : null;
}

/** Most-recently-used ordering, de-duplicated by path. */
export function rememberWorkspace(
  recents: readonly WorkspaceRef[],
  path: string,
): WorkspaceRef[] {
  const entry: WorkspaceRef = {
    path,
    name: workspaceName(path),
    lastOpenedAt: new Date().toISOString(),
  };
  return [entry, ...recents.filter((r) => r.path !== path)].slice(0, MAX_RECENTS);
}

/**
 * Tells the other windows the vault moved.
 *
 * Without this the capture window keeps its own repository pointed at the old
 * vault, and the next ⌥Space capture is written into the folder the user just
 * navigated away from.
 */
export async function broadcastWorkspaceChange(path: string | null): Promise<void> {
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit(WORKSPACE_CHANGED, { path });
  } catch {
    // Outside Tauri — there is only one window.
  }
}

/** Listens for a workspace change from another window. */
export async function onWorkspaceChanged(
  handler: (path: string | null) => void,
): Promise<() => void> {
  try {
    const { listen } = await import("@tauri-apps/api/event");
    return await listen<{ path: string | null }>(WORKSPACE_CHANGED, (e) =>
      handler(e.payload?.path ?? null),
    );
  } catch {
    return () => {};
  }
}
