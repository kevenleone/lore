import type { MouseEvent } from 'react';

import type { Item } from '../../store/types';

/**
 * The list pane's top row, shared by the header and the selection bar that
 * replaces it. The height is pinned so swapping one for the other does not
 * move the list underneath — the header's own controls make it taller than its
 * text, which the bar has no way to work out for itself.
 */
export const LIST_HEADER_ROW =
    'flex min-h-[53px] flex-none items-center border-b border-border px-4 py-[11px]';

/** What ListPane hands each of the three item layouts. */
export interface SurfaceProps {
    items: Item[];
    onContextMenu: (event: MouseEvent, id: string) => void;
}
