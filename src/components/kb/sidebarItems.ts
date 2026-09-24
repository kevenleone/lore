// Which sidebar rows a user can put away.
//
// The library views are not on this list on purpose. Everything, Inbox, Notes,
// Links and Files are how you reach your own notes at all, and a sidebar you can
// hide those from is one you can lock yourself out of. What is optional here is
// the *surfaces* — whole ways of looking at a vault that plenty of people will
// never want, and that would otherwise be permanent noise for them.

import type { IconName } from '../../store/types';

export interface OptionalSurface {
    icon: IconName;
    id: OptionalSurfaceId;
    label: string;
    /** Shown under the name in the editor, so a choice is not made blind. */
    summary: string;
}

export type OptionalSurfaceId = 'calendar' | 'graph' | 'tasks';

export const OPTIONAL_SURFACES: OptionalSurface[] = [
    {
        icon: 'task',
        id: 'tasks',
        label: 'Tasks',
        summary: 'Summary, Upcoming and the boards',
    },
    {
        icon: 'calendar',
        id: 'calendar',
        label: 'Calendar',
        summary: 'Your items on a month grid',
    },
    {
        icon: 'layers',
        id: 'graph',
        label: 'Graph',
        summary: 'The vault drawn as its links',
    },
];

export function hiddenSurfaces(hidden: readonly string[]): OptionalSurface[] {
    return OPTIONAL_SURFACES.filter((surface) => hidden.includes(surface.id));
}

/**
 * Everything is shown until it is put away, so a new surface arrives visible
 * rather than hidden behind a row nobody has opened. The preference stores what
 * to hide for the same reason: an empty list means "show me everything", which
 * is what a vault with no preference at all should do.
 */
export function isSurfaceVisible(id: OptionalSurfaceId, hidden: readonly string[]): boolean {
    return !hidden.includes(id);
}

/** Adds or removes one, leaving unknown entries from another version alone. */
export function toggleSurface(id: OptionalSurfaceId, hidden: readonly string[]): string[] {
    return hidden.includes(id) ? hidden.filter((entry) => entry !== id) : [...hidden, id];
}
