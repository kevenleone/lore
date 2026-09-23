// A row's tick box. Drawn while the list is in selection mode, and otherwise
// only on hover or focus — so a library nobody is triaging keeps the look it
// had. It holds its space either way: a control that appears on hover must not
// shove the row sideways.

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
    /** True in selection mode; otherwise the box waits for a hover. */
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
