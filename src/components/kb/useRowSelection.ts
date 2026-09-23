// Ticking rows, shared by the three library layouts.
//
// A plain click still means "show me this one". The set is built with the
// modifiers a file list has always used — ⌘ (or Ctrl) for one more, ⇧ for
// everything between — plus the checkbox, which is the same thing for people
// who do not know the modifiers.

import type { MouseEvent } from 'react';

import type { Item } from '../../store/types';

import { useStore } from '../../store/useStore';

export interface RowSelection {
    /** Whether the list is in selection mode, which is what shows the boxes. */
    active: boolean;
    checkedIds: string[];
    isChecked: (id: string) => boolean;
    /** Click handler for a row; falls back to opening it when unmodified. */
    onRowClick: (event: MouseEvent, id: string) => void;
    /** Click handler for a row's checkbox. */
    onToggle: (event: MouseEvent, id: string) => void;
}

export function useRowSelection(items: Item[]): RowSelection {
    const checkedIds = useStore((state) => state.checkedIds);
    const selecting = useStore((state) => state.selecting);
    const toggleChecked = useStore((state) => state.toggleChecked);
    const checkRange = useStore((state) => state.checkRange);
    const selectItem = useStore((state) => state.selectItem);

    const ordered = items.map((item) => item.id);

    return {
        active: selecting,
        checkedIds,
        isChecked: (id) => checkedIds.includes(id),
        onRowClick: (event, id) => {
            if (event.shiftKey) {
                // Otherwise the range comes with the browser's own text
                // selection draped over it.
                event.preventDefault();
                checkRange(id, ordered);

                return;
            }

            // In selection mode the whole row is the checkbox; opening an item
            // is not what the click is for any more.
            if (selecting || event.metaKey || event.ctrlKey) {
                toggleChecked(id);

                return;
            }

            selectItem(id);
        },
        onToggle: (event, id) => {
            // The checkbox sits inside the row, and the row opens things.
            event.stopPropagation();
            toggleChecked(id);
        },
    };
}
