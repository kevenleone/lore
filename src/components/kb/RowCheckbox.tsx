// A row's tick box. Hidden until the row is hovered or something is ticked, so
// an untouched library keeps the layout it had — but it holds its space either
// way, because a control that appears on hover must not shove the row sideways.

import type { MouseEvent } from 'react';

import { cn } from '../../lib/cn';

export function RowCheckbox({
    checked,
    label,
    onToggle,
    shown,
}: {
    checked: boolean;
    label: string;
    onToggle: (event: MouseEvent) => void;
    /** True once anything is ticked; otherwise it waits for a hover. */
    shown: boolean;
}) {
    return (
        <button
            aria-checked={checked}
            aria-label={`Select ${label}`}
            className={cn(
                'flex h-[15px] w-[15px] flex-none items-center justify-center rounded-sm border-[1.5px] bg-transparent p-0',
                checked ? 'border-accent bg-accent' : 'border-border',
                // Focus reveals it too: on hover alone it cannot be reached by
                // keyboard at all.
                shown || checked
                    ? 'opacity-100'
                    : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
            )}
            onClick={onToggle}
            role="checkbox"
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
    );
}
