// A row's tick box, and the gutter it opens.
//
// Always rendered, and collapsed to nothing outside selection mode: a negative
// margin cancels the row's own gap, so a library nobody is triaging keeps the
// flush left edge it always had. Entering the mode widens the slot rather than
// inserting an element, which is what makes the shift something the eye can
// follow rather than a jump.

import type { MouseEvent } from 'react';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';

export function RowCheckbox({
    checked,
    closedMargin,
    label,
    onToggle,
    shown,
}: {
    checked: boolean;
    /** Cancels the row's own flex gap while the slot is closed. */
    closedMargin: string;
    label: string;
    onToggle: (event: MouseEvent) => void;
    /** True in selection mode, which is what opens the slot. */
    shown: boolean;
}) {
    const reduceMotion = useStore((state) => state.prefs.switches.motion);

    return (
        <span
            className={cn(
                'flex flex-none overflow-hidden',
                !reduceMotion && 'transition-[width,margin,opacity] duration-200 ease-out',
                shown ? 'w-[15px] opacity-100' : cn('w-0 opacity-0', closedMargin),
            )}
        >
            <button
                aria-checked={checked}
                aria-label={`Select ${label}`}
                className={cn(
                    'flex h-[15px] w-[15px] flex-none items-center justify-center rounded-sm border-[1.5px] bg-transparent p-0',
                    checked ? 'border-accent bg-accent' : 'border-border',
                )}
                onClick={onToggle}
                role="checkbox"
                // Out of the tab order while the slot is shut, or every row
                // holds a control nobody can see.
                tabIndex={shown ? 0 : -1}
                type="button"
            >
                {checked && (
                    <svg fill="none" height="10" viewBox="0 0 24 24" width="10">
                        <polyline
                            points="20 6 9 17 4 12"
                            stroke="#fff"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3.2"
                        />
                    </svg>
                )}
            </button>
        </span>
    );
}
