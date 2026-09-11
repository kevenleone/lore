// The cursor-anchored menu the item surfaces open on right-click. It portals to
// the body because a card is `overflow-hidden`, and the list and table both
// scroll — anchoring inside any of them would clip or drag the menu.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../lib/cn';

/** Kept clear of the viewport edges when the menu is flipped back on screen. */
const EDGE_MARGIN = 8;

export interface ContextMenuTarget {
    id: string;
    x: number;
    y: number;
}

export function ContextMenu({
    children,
    onClose,
    x,
    y,
}: {
    children: React.ReactNode;
    onClose: () => void;
    x: number;
    y: number;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [placement, setPlacement] = useState({ left: x, top: y });

    // Measured after the first paint, so the menu can flip back on screen near
    // a right or bottom edge rather than being clipped by the window.
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const { height, width } = el.getBoundingClientRect();
        const maxLeft = window.innerWidth - width - EDGE_MARGIN;
        const maxTop = window.innerHeight - height - EDGE_MARGIN;
        setPlacement({
            left: Math.max(EDGE_MARGIN, Math.min(x, maxLeft)),
            top: Math.max(EDGE_MARGIN, Math.min(y, maxTop)),
        });
    }, [x, y]);

    useEffect(() => {
        const onPointer = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) onClose();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('mousedown', onPointer);
        window.addEventListener('keydown', onKey);
        // Capture, because the scroll happens on a pane rather than the window.
        window.addEventListener('scroll', onClose, true);
        return () => {
            window.removeEventListener('mousedown', onPointer);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onClose, true);
        };
    }, [onClose]);

    return createPortal(
        <div
            className="fixed z-[70] min-w-[196px] rounded-9 border border-border bg-surface p-[5px] shadow-float"
            ref={ref}
            // A measured position at the pointer — no class can carry it.
            style={placement}
        >
            {children}
        </div>,
        document.body,
    );
}

export function ContextMenuItem({
    children,
    danger,
    onClick,
}: {
    children: React.ReactNode;
    danger?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            className={cn(
                'flex w-full items-center gap-[8px] rounded-7 border-none bg-transparent px-2 py-[6px] text-left font-[inherit] text-body hover:bg-hover',
                danger ? 'text-danger' : 'text-text2',
            )}
            onClick={onClick}
            role="menuitem"
            type="button"
        >
            {children}
        </button>
    );
}

export function ContextMenuSeparator() {
    return <div className="my-[4px] h-px bg-border" />;
}

export function useContextMenu() {
    const [target, setTarget] = useState<ContextMenuTarget | null>(null);

    const openAt = useCallback((event: React.MouseEvent, id: string) => {
        event.preventDefault();
        event.stopPropagation();
        setTarget({ id, x: event.clientX, y: event.clientY });
    }, []);

    const close = useCallback(() => setTarget(null), []);

    return { close, openAt, target };
}
