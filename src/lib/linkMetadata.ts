// Link previews for the capture window.
//
// The fetch and the parsing live in the data engine now: server-side there is
// no CORS, which is the only reason this ever needed the Tauri HTTP plugin.
// Moving it let the app drop that plugin and its `http://**` grant.

import { request } from "../data/sidecarClient";

export interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  try {
    return await request<LinkMetadata>("/link-metadata", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  } catch {
    // A preview is a nicety — a failure must never block a capture.
    return {};
  }
}
