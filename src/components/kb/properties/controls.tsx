// Shared building blocks for the Properties panel's sections: the section
// header, the label/value row, and the small popover the editable values open.
// Kept here rather than in `common/` because the sizing is specific to a 300px
// column and would look wrong anywhere else.

import { useEffect, useRef, useState } from 'react';

import { cn } from '../../../lib/cn';
import { ChevronDown } from '../../common/glyphs';

/** The 86px label column every row in the panel shares. */
export const LABEL_WIDTH = 78;

export function Empty({ children }: { children: React.ReactNode }) {
    return <div className="py-[3px] text-body text-text3">{children}</div>;
}

export function MenuItem({
    children,
    onClick,
    selected,
}: {
    children: React.ReactNode;
    onClick: () => void;
    selected: boolean;
}) {
    return (
        <div
            className={cn(
                'flex cursor-pointer items-center gap-[7px] rounded-7 px-2 py-[6px] text-body hover:bg-hover',
                selected ? 'font-[590] text-accent' : 'font-normal text-text2',
            )}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

/**
 * A value that opens a menu. The trigger reads as plain text until hovered, so
 * a row of them scans as a property list rather than a row of buttons.
 */
export function Picker({
    children,
    trigger,
    width = 190,
}: {
    children: (close: () => void) => React.ReactNode;
    trigger: React.ReactNode;
    width?: number;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        return () => window.removeEventListener('mousedown', onDown);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <button
                aria-expanded={open}
                className="flex max-w-full cursor-pointer items-center gap-[5px] rounded-7 border-none bg-transparent px-[6px] py-[3px] text-left font-[inherit] text-body text-text hover:bg-hover"
                onClick={() => setOpen((o) => !o)}
                type="button"
            >
                {trigger}
                <ChevronDown className="flex-none text-faint" size={11} />
            </button>
            {open && (
                <div
                    className="absolute top-7 right-0 z-25 max-h-[260px] overflow-y-auto rounded-10 border border-border bg-surface p-[5px] shadow-[0_12px_30px_-10px_rgba(24,24,48,.3)]"
                    style={{ width }}
                >
                    {children(() => setOpen(false))}
                </div>
            )}
        </div>
    );
}

/** A read-only value, or the em dash the reference uses for an empty one. */
export function ReadOnly({ children }: { children?: false | null | number | string }) {
    const empty =
        children === null || children === undefined || children === '' || children === false;
    return (
        <span className={cn('block truncate text-body', empty ? 'text-faint' : 'text-text2')}>
            {empty ? '—' : children}
        </span>
    );
}

/** One `label · value` line. The value is right-aligned, as in the reference. */
export function Row({
    children,
    icon,
    label,
}: {
    children: React.ReactNode;
    icon?: React.ReactNode;
    label: string;
}) {
    return (
        <div className="flex min-h-[30px] items-center gap-2 py-[2px]">
            <span
                className="flex flex-none items-center gap-[7px] text-body text-text3"
                // Shared with the sections that lay values out against it.
                style={{ width: LABEL_WIDTH }}
            >
                {icon}
                {label}
            </span>
            {/*
             * No `overflow` here: the pickers hang their popover off this column,
             * and clipping it would hide the menu entirely. Values that can run
             * long clip themselves instead.
             */}
            <span className="flex min-w-0 flex-1 items-center justify-end">{children}</span>
        </div>
    );
}

export function Section({
    children,
    icon,
    title,
}: {
    children: React.ReactNode;
    icon?: React.ReactNode;
    title: string;
}) {
    return (
        <section className="border-t border-border px-4 pt-4 pb-[18px]">
            <div className="mb-[10px] flex items-center gap-[7px] text-caption font-[680] tracking-[.06em] text-faint uppercase">
                {icon}
                {title}
            </div>
            {children}
        </section>
    );
}
