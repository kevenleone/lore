// Opens (toggles) the Quick Capture window. The real global-shortcut + window
// wiring lands in Phase 4; until then this is a safe no-op outside Tauri.

export async function openCaptureWindow(): Promise<void> {
    try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('toggle_capture');
    } catch {
        // Command not registered yet / running outside Tauri.
    }
}
