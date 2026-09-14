// A collection's board. The columns are the collection's own — see `BoardConfig`
// — and each task's `status` names the one it sits in.
//
// `done` is the exception, and deliberately so: a column can be marked as
// completing the task, and a card dropped there writes the `done` flag that
// Today, the counts and the focus queue already read. Without that a task could
// sit in "Done" and still be counted as open everywhere else in the app.

import { useState } from 'react';

import type { BoardColumnConfig, BoardConfig, Collection, Item } from '../../store/types';

import { cn } from '../../lib/cn';
import { boardColumnFor, boardColumns, patchForColumn } from '../../store/tasks';
import { useStore } from '../../store/useStore';
import { Grip, Plus } from '../common/glyphs';
import { BoardColumnMenu } from './BoardColumnMenu';
import { TaskCard } from './TaskCard';
import { TaskCheckbox } from './TaskRow';
import { usePointerDrag } from './usePointerDrag';

const ICON_BUTTON =
    'flex h-[22px] w-[22px] flex-none items-center justify-center rounded-7 border-none bg-transparent p-0 font-[inherit] text-faint hover:bg-hover hover:text-text2';

/** Marks a drop zone and names it; `usePointerDrag` hit-tests against this. */
const ZONE = 'data-board-column';

/** The list layout of the same board: one row per task, grouped by column. */
export function BoardListView({
    board,
    showProject,
    tasks,
    today,
}: {
    board: BoardConfig;
    showProject: boolean;
    tasks: Item[];
    today: string;
}) {
    const collections = useStore((s) => s.collections);
    const selectTask = useStore((s) => s.selectTask);
    const selectedId = useStore((s) => s.selectedId);

    return (
        <div className="flex-1 overflow-auto px-5 py-[18px]">
            {boardColumns(tasks, board).map((column) => (
                <div className="mb-[22px]" key={column.config.id}>
                    <div className="flex items-center gap-[9px] px-[2px] pb-[9px]">
                        <span className="text-caption font-[680] tracking-[.07em] text-faint uppercase">
                            {column.config.name}
                        </span>
                        <span className="text-body-sm text-faint tabular-nums">
                            {column.tasks.length}
                        </span>
                        <span className="h-px flex-1 bg-border-soft" />
                    </div>
                    <div className="flex flex-col gap-[7px]">
                        {column.tasks.map((task) => (
                            <BoardListRow
                                collections={collections}
                                key={task.id}
                                onSelect={() => selectTask(task.id)}
                                selected={task.id === selectedId}
                                showProject={showProject}
                                task={task}
                                today={today}
                            />
                        ))}
                        {column.tasks.length === 0 && (
                            <div className="px-[2px] text-body text-faint">Nothing here yet.</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function BoardView({
    board,
    boardCollectionId,
    showProject,
    tasks,
    today,
}: {
    board: BoardConfig;
    /** Which collection a task added from a column header is filed into. */
    boardCollectionId: null | string;
    showProject: boolean;
    tasks: Item[];
    today: string;
}) {
    const addBoardColumn = useStore((s) => s.addBoardColumn);
    const collections = useStore((s) => s.collections);
    const reduceMotion = useStore((s) => s.prefs.switches.motion);
    const moveBoardColumn = useStore((s) => s.moveBoardColumn);
    const openCaptureIn = useStore((s) => s.openCaptureIn);
    const selectTask = useStore((s) => s.selectTask);
    const updateItem = useStore((s) => s.updateItem);
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState('');

    const columns = boardColumns(tasks, board);

    const move = (columnId: string, id: string) => {
        const task = tasks.find((i) => i.id === id);
        const column = board.columns.find((c) => c.id === columnId);
        if (!task || !column || boardColumnFor(task, board) === columnId) return;
        void updateItem(id, patchForColumn(task, column));
    };

    const drag = usePointerDrag<string>(ZONE, move);
    const dragged = drag.state && tasks.find((i) => i.id === drag.state?.id);

    /*
     * A second drag over the same zones, started only from a column's handle.
     * Two instances rather than one with a mode: each has its own `wasDragged`,
     * and only one can ever have been pressed, so they cannot both be running.
     */
    const columnDrag = usePointerDrag<string>(ZONE, (targetId, columnId) => {
        void moveBoardColumn(columnId, targetId);
    });

    // ← and → move a focused card, so the board is not a pointer-only surface.
    const step = (task: Item, direction: -1 | 1) => {
        const at = board.columns.findIndex((c) => c.id === boardColumnFor(task, board));
        const next = board.columns[at + direction];
        if (next) move(next.id, task.id);
    };

    const commitColumn = () => {
        setAdding(false);
        const name = draft.trim();
        setDraft('');
        if (name) void addBoardColumn(name);
    };

    return (
        <div className="flex-1 overflow-auto bg-surface2 px-5 py-[18px]">
            <div className="flex items-start gap-[14px]">
                {columns.map((column, index) => (
                    <div
                        className={cn(
                            'w-[268px] flex-none rounded-xl border p-3',
                            !reduceMotion &&
                                'transition-[transform,opacity,border-color] duration-150 ease-out',
                            drag.over === column.config.id || columnDrag.over === column.config.id
                                ? 'border-accent bg-surface3'
                                : 'border-border bg-surface',
                            // The one being carried thins out; the one it is
                            // over lifts, so the gap it would drop into is
                            // visible before the pointer is let go.
                            columnDrag.state?.id === column.config.id && 'scale-[.97] opacity-40',
                            columnDrag.state &&
                                columnDrag.over === column.config.id &&
                                columnDrag.state.id !== column.config.id &&
                                '-translate-y-[3px]',
                        )}
                        key={column.config.id}
                        {...{ [ZONE]: column.config.id }}
                    >
                        <ColumnHeader
                            column={column.config}
                            count={column.tasks.length}
                            first={index === 0}
                            last={index === columns.length - 1}
                            onAdd={() => openCaptureIn(boardCollectionId, column.config)}
                            onGrab={(e) => columnDrag.start(e, column.config.id)}
                            only={columns.length === 1}
                        />
                        <div className="flex flex-col gap-2">
                            {column.tasks.map((task) => (
                                <div
                                    aria-label={`${task.title} — in ${column.config.name}`}
                                    className={cn(
                                        'cursor-grab touch-none rounded-11 border border-border bg-surface px-[13px] py-3',
                                        drag.state?.id === task.id && 'opacity-40',
                                    )}
                                    key={task.id}
                                    onClick={() => {
                                        if (!drag.wasDragged()) selectTask(task.id);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') selectTask(task.id);
                                        if (e.key === 'ArrowLeft') step(task, -1);
                                        if (e.key === 'ArrowRight') step(task, 1);
                                    }}
                                    onPointerDown={(e) => drag.start(e, task.id)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <TaskCard
                                        collections={collections}
                                        item={task}
                                        showProject={showProject}
                                        today={today}
                                    />
                                </div>
                            ))}
                            {column.tasks.length === 0 && (
                                <div className="rounded-11 border border-dashed border-dash px-[13px] py-3 text-body text-faint">
                                    Drop a task here
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Add column */}
                <div className="w-[268px] flex-none">
                    {adding ? (
                        <input
                            autoFocus
                            className="w-full rounded-xl border border-accent bg-surface px-3 py-[10px] font-[inherit] text-body-lg text-text outline-none"
                            onBlur={commitColumn}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitColumn();
                                if (e.key === 'Escape') {
                                    setDraft('');
                                    setAdding(false);
                                }
                            }}
                            placeholder="Column name"
                            value={draft}
                        />
                    ) : (
                        <button
                            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-dash bg-transparent px-3 py-[10px] font-[inherit] text-body text-faint hover:border-accent-border hover:text-text2"
                            onClick={() => setAdding(true)}
                            type="button"
                        >
                            <Plus size={13} />
                            Add column
                        </button>
                    )}
                </div>
            </div>

            {/*
             * The card under the cursor. Outside the columns and `pointer-events-none`
             * so it never becomes the thing hit-testing finds.
             */}
            {dragged && drag.state && (
                <div
                    className="pointer-events-none fixed z-50 w-[240px] rounded-11 border border-accent bg-surface px-[13px] py-3 shadow-float"
                    // Follows the cursor; only JS knows where that is.
                    style={{ left: drag.state.x + 12, top: drag.state.y + 12 }}
                >
                    <TaskCard collections={collections} item={dragged} today={today} />
                </div>
            )}

            {/* The column being carried, so the drag has something under the cursor. */}
            {columnDrag.state && (
                <div
                    className="pointer-events-none fixed z-50 flex items-center gap-2 rounded-9 border border-accent bg-surface px-[11px] py-[7px] text-body-lg font-[640] shadow-float"
                    // Follows the cursor; only JS knows where that is.
                    style={{ left: columnDrag.state.x + 12, top: columnDrag.state.y + 12 }}
                >
                    {board.columns.find((c) => c.id === columnDrag.state?.id)?.name}
                </div>
            )}
        </div>
    );
}

function BoardListRow({
    collections,
    onSelect,
    selected,
    showProject,
    task,
    today,
}: {
    collections: Collection[];
    onSelect: () => void;
    selected: boolean;
    showProject: boolean;
    task: Item;
    today: string;
}) {
    return (
        <div
            aria-current={selected ? 'true' : undefined}
            className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border px-[14px] py-[13px]',
                selected
                    ? 'border-accent bg-surface2'
                    : 'border-border bg-surface hover:border-accent-border',
            )}
            onClick={onSelect}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
            role="button"
            tabIndex={0}
        >
            <span className="mt-[1px] flex flex-none">
                <TaskCheckbox item={task} />
            </span>
            <span className="min-w-0 flex-1">
                <TaskCard
                    collections={collections}
                    item={task}
                    showProject={showProject}
                    today={today}
                />
            </span>
        </div>
    );
}

/** The name, the count, the add button, the drag handle, and the menu. */
function ColumnHeader({
    column,
    count,
    first,
    last,
    onAdd,
    onGrab,
    only,
}: {
    column: BoardColumnConfig;
    count: number;
    first: boolean;
    last: boolean;
    onAdd: () => void;
    onGrab: (event: React.PointerEvent) => void;
    only: boolean;
}) {
    const renameBoardColumn = useStore((s) => s.renameBoardColumn);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(column.name);

    const commit = () => {
        setEditing(false);
        if (draft.trim() && draft.trim() !== column.name) {
            void renameBoardColumn(column.id, draft);
        }
    };

    return (
        <div className="flex items-center gap-[5px] px-1 pb-[10px]">
            {editing ? (
                <input
                    autoFocus
                    className="min-w-0 flex-1 border-b-[1.5px] border-none border-b-accent bg-transparent font-[inherit] text-body-lg font-[640] text-text outline-none"
                    onBlur={commit}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commit();
                        if (e.key === 'Escape') {
                            setDraft(column.name);
                            setEditing(false);
                        }
                    }}
                    value={draft}
                />
            ) : (
                <>
                    <button
                        className="min-w-0 truncate border-none bg-transparent p-0 text-left font-[inherit] text-body-lg font-[640] text-text"
                        onClick={() => {
                            setDraft(column.name);
                            setEditing(true);
                        }}
                        title="Rename"
                        type="button"
                    >
                        {column.name}
                    </button>
                    {/* Beside the name, not out at the edge: it belongs to the name. */}
                    <span className="flex-none rounded-full bg-surface3 px-[7px] py-[1px] text-label text-text3 tabular-nums">
                        {count}
                    </span>
                    <span className="flex-1" />
                </>
            )}
            <button
                aria-label={`Add a task to ${column.name}`}
                className={ICON_BUTTON}
                onClick={onAdd}
                type="button"
            >
                <Plus size={13} />
            </button>
            {/*
             * The handle, not the whole header: the header carries a rename
             * field and a menu, and a press anywhere on it starting a drag
             * would put both out of reach.
             */}
            <span
                aria-hidden
                className={cn(ICON_BUTTON, 'cursor-grab touch-none')}
                onPointerDown={onGrab}
                title={`Drag ${column.name} to reorder`}
            >
                <Grip size={12} />
            </span>
            <BoardColumnMenu
                column={column}
                first={first}
                last={last}
                only={only}
                onRename={() => {
                    setDraft(column.name);
                    setEditing(true);
                }}
            />
        </div>
    );
}
