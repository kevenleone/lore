import { describe, expect, it } from 'vitest';

import type { BoardConfig, Collection, Item, ItemFlags, Priority } from './types';

import {
    boardColumnFor,
    boardColumns,
    boardFilterCount,
    boardFor,
    boardRollups,
    boardTasks,
    dayKey,
    dueTone,
    EMPTY_BOARD_FILTER,
    filterBoardTasks,
    openTasks,
    patchForColumn,
    taskCounts,
    taskGroups,
    taskTimeline,
    upcomingDays,
} from './tasks';
import { DEFAULT_BOARD, UNFILED_BOARD } from './types';

const TODAY = '2026-09-11';

function task(
    id: string,
    patch: {
        dueAt?: string;
        flags?: ItemFlags;
        priority?: Priority;
        status?: string;
        title?: string;
    } & Partial<Pick<Item, 'collectionId' | 'type'>> = {},
): Item {
    return {
        createdAt: '2026-09-01T09:00:00.000Z',
        flags: {},
        id,
        related: [],
        tags: [],
        title: id,
        type: 'task',
        updatedAt: '2026-09-01T09:00:00.000Z',
        ...patch,
    };
}

describe('openTasks', () => {
    it('keeps only unfinished tasks', () => {
        const items = [
            task('a'),
            task('b', { flags: { done: true } }),
            task('c', { type: 'note' }),
        ];

        expect(openTasks(items).map((t) => t.id)).toEqual(['a']);
    });

    it('answers an empty vault with an empty list', () => {
        expect(openTasks([])).toEqual([]);
    });
});

describe('dueTone', () => {
    it('reads a due day against today', () => {
        expect(dueTone(task('a'), TODAY)).toBe('none');
        expect(dueTone(task('a', { dueAt: '2026-09-10' }), TODAY)).toBe('overdue');
        expect(dueTone(task('a', { dueAt: TODAY }), TODAY)).toBe('today');
        expect(dueTone(task('a', { dueAt: '2026-09-12' }), TODAY)).toBe('later');
    });
});

describe('dayKey', () => {
    // The whole feature compares `YYYY-MM-DD` strings, so a late-evening date
    // must not be pushed into tomorrow by a UTC conversion.
    it('names the local day, not the UTC one', () => {
        const late = new Date(2026, 8, 11, 23, 30);

        expect(dayKey(late)).toBe('2026-09-11');
    });
});

describe('taskGroups', () => {
    it('splits Today into overdue, due today, and undated queue items', () => {
        const items = [
            task('late', { dueAt: '2026-09-09' }),
            task('now', { dueAt: TODAY }),
            task('queued', { flags: { today: true } }),
            task('undated'),
            task('later', { dueAt: '2026-09-20' }),
            task('finished', { dueAt: '2026-09-09', flags: { done: true } }),
        ];

        expect(taskGroups(items, TODAY).map((g) => [g.kind, g.tasks.map((t) => t.id)])).toEqual([
            ['overdue', ['late']],
            ['today', ['now']],
            ['noDate', ['queued']],
        ]);
    });

    it('sorts a group by priority, then title', () => {
        const items = [
            task('b-normal', { dueAt: TODAY }),
            task('a-low', { dueAt: TODAY, priority: 'low' }),
            task('z-urgent', { dueAt: TODAY, priority: 'urgent' }),
            task('a-normal', { dueAt: TODAY }),
        ];
        const [, due] = taskGroups(items, TODAY);

        expect(due.tasks.map((t) => t.id)).toEqual(['z-urgent', 'a-normal', 'b-normal', 'a-low']);
    });
});

const BOARD: BoardConfig = {
    columns: [
        { id: 'todo', name: 'To do' },
        { id: 'doing', name: 'In progress' },
        { done: true, id: 'done', name: 'Done' },
    ],
    view: 'cards',
};

describe('boardColumnFor', () => {
    it("reads the task's status", () => {
        expect(boardColumnFor(task('a', { status: 'doing' }), BOARD)).toBe('doing');
    });

    it('falls into the first column when the status names none', () => {
        expect(boardColumnFor(task('a'), BOARD)).toBe('todo');
        // What happens to a task moved between collections whose boards differ.
        expect(boardColumnFor(task('a', { status: 'in-review' }), BOARD)).toBe('todo');
    });

    it('puts a done task in the completing column, whatever its status says', () => {
        const finished = task('a', { flags: { done: true }, status: 'doing' });

        expect(boardColumnFor(finished, BOARD)).toBe('done');
    });

    it('leaves a done task in the first column when no column completes', () => {
        const plain: BoardConfig = { columns: [{ id: 'todo', name: 'To do' }], view: 'cards' };

        expect(boardColumnFor(task('a', { flags: { done: true } }), plain)).toBe('todo');
    });

    // Ticking the checkbox off has to bring the card back out of Done, or the
    // board and the Today list disagree about the same task.
    it('does not strand an unfinished task in the completing column', () => {
        expect(boardColumnFor(task('a', { status: 'done' }), BOARD)).toBe('todo');
    });
});

describe('patchForColumn', () => {
    it('writes the status, and `done` to match the column', () => {
        const open = task('a', { flags: { starred: true } });

        expect(patchForColumn(open, BOARD.columns[1])).toEqual({
            flags: { done: false, starred: true },
            status: 'doing',
        });
        expect(patchForColumn(open, BOARD.columns[2])).toEqual({
            flags: { done: true, starred: true },
            status: 'done',
        });
    });

    it('is the inverse of boardColumnFor, from any starting state', () => {
        const starts = [{}, { done: true }, { inbox: true, today: true }];

        for (const flags of starts) {
            for (const column of BOARD.columns) {
                const patch = patchForColumn(task('a', { flags }), column);
                const moved = task('a', { flags: patch.flags, status: patch.status });

                expect(boardColumnFor(moved, BOARD)).toBe(column.id);
            }
        }
    });
});

describe('filterBoardTasks', () => {
    const tasks = [
        task('a', { dueAt: '2026-09-01', priority: 'urgent', title: 'Rewrite the copy' }),
        task('b', { priority: 'low', title: 'Triage the reading list' }),
        task('c', { title: 'Reply to Okafor' }),
    ];

    tasks[2] = { ...tasks[2], prose: 'Send the transcript back', tags: ['research'] };

    it('is off when every facet is empty', () => {
        expect(filterBoardTasks(tasks, EMPTY_BOARD_FILTER, TODAY)).toEqual(tasks);
        expect(boardFilterCount(EMPTY_BOARD_FILTER)).toBe(0);
    });

    it('matches the title and the description, not just the title', () => {
        const byTitle = { ...EMPTY_BOARD_FILTER, query: 'okafor' };
        const byProse = { ...EMPTY_BOARD_FILTER, query: 'transcript' };

        expect(filterBoardTasks(tasks, byTitle, TODAY).map((t) => t.id)).toEqual(['c']);
        expect(filterBoardTasks(tasks, byProse, TODAY).map((t) => t.id)).toEqual(['c']);
    });

    it('narrows by priority, counting an absent one as normal', () => {
        const filter = { ...EMPTY_BOARD_FILTER, priorities: ['normal' as const] };

        expect(filterBoardTasks(tasks, filter, TODAY).map((t) => t.id)).toEqual(['c']);
    });

    it('narrows by tag and by overdue', () => {
        expect(
            filterBoardTasks(tasks, { ...EMPTY_BOARD_FILTER, tags: ['research'] }, TODAY).map(
                (t) => t.id,
            ),
        ).toEqual(['c']);
        expect(
            filterBoardTasks(tasks, { ...EMPTY_BOARD_FILTER, overdue: true }, TODAY).map(
                (t) => t.id,
            ),
        ).toEqual(['a']);
    });

    // Each facet narrows against the others, the way `Filters` does.
    it('requires every set facet at once', () => {
        const filter = {
            ...EMPTY_BOARD_FILTER,
            overdue: true,
            priorities: ['low' as const],
        };

        expect(filterBoardTasks(tasks, filter, TODAY)).toEqual([]);
        expect(boardFilterCount(filter)).toBe(2);
    });
});

describe('boardFor', () => {
    it('hands back the default columns for a board nobody has edited', () => {
        expect(boardFor({}, 'c1')).toBe(DEFAULT_BOARD);
        expect(boardFor({ c1: BOARD }, 'c1')).toBe(BOARD);
    });
});

describe('boardTasks', () => {
    it('splits tasks by collection, with the unfiled ones on their own board', () => {
        const items = [
            task('a', { collectionId: 'c1' }),
            task('b', { collectionId: 'c2' }),
            task('c'),
            task('note', { collectionId: 'c1', type: 'note' }),
        ];

        expect(boardTasks(items, 'c1').map((t) => t.id)).toEqual(['a']);
        expect(boardTasks(items, UNFILED_BOARD).map((t) => t.id)).toEqual(['c']);
    });
});

describe('boardColumns', () => {
    it('lays every task out under exactly one column, done ones included', () => {
        const items = [
            task('t', { status: 'todo' }),
            task('d', { status: 'doing' }),
            task('x', { flags: { done: true } }),
            task('note', { type: 'note' }),
        ];

        expect(
            boardColumns(items, BOARD).map((c) => [c.config.id, c.tasks.map((t) => t.id)]),
        ).toEqual([
            ['todo', ['t']],
            ['doing', ['d']],
            ['done', ['x']],
        ]);
    });
});

describe('taskTimeline', () => {
    const at = (day: string, time = '09:00') => new Date(`${day}T${time}:00`).toISOString();

    it('leads with what is still open, then each day something was finished', () => {
        const items = [
            task('open-a', { dueAt: TODAY }),
            { ...task('done-1'), completedAt: at('2026-09-11'), flags: { done: true } },
            { ...task('done-2'), completedAt: at('2026-09-11', '17:30'), flags: { done: true } },
            { ...task('done-3'), completedAt: at('2026-09-09'), flags: { done: true } },
        ];

        expect(taskTimeline(items, TODAY).map((g) => [g.key, g.tasks.map((t) => t.id)])).toEqual([
            ['open', ['open-a']],
            // Newest day first, and newest within the day.
            ['2026-09-11', ['done-2', 'done-1']],
            ['2026-09-09', ['done-3']],
        ]);
    });

    /*
     * A task finished before Lore dated completions has no day to sit on.
     * Guessing one from `updatedAt` would scatter them across days nothing
     * happened on, so they get a bucket of their own at the end.
     */
    it('keeps undated completions apart rather than guessing a day', () => {
        const items = [{ ...task('old'), flags: { done: true } }];

        expect(taskTimeline(items, TODAY).map((g) => g.key)).toEqual(['undated']);
    });

    it('drops a group that has nothing in it, and ignores what is not a task', () => {
        expect(taskTimeline([], TODAY)).toEqual([]);
        expect(taskTimeline([task('n', { type: 'note' })], TODAY)).toEqual([]);
    });
});

describe('upcomingDays', () => {
    it('returns consecutive days, each carrying the tasks due on it', () => {
        const items = [
            task('mon', { dueAt: '2026-09-14' }),
            task('wed', { dueAt: '2026-09-16' }),
            task('far', { dueAt: '2026-10-01' }),
        ];
        const days = upcomingDays(items, new Date(2026, 8, 14), 5);

        expect(days.map((d) => d.key)).toEqual([
            '2026-09-14',
            '2026-09-15',
            '2026-09-16',
            '2026-09-17',
            '2026-09-18',
        ]);
        expect(days.map((d) => d.tasks.map((t) => t.id))).toEqual([['mon'], [], ['wed'], [], []]);
    });
});

describe('boardRollups', () => {
    const collections: Collection[] = [
        { color: '#6b8cc4', id: 'c1', name: 'Onboarding' },
        { color: '#c48a6b', id: 'c2', name: 'Release' },
        { color: '#82a896', id: 'c3', name: 'Empty' },
    ];

    it('counts open and done per collection and names the next due day', () => {
        const items = [
            task('a', { collectionId: 'c1', dueAt: '2026-09-20' }),
            task('b', { collectionId: 'c1', dueAt: '2026-09-14' }),
            task('c', { collectionId: 'c1', flags: { done: true } }),
            task('d', { collectionId: 'c2', flags: { done: true } }),
            task('e'),
        ];

        expect(boardRollups(items, collections)).toEqual([
            {
                collectionId: 'c1',
                color: '#6b8cc4',
                done: 1,
                name: 'Onboarding',
                nextDue: '2026-09-14',
                open: 2,
                percent: 33,
            },
            {
                collectionId: 'c2',
                color: '#c48a6b',
                done: 1,
                name: 'Release',
                nextDue: null,
                open: 0,
                percent: 100,
            },
            {
                collectionId: null,
                color: '#c4c4cc',
                done: 0,
                name: 'Unfiled',
                nextDue: null,
                open: 1,
                percent: 0,
            },
        ]);
    });

    it('drops a collection with no tasks in it', () => {
        expect(boardRollups([], collections)).toEqual([]);
    });
});

describe('taskCounts', () => {
    it('counts each sidebar row', () => {
        const items = [
            task('late', { dueAt: '2026-09-01' }),
            task('now', { dueAt: TODAY }),
            task('soon', { dueAt: '2026-09-20' }),
            task('done', { flags: { done: true } }),
            task('note', { type: 'note' }),
        ];

        expect(taskCounts(items, [], TODAY)).toEqual({
            boards: 1,
            overdue: 1,
            today: 2,
            upcoming: 2,
        });
    });
});
