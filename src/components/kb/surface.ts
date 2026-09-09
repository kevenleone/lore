import type { MouseEvent } from 'react';

import type { Item } from '../../store/types';

/** What ListPane hands each of the three item layouts. */
export interface SurfaceProps {
    items: Item[];
    onContextMenu: (event: MouseEvent, id: string) => void;
}
