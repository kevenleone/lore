// Shared logic for the Quick Capture window: persist a new item through the
// repository, notify the main window to refresh, and hide the capture window.

import { getRepository } from "../data";
import type { NewItem } from "../data/repository";
import { MockAiProvider } from "../ai/mockAiProvider";

export const captureAi = new MockAiProvider();

export async function saveCapture(input: NewItem): Promise<void> {
  await getRepository().createItem(input);
  try {
    const { emit } = await import("@tauri-apps/api/event");
    await emit("item:created");
  } catch {
    // Outside Tauri — nothing to notify.
  }
  await hideCapture();
}

export async function hideCapture(): Promise<void> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("hide_capture");
  } catch {
    // Outside Tauri — no window to hide.
  }
}

/** Best-effort hostname for a URL (for link titles/domains). */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
