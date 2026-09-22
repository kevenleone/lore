// An `<img>` whose `src` never loads: a dead OpenGraph URL, an attachment moved
// out from under the vault, a host that answers 403 to a request without a
// referer. The browser's own answer is a broken-image glyph, which is what the
// callers here exist to replace.

import { useState } from 'react';

export interface ImageFallback {
    /** True once this exact `src` has failed to load. */
    broken: boolean;
    onError: () => void;
}

/**
 * Keyed by `src` rather than a bare boolean: the same component instance is
 * handed a different item as a list re-sorts, and a stale `true` would hide an
 * image that loads perfectly well.
 */
export function useImageFallback(src: string | undefined): ImageFallback {
    const [failedSrc, setFailedSrc] = useState<null | string>(null);

    return {
        broken: !!src && failedSrc === src,
        onError: () => setFailedSrc(src ?? null),
    };
}
