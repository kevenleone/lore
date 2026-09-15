// The Tasks surface: one header with the four tabs, the active view, and a rail
// showing the selected task. Every view reads the same task files — the tabs
// only change how they are grouped.

import type { BoardViewMode, TaskView } from '../../store/types';

import { cn } from '../../lib/cn';
import { boardFor, boardTasks, dayKey, filterBoardTasks } from '../../store/tasks';
import { UNFILED_BOARD } from '../../store/types';
import { useStore } from '../../store/useStore';
import { DetailPane } from '../kb/DetailPane';
import { PROPERTIES_WIDTH, PropertiesPanel } from '../kb/PropertiesPanel';
import { Segmented } from '../settings/controls';
import { BoardFilterBar } from './BoardFilterBar';
import { BoardsOverview } from './BoardsOverview';
import { BoardListView, BoardView } from './BoardView';
import { SummaryView } from './SummaryView';
import { UpcomingView } from './UpcomingView';

/** Fixed, so the rail keeps its layout while the list beside it reflows. */
const RAIL_WIDTH = 392;

const TABS = ['Summary', 'Upcoming', 'Board'] as const;

/**
 * How one board lays its cards out. Named for the shape rather than reusing
 * "Board", which is the tab beside it — two controls in the same header cannot
 * both be called that.
 */
const BOARD_MODES = ['Cards', 'List'] as const;

type TabLabel = (typeof TABS)[number];

const TAB_TO_VIEW: Record<TabLabel, TaskView> = {
    Board: 'board',
    Summary: 'summary',
    Upcoming: 'upcoming',
};

const VIEW_TO_TAB: Record<TaskView, TabLabel> = {
    board: 'Board',
    summary: 'Summary',
    upcoming: 'Upcoming',
};

export function TasksView() {
    const closeTask = useStore((s) => s.closeTask);
    const items = useStore((s) => s.items);
    const propertiesOpen = useStore((s) => s.prefs.propertiesOpen);
    const reduceMotion = useStore((s) => s.prefs.switches.motion);
    const selectedId = useStore((s) => s.selectedId);
    const closeBoard = useStore((s) => s.closeBoard);
    const setTaskView = useStore((s) => s.setTaskView);
    const taskRailOpen = useStore((s) => s.taskRailOpen);
    const boardId = useStore((s) => s.boardId);
    const boards = useStore((s) => s.boards);
    const collections = useStore((s) => s.collections);
    const setBoardView = useStore((s) => s.setBoardView);
    const boardFilter = useStore((s) => s.boardFilter);
    const taskView = useStore((s) => s.taskView);

    // One clock read for the whole render: every group, pill and column
    // compares against the same day, so a render that straddles midnight
    // cannot put a task in two places at once.
    const now = new Date();
    const today = dayKey(now);

    // The Board tab has two states: every board at once, and one of them.
    // `boardId` is which — null is the overview.
    const board = boardId === null ? null : boardFor(boards, boardId);
    const boardName =
        boardId === UNFILED_BOARD
            ? 'Unfiled'
            : (collections.find((c) => c.id === boardId)?.name ?? 'Project');

    // The filter narrows what the columns show; `onBoard` is what the filter
    // bar offers its tag chips from, so a tag cannot vanish from the list the
    // moment it is chosen.
    const onBoard = boardId === null ? [] : boardTasks(items, boardId);
    const shown = filterBoardTasks(onBoard, boardFilter, today);

    const selected = items.find((i) => i.id === selectedId);
    const railOpen = taskRailOpen && selected?.type === 'task';
    const panelOpen = railOpen && propertiesOpen;

    return (
        <div className="flex min-w-0 flex-1 bg-surface">
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-[46px] flex-none items-center gap-3 border-b border-border px-[14px]">
                    {board ? (
                        <Breadcrumb name={boardName} onBack={closeBoard} />
                    ) : (
                        <span className="text-title-lg font-[680] tracking-[-.01em]">Tasks</span>
                    )}
                    <span className="truncate text-body text-text3">
                        {board ? boardSubtitle(boardId) : subtitle(taskView)}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                        {/* A board lays the same cards out two ways; the choice is the board's. */}
                        {board && (
                            <Segmented
                                onChange={(label) =>
                                    void setBoardView(label.toLowerCase() as BoardViewMode)
                                }
                                options={BOARD_MODES}
                                value={board.view === 'list' ? 'List' : 'Cards'}
                            />
                        )}
                        <Segmented
                            onChange={(label) => setTaskView(TAB_TO_VIEW[label])}
                            options={TABS}
                            value={VIEW_TO_TAB[taskView]}
                        />
                    </span>
                </div>

                {taskView === 'summary' && <SummaryView today={today} />}
                {taskView === 'upcoming' && <UpcomingView from={now} today={today} />}
                {taskView === 'board' && board && boardId !== null && (
                    <BoardFilterBar tasks={onBoard} />
                )}
                {taskView === 'board' &&
                    (board && boardId !== null ? (
                        board.view === 'list' ? (
                            <BoardListView
                                board={board}
                                showProject={boardId === UNFILED_BOARD}
                                tasks={shown}
                                today={today}
                            />
                        ) : (
                            <BoardView
                                board={board}
                                boardCollectionId={boardId === UNFILED_BOARD ? null : boardId}
                                showProject={boardId === UNFILED_BOARD}
                                tasks={shown}
                                today={today}
                            />
                        )
                    ) : (
                        <BoardsOverview today={today} />
                    ))}
            </div>

            {/*
             * The rail and the panel below it are both always here, collapsed to
             * nothing when they are closed. A column rendered as `{open && …}`
             * cannot animate its way in: a width transition needs a width to
             * transition *from*, and an element that arrives at its final size
             * has none. The sidebar and the library's Properties panel are
             * collapsed the same way, for the same reason.
             */}
            <div
                aria-hidden={!railOpen}
                className={cn(
                    'flex min-h-0 flex-none overflow-hidden',
                    railOpen ? 'border-l border-border' : 'border-l-0 border-none',
                    !reduceMotion &&
                        'transition-[width] duration-220 ease-[cubic-bezier(.4,0,.2,1)]',
                )}
                inert={!railOpen}
                // The collapse animates between two shared constants.
                style={{ width: railOpen ? RAIL_WIDTH : 0 }}
            >
                {/*
                 * Fixed, so the pane keeps its layout through the collapse
                 * rather than reflowing its text on every frame of it.
                 */}
                <div className="flex min-h-0 flex-col" style={{ width: RAIL_WIDTH }}>
                    <DetailPane onClose={closeTask} />
                </div>
            </div>

            {/*
             * The panel is where a task's Due and Priority are edited, so it
             * has to reach this surface too — the rail's own toggle opens it.
             * Docked on the far edge as a column of its own, the way the library
             * docks it beside the detail pane: it describes what the rail is
             * showing, so covering the rail with it hides the thing it is about.
             *
             * It closes with the rail as well as on its own, so a rail on its
             * way out does not leave the panel standing beside nothing.
             */}
            <div
                aria-hidden={!panelOpen}
                className={cn(
                    'flex-none overflow-hidden',
                    panelOpen ? 'border-l border-border' : 'border-l-0 border-none',
                    !reduceMotion &&
                        'transition-[width] duration-220 ease-[cubic-bezier(.4,0,.2,1)]',
                )}
                inert={!panelOpen}
                // The collapse animates between two shared constants.
                style={{ width: panelOpen ? PROPERTIES_WIDTH : 0 }}
            >
                <PropertiesPanel />
            </div>
        </div>
    );
}

function boardSubtitle(boardId: null | string): string {
    return boardId === UNFILED_BOARD
        ? 'Tasks filed in no collection'
        : 'Columns and layout belong to this collection';
}

/**
 * `Board / Work`, with the first half the way back. One board is the detail of
 * the overview, not a place of its own, so the header says so.
 */
function Breadcrumb({ name, onBack }: { name: string; onBack: () => void }) {
    return (
        <span className="flex min-w-0 items-center gap-2">
            <button
                // The Board tab is a button called "Board" too; this one says
                // where it goes rather than where you already are.
                aria-label="Back to all boards"
                className="border-none bg-transparent p-0 font-[inherit] text-title-lg font-[590] text-text3 hover:text-text"
                onClick={onBack}
                type="button"
            >
                Board
            </button>
            <span className="text-title-lg text-faint">/</span>
            <span className="truncate text-title-lg font-[680] tracking-[-.01em]">{name}</span>
        </span>
    );
}

function subtitle(view: TaskView): string {
    switch (view) {
        case 'board':
            return 'One board per collection — open one for its columns';
        case 'summary':
            return 'What needs attention now, and everything since';
        case 'upcoming':
            return 'The next five days';
    }
}
