// Pure selectors for the Tasks surface, alongside `views.ts`: they take plain
// item/collection lists and return the groups, columns and rollups the four
// task views draw, so every rule in the feature is testable without a DOM.
//
// Two mappings are worth knowing before reading further:
//
//   - A project is a collection. The vault already files an item by its parent
//     folder, and a collection is that folder's name and colour, so a second
//     `project:` key would be a second source of truth for the same thing.
//   - A board column is a read of `ItemFlags`, not a `status:` field. The flags
//     already serialize and the context menu already speaks them; the columns
//     are just the order they are checked in.

import type {
    BoardColumnConfig,
    BoardConfig,
    Collection,
    Item,
    ItemFlags,
    Priority,
} from './types';

import { formatDueDay } from '../lib/format';
import { DEFAULT_BOARD, UNFILED_BOARD } from './types';
import { localDateKey } from './views';

/** What the board's filter bar is narrowing by. Empty everywhere means off. */
export interface BoardFilter {
    /** Only tasks that are past due. */
    overdue: boolean;
    priorities: Priority[];
    /** Matched against the title and the description. */
    query: string;
    tags: string[];
}

export const EMPTY_BOARD_FILTER: BoardFilter = {
    overdue: false,
    priorities: [],
    query: '',
    tags: [],
};

export interface BoardColumn {
    config: BoardColumnConfig;
    tasks: Item[];
}

export interface BoardRollup {
    /** null for the Unfiled bucket, which no collection owns. */
    collectionId: null | string;
    color: string;
    done: number;
    name: string;
    /** Earliest due day among the open tasks, or null. */
    nextDue: null | string;
    open: number;
    /** Completed share, 0–100, rounded. */
    percent: number;
}

/** How a due date reads against today. `'none'` is a task with no due date. */
export type DueTone = 'later' | 'none' | 'overdue' | 'today';

export interface TaskCounts {
    boards: number;
    overdue: number;
    today: number;
    upcoming: number;
}

export interface TaskGroup {
    kind: TaskGroupKind;
    label: string;
    tasks: Item[];
}

export type TaskGroupKind = 'noDate' | 'overdue' | 'today';

export const GROUP_LABELS: Record<TaskGroupKind, string> = {
    noDate: 'In Today, no due date',
    overdue: 'Overdue',
    today: 'Due today',
};

/** Days drawn by the Upcoming view. */
export const UPCOMING_DAYS = 5;

export interface TimelineGroup {
    /** The calendar day the group is, or null for the two open-ended ones. */
    day: null | string;
    key: string;
    label: string;
    tasks: Item[];
}

export interface UpcomingDay {
    date: Date;
    isToday: boolean;
    /** `YYYY-MM-DD`, the key tasks are matched on. */
    key: string;
    tasks: Item[];
}

/**
 * Which column a task sits in. `done` outranks `status` so a task finished from
 * anywhere — the Today list, the context menu, the checkbox on its own card —
 * lands in the completing column rather than reading as open on the board.
 *
 * A `status` naming no column on this board falls into the first one, which is
 * what happens to a task moved between collections whose boards differ.
 */
export function boardColumnFor(item: Item, board: BoardConfig): string {
    const done = board.columns.find((column) => column.done);

    if (item.flags.done && done) {
        return done.id;
    }

    const named = item.status && board.columns.find((column) => column.id === item.status);

    if (named && !named.done) {
        return named.id;
    }

    return board.columns[0]?.id ?? '';
}

/** Every task on this board, done included — the Done column is the point. */
export function boardColumns(items: Item[], board: BoardConfig): BoardColumn[] {
    const tasks = items.filter(isTask);

    return board.columns.map((config) => ({
        config,
        tasks: byUrgency(tasks.filter((task) => boardColumnFor(task, board) === config.id)),
    }));
}

/** How many facets the board filter is narrowing by — the badge on the button. */
export function boardFilterCount(filter: BoardFilter): number {
    return (
        filter.priorities.length +
        filter.tags.length +
        (filter.overdue ? 1 : 0) +
        (filter.query.trim() ? 1 : 0)
    );
}

/** A collection's board, or the default columns when it has never been edited. */
export function boardFor(boards: Record<string, BoardConfig>, boardId: string): BoardConfig {
    return boards[boardId] ?? DEFAULT_BOARD;
}

/**
 * One entry per collection that holds a task, plus an Unfiled bucket. Ordered
 * by the collection list so the overview and the sidebar agree.
 */
export function boardRollups(items: Item[], collections: Collection[]): BoardRollup[] {
    const tasks = items.filter(isTask);
    const rollups = collections
        .map((collection) =>
            rollup(
                collection.id,
                collection.name,
                collection.color,
                tasks.filter((task) => task.collectionId === collection.id),
            ),
        )
        .filter((collection): collection is BoardRollup => collection !== null);

    const unfiled = rollup(
        null,
        'Unfiled',
        UNFILED_COLOR,
        tasks.filter((task) => !task.collectionId),
    );

    return unfiled ? [...rollups, unfiled] : rollups;
}

/** The tasks on a board: a collection's, or everything filed nowhere. */
export function boardTasks(items: Item[], boardId: string): Item[] {
    return items.filter(
        (item) =>
            isTask(item) && (boardId === UNFILED_BOARD ? !item.collectionId : item.collectionId === boardId),
    );
}

/** The local calendar day a `Date` falls on, as `YYYY-MM-DD`. */
export function dayKey(date: Date): string {
    return localDateKey(date.toISOString());
}

export function dueTone(item: Item, today: string): DueTone {
    if (!item.dueAt) {
        return 'none';
    }

    if (item.dueAt < today) {
        return 'overdue';
    }

    if (item.dueAt === today) {
        return 'today';
    }

    return 'later';
}

/**
 * Narrows a board to what the filter bar asks for. Every field is a further
 * constraint, and an empty one is no constraint at all — the same rule the
 * library's `Filters` follows.
 */
export function filterBoardTasks(tasks: Item[], filter: BoardFilter, today: string): Item[] {
    const query = filter.query.trim().toLowerCase();

    return tasks.filter((task) => {
        if (filter.overdue && dueTone(task, today) !== 'overdue') {
            return false;
        }

        if (filter.priorities.length > 0) {
            if (!filter.priorities.includes(task.priority ?? 'normal')) {
                return false;
            }
        }

        if (filter.tags.length > 0 && !filter.tags.some((tag) => task.tags.includes(tag))) {
            return false;
        }

        if (!query) {
            return true;
        }

        return `${task.title} ${task.prose ?? ''}`.toLowerCase().includes(query);
    });
}

export function openTasks(items: Item[]): Item[] {
    return items.filter((item) => isTask(item) && !item.flags.done);
}

/**
 * The patch a drop into `column` writes. `status` is the column; `done` follows
 * whether that column completes the task, so dragging a card out of Done
 * reopens it the way ticking its checkbox off would.
 */
export function patchForColumn(
    item: Item,
    column: BoardColumnConfig,
): { flags: ItemFlags; status: string } {
    return { flags: { ...item.flags, done: !!column.done }, status: column.id };
}

export function taskCounts(items: Item[], collections: Collection[], today: string): TaskCounts {
    const open = openTasks(items);

    return {
        boards: boardRollups(items, collections).length,
        overdue: open.filter((item) => dueTone(item, today) === 'overdue').length,
        today: taskGroups(items, today).reduce((n, taskGroup) => n + taskGroup.tasks.length, 0),
        upcoming: open.filter((item) => !!item.dueAt && item.dueAt >= today).length,
    };
}

/**
 * The Today list: what is late, what is due today, and what was pulled into the
 * focus queue without a date. An open task dated later than today is in none of
 * them — that is what Upcoming is for.
 */
export function taskGroups(items: Item[], today: string): TaskGroup[] {
    const open = openTasks(items);
    const group = (kind: TaskGroupKind, tasks: Item[]): TaskGroup => ({
        kind,
        label: GROUP_LABELS[kind],
        tasks: byUrgency(tasks),
    });

    return [
        group(
            'overdue',
            open.filter((item) => dueTone(item, today) === 'overdue'),
        ),
        group(
            'today',
            open.filter((item) => dueTone(item, today) === 'today'),
        ),
        group(
            'noDate',
            open.filter((item) => dueTone(item, today) === 'none' && item.flags.today),
        ),
    ];
}

/**
 * The whole task history, newest first: what is still open, then everything
 * finished, grouped by the day it was finished.
 *
 * Tasks completed before Lore started dating completions have no day to sit on.
 * They go in a bucket of their own rather than being guessed at from
 * `updatedAt`, which is the file's last write and would scatter them across
 * days nothing happened on.
 */
export function taskTimeline(items: Item[], today: string): TimelineGroup[] {
    const tasks = items.filter(isTask);
    const open = tasks.filter((task) => !task.flags.done);
    const done = tasks.filter((task) => task.flags.done);

    const byDay = new Map<string, Item[]>();
    const undated: Item[] = [];

    for (const task of done) {
        if (!task.completedAt) {
            undated.push(task);
            continue;
        }

        const day = localDateKey(task.completedAt);

        byDay.set(day, [...(byDay.get(day) ?? []), task]);
    }

    const days = [...byDay.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([day, group]) => ({
            day,
            key: day,
            label: formatDueDay(day, today),
            tasks: group
                .slice()
                .sort((left, right) => (right.completedAt ?? '').localeCompare(left.completedAt ?? '')),
        }));

    return [
        ...(open.length > 0
            ? [{ day: null, key: 'open', label: 'Still open', tasks: byUrgency(open) }]
            : []),
        ...days,
        ...(undated.length > 0
            ? [{ day: null, key: 'undated', label: 'Completed earlier', tasks: undated }]
            : []),
    ];
}

/** `count` consecutive days from `from`, each with the tasks due on it. */
export function upcomingDays(items: Item[], from: Date, count: number): UpcomingDay[] {
    const open = openTasks(items);
    const today = dayKey(new Date());

    return Array.from({ length: count }, (_, offset) => {
        const date = new Date(from);

        date.setDate(date.getDate() + offset);

        const key = dayKey(date);

        return {
            date,
            isToday: key === today,
            key,
            tasks: byUrgency(open.filter((item) => item.dueAt === key)),
        };
    });
}

const UNFILED_COLOR = '#c4c4cc';

/** Absent means `'normal'` — see the `Priority` doc comment. */
const PRIORITY_RANK: Record<Priority, number> = { high: 2, low: 0, normal: 1, urgent: 3 };

/** Most urgent first, then alphabetical so the order never depends on load. */
function byUrgency(tasks: Item[]): Item[] {
    return tasks.slice().sort((left, right) => rankOf(right) - rankOf(left) || left.title.localeCompare(right.title));
}

function isTask(item: Item): boolean {
    return item.type === 'task';
}

function rankOf(item: Item): number {
    return PRIORITY_RANK[item.priority ?? 'normal'];
}

function rollup(
    collectionId: null | string,
    name: string,
    color: string,
    tasks: Item[],
): BoardRollup | null {
    if (tasks.length === 0) {
        return null;
    }

    const done = tasks.filter((task) => task.flags.done).length;
    const dueDays = tasks
        .filter((task) => !task.flags.done && task.dueAt)
        .map((task) => task.dueAt!)
        .sort();

    return {
        collectionId,
        color,
        done,
        name,
        nextDue: dueDays[0] ?? null,
        open: tasks.length - done,
        percent: Math.round((done / tasks.length) * 100),
    };
}
