// The ··· on a column header: rename, move, mark as the completing column, and
// delete. Everything a board's shape can be changed by lives here, so the
// column header itself stays a name and a count.

import { useEffect, useRef, useState } from 'react';

import type { BoardColumnConfig } from '../../store/types';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { Check, Trash } from '../common/glyphs';

const ITEM =
    'flex w-full items-center gap-2 rounded-7 border-none bg-transparent px-[9px] py-[6px] text-left font-[inherit] text-body text-text2 hover:bg-hover disabled:opacity-40';

export function BoardColumnMenu({
    column,
    first,
    last,
    only,
    onRename,
}: {
    column: BoardColumnConfig;
    first: boolean;
    last: boolean;
    /** A board always keeps one column, so the last one cannot be deleted. */
    only: boolean;
    /** Hands editing back to the header, which owns the rename field. */
    onRename: () => void;
}) {
    const removeBoardColumn = useStore((s) => s.removeBoardColumn);
    const reorderBoardColumn = useStore((s) => s.reorderBoardColumn);
    const setBoardDoneColumn = useStore((s) => s.setBoardDoneColumn);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const run = (action: () => Promise<void> | void) => {
        setOpen(false);
        void action();
    };

    return (
        <div className="relative" ref={ref}>
            <button
                aria-expanded={open}
                aria-label={`${column.name} column options`}
                className="flex h-[22px] w-[22px] items-center justify-center rounded-7 border-none bg-transparent p-0 font-[inherit] text-faint hover:bg-hover hover:text-text2"
                onClick={() => setOpen((o) => !o)}
                type="button"
            >
                ···
            </button>
            {open && (
                <div className="absolute top-[26px] right-0 z-25 w-[216px] rounded-10 border border-border bg-surface p-[5px] shadow-float">
                    <button
                        className={ITEM}
                        onClick={() => {
                            setOpen(false);
                            onRename();
                        }}
                        type="button"
                    >
                        Rename
                    </button>
                    <button
                        className={ITEM}
                        disabled={first}
                        onClick={() => run(() => reorderBoardColumn(column.id, -1))}
                        type="button"
                    >
                        Move left
                    </button>
                    <button
                        className={ITEM}
                        disabled={last}
                        onClick={() => run(() => reorderBoardColumn(column.id, 1))}
                        type="button"
                    >
                        Move right
                    </button>
                    <div className="my-[4px] h-px bg-border" />
                    <button
                        aria-pressed={!!column.done}
                        className={cn(ITEM, column.done && 'text-accent')}
                        onClick={() => run(() => setBoardDoneColumn(column.id))}
                        type="button"
                    >
                        <span className="flex w-[13px] flex-none justify-center">
                            {column.done && <Check size={11} sw={3} />}
                        </span>
                        Completes the task
                    </button>
                    <div className="my-[4px] h-px bg-border" />
                    <button
                        className={cn(ITEM, 'text-danger')}
                        disabled={only}
                        onClick={() => run(() => removeBoardColumn(column.id))}
                        title={only ? 'A board keeps at least one column' : undefined}
                        type="button"
                    >
                        <Trash size={13} />
                        Delete column
                    </button>
                </div>
            )}
        </div>
    );
}
