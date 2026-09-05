// Shared building blocks for the Properties panel's sections: the section
// header, the label/value row, and the small popover the editable values open.
// Kept here rather than in `common/` because the sizing is specific to a 300px
// column and would look wrong anywhere else.

import { useEffect, useRef, useState } from 'react';

import { hoverable } from '../../../theme/util.css';
import { ChevronDown } from '../../common/glyphs';

const AC = 'var(--ac, #5b5bd6)';

/** The 86px label column every row in the panel shares. */
export const LABEL_WIDTH = 78;

export function Empty({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12.5, padding: '3px 0' }}>
            {children}
        </div>
    );
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
            className={hoverable}
            onClick={onClick}
            style={{
                alignItems: 'center',
                borderRadius: 7,
                color: selected ? AC : 'var(--text2, #6b6b76)',
                cursor: 'pointer',
                display: 'flex',
                fontSize: 12.5,
                fontWeight: selected ? 590 : 400,
                gap: 7,
                padding: '6px 8px',
            }}
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
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                aria-expanded={open}
                className={hoverable}
                onClick={() => setOpen((o) => !o)}
                style={{
                    alignItems: 'center',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 7,
                    color: 'var(--text, #1a1a1f)',
                    cursor: 'pointer',
                    display: 'flex',
                    font: 'inherit',
                    fontSize: 12.5,
                    gap: 5,
                    maxWidth: '100%',
                    padding: '3px 6px',
                    textAlign: 'left',
                }}
                type="button"
            >
                {trigger}
                <ChevronDown size={11} style={{ color: 'var(--faint, #a8a8b0)', flex: 'none' }} />
            </button>
            {open && (
                <div
                    style={{
                        background: 'var(--surface, #fff)',
                        border: '1px solid var(--border, #ececef)',
                        borderRadius: 10,
                        boxShadow: '0 12px 30px -10px rgba(24,24,48,.3)',
                        maxHeight: 260,
                        overflowY: 'auto',
                        padding: 5,
                        position: 'absolute',
                        right: 0,
                        top: 28,
                        width,
                        zIndex: 25,
                    }}
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
        <span
            style={{
                color: empty ? 'var(--faint, #a8a8b0)' : 'var(--text2, #6b6b76)',
                display: 'block',
                fontSize: 12.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
            }}
        >
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
        <div
            style={{
                alignItems: 'center',
                display: 'flex',
                gap: 8,
                minHeight: 30,
                padding: '2px 0',
            }}
        >
            <span
                style={{
                    alignItems: 'center',
                    color: 'var(--text3, #9a9aa5)',
                    display: 'flex',
                    flex: 'none',
                    fontSize: 12.5,
                    gap: 7,
                    width: LABEL_WIDTH,
                }}
            >
                {icon}
                {label}
            </span>
            <span
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    flex: 1,
                    justifyContent: 'flex-end',
                    // No `overflow` here: the pickers hang their popover off this
                    // column, and clipping it would hide the menu entirely. Values
                    // that can run long clip themselves instead.
                    minWidth: 0,
                }}
            >
                {children}
            </span>
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
        <section
            style={{
                borderTop: '1px solid var(--border, #ececef)',
                padding: '16px 16px 18px',
            }}
        >
            <div
                style={{
                    alignItems: 'center',
                    color: 'var(--faint, #a8a8b0)',
                    display: 'flex',
                    fontSize: 11,
                    fontWeight: 680,
                    gap: 7,
                    letterSpacing: '.06em',
                    marginBottom: 10,
                    textTransform: 'uppercase',
                }}
            >
                {icon}
                {title}
            </div>
            {children}
        </section>
    );
}
