// A row's tick box, drawn only while the list is in selection mode.
//
// It reserves no space outside that mode — a library nobody is triaging keeps
// the flush left edge it always had. Entering the mode shifts the rows once,
// which is what a mode is allowed to do; revealing the box on hover instead
// would have had to hold the gutter open permanently to avoid jitter.

import type { MouseEvent } from 'react';

import { cn } from '../../lib/cn';

export function RowCheckbox({
    checked,
    label,
    onToggle,
}: {
    checked: boolean;
    label: string;
    onToggle: (event: MouseEvent) => void;
}) {
    return (
        <button
            aria-checked={checked}
            aria-label={`Select ${label}`}
            className={cn(
                'flex h-[15px] w-[15px] flex-none items-center justify-center rounded-sm border-[1.5px] bg-transparent p-0',
                checked ? 'border-accent bg-accent' : 'border-border',
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
