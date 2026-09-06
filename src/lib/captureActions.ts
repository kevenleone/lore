// Shared logic for the Quick Capture window: persist a new item through the
// repository, notify the main window to refresh, and hide the capture window.

import type { NewItem } from '../data/repository';

import { MockAiProvider } from '../ai/mockAiProvider';
import { getRepository } from '../data';

export const captureAi = new MockAiProvider();

/**
 * The collection the last capture was filed into.
 *
 * Its own key rather than a field in `lore.prefs.v1`: that blob is written
 * wholesale by the main window's store, and the floating capture window — a
 * separate document on the same origin, with no store of its own — would clobber
 * whatever the main window had in memory the moment it saved.
 */
const LAST_COLLECTION_KEY = 'lore.capture.lastCollection';

export async function hideCapture(): Promise<void> {
    try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('hide_capture');
    } catch {
        // Outside Tauri — no window to hide.
    }
}

/** Best-effort hostname for a URL (for link titles/domains). */
export function hostOf(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

export function lastCollectionId(): null | string {
    try {
        return localStorage.getItem(LAST_COLLECTION_KEY);
    } catch {
        return null;
    }
}

export function rememberCollectionId(id: string | undefined): void {
    if (!id) return;
    try {
        localStorage.setItem(LAST_COLLECTION_KEY, id);
    } catch {
        // Private mode or a blocked store — the default just falls back a step.
    }
}

export async function saveCapture(input: NewItem): Promise<void> {
    await getRepository().createItem(input);
    try {
        const { emit } = await import('@tauri-apps/api/event');
        await emit('item:created');
    } catch {
        // Outside Tauri — nothing to notify.
    }
    await hideCapture();
}
