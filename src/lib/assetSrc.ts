// Turns whatever an item's `image` holds into something an `<img>` can load.
//
// A captured file is stored as a vault-relative path (`attachments/shot.png`),
// not a URL, because the data engine restarts on a new port every launch — a
// stored URL would be dead the next time the app opened. Everything else (an
// OpenGraph URL, a data URI, the preview's object URL) is already loadable and
// passes straight through.

import { useEffect, useState } from 'react';

import { attachmentUrl } from '../data/sidecarClient';

const ATTACHMENT_PREFIX = 'attachments/';

export function isAttachmentPath(raw: string): boolean {
    return raw.startsWith(ATTACHMENT_PREFIX);
}

/**
 * The resolved `src`, or undefined while a vault path is still being resolved.
 * Anything already loadable is returned on the first render, so a link's
 * OpenGraph image never flickers through an empty state.
 */
export function useAssetSrc(raw: string | undefined): string | undefined {
    const attachment = !!raw && isAttachmentPath(raw);
    const [resolved, setResolved] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!raw || !attachment) {
            setResolved(undefined);
            return;
        }
        let cancelled = false;
        void attachmentUrl(raw).then(
            (url) => {
                if (!cancelled) setResolved(url);
            },
            () => {
                // No engine to serve it (the Vite preview, or a restart in flight).
                if (!cancelled) setResolved(undefined);
            },
        );
        return () => {
            cancelled = true;
        };
    }, [raw, attachment]);

    if (!raw) return undefined;
    return attachment ? resolved : raw;
}
