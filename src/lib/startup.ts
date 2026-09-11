// Where Lore appears when the machine starts and while it runs: the login
// item, the Dock tile and the menu-bar icon. Each call is a no-op outside
// Tauri, so the browser dev server behaves as it always has.

/**
 * Whether Lore is registered to start at login, according to the login item
 * itself. Null when there is nothing to ask — the preference is then the only
 * answer available.
 */
export async function launchAtLoginEnabled(): Promise<boolean | null> {
    try {
        const { isEnabled } = await import('@tauri-apps/plugin-autostart');
        return await isEnabled();
    } catch {
        return null;
    }
}

export async function setDockVisible(visible: boolean): Promise<void> {
    await invoke('set_dock_visible', { visible });
}

/** Returns false when the login item could not be written. */
export async function setLaunchAtLogin(on: boolean): Promise<boolean> {
    try {
        const { disable, enable } = await import('@tauri-apps/plugin-autostart');
        await (on ? enable() : disable());
        return true;
    } catch {
        return false;
    }
}

export async function setTrayVisible(visible: boolean): Promise<void> {
    await invoke('set_tray_visible', { visible });
}

async function invoke(command: string, args: Record<string, unknown>): Promise<void> {
    try {
        const { invoke: call } = await import('@tauri-apps/api/core');
        await call(command, args);
    } catch {
        // Outside Tauri, or the command is not granted — nothing to change.
    }
}
