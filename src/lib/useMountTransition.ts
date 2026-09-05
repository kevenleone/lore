// Keeps an element in the tree long enough to animate its way out.
//
// A panel rendered as `{open && <Panel/>}` cannot animate away: it is gone from
// the DOM the moment it closes. This holds it for the length of the exit and
// reports which of the two runs it is in, so the caller can pick the matching
// keyframes.
//
// It deliberately does not drive the *enter* by flipping a property one frame
// after mount: that needs `requestAnimationFrame`, which never fires while the
// window is hidden or occluded, and the panel would be stranded in its opening
// position. An enter keyframe leaves the resting style alone, so a run that
// never happens degrades to "already open".

import { useEffect, useState } from 'react';

export interface MountTransition {
    /** True while the element must stay in the tree, exit run included. */
    mounted: boolean;
    /** True on the way in and at rest, false while the exit run plays. */
    open: boolean;
}

/**
 * @param open       whether the element should be showing
 * @param durationMs how long the exit keyframes take; unmounting any sooner
 *                   would cut the animation off
 * @param immediate  drop it the moment it closes — Reduce Motion, in practice
 */
export function useMountTransition(
    open: boolean,
    durationMs: number,
    immediate = false,
): MountTransition {
    const [mounted, setMounted] = useState(open);

    useEffect(() => {
        if (open) {
            setMounted(true);
            return;
        }
        if (immediate) {
            setMounted(false);
            return;
        }
        const timer = setTimeout(() => setMounted(false), durationMs);
        return () => clearTimeout(timer);
    }, [durationMs, immediate, open]);

    return { mounted, open };
}
