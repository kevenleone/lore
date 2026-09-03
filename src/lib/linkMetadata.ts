// Link previews for the capture window.
//
// The fetch and the parsing live in the data engine now: server-side there is
// no CORS, which is the only reason this ever needed the Tauri HTTP plugin.
// Moving it let the app drop that plugin and its `http://**` grant.

import { request } from '../data/sidecarClient';

export interface LinkMetadata {
    description?: string;
    image?: string;
    title?: string;
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
    try {
        return await request<LinkMetadata>('/link-metadata', {
            body: JSON.stringify({ url }),
            method: 'POST',
        });
    } catch {
        // A preview is a nicety — a failure must never block a capture.
        return {};
    }
}
