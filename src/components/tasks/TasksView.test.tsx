// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { BoardConfig, Item } from '../../store/types';

import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { TasksView } from './TasksView';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

const COLLECTIONS = [{ color: '#6b8cc4', id: 'c1', name: 'Onboarding' }];

/** A `YYYY-MM-DD` day relative to today, in local time. */
function day(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${String(d.getDate()).padStart(2, '0')}`;
}

function task(id: string, title: string, patch: Partial<Item> = {}): Item {
    return {
        collectionId: 'c1',
        createdAt: '2026-09-01T09:00:00.000Z',
        flags: {},
        id,
        related: [],
        tags: [],
        title,
        type: 'task',
        updatedAt: '2026-09-01T09:00:00.000Z',
        ...patch,
    };
}

const ITEMS = [
    task('t1', 'Cut the release branch', { dueAt: day(-2) }),
    task('t2', 'Rewrite the picker copy', {
        dueAt: day(0),
        prose: 'Read the current three screens first',
    }),
    task('t3', 'Transcribe the interview', { dueAt: day(2) }),
    task('t5', 'Shipped it', {
        completedAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
        flags: { done: true },
    }),
    task('t4', 'Triage the reading list', {
        comments: [
            { at: '2026-09-01T09:00:00.000Z', body: 'one', id: 'k1' },
            { at: '2026-09-01T09:00:00.000Z', body: 'two', id: 'k2' },
        ],
        flags: { inbox: true },
        subtasks: { done: 1, total: 3 },
    }),
];

/**
 * `boardId` is which of the Board tab's two states is showing: null is the
 * overview, an id is that collection's board. Every seeded task is filed
 * in c1, so that is the board they are on.
 */
function mount(
    taskView: 'board' | 'summary' | 'upcoming',
    updateItem = vi.fn(),
    board?: BoardConfig,
    boardId: null | string = 'c1',
) {
    useStore.setState({
        boardId,
        boards: board ? { c1: board } : {},
        collections: COLLECTIONS,
        items: ITEMS,
        mainView: 'tasks',
        selectedId: null,
        taskView,
        updateItem,
    });
    return render(<TasksView />);
}

afterEach(() => {
    cleanup();
    useStore.setState({
        boardId: null,
        boards: {},
        captureOpen: false,
        capturePreset: null,
        collections: [],
        items: [],
        mainView: 'library',
        prefs: DEFAULT_PREFS,
        selectedId: null,
        taskRailOpen: false,
        taskView: 'summary',
    });
});

/**
 * The column the pointer is over. jsdom has no layout, so hit-testing has to be
 * answered rather than measured — the drag reads `elementFromPoint`, and this is
 * what it finds.
 */
function pointerOver(label: string) {
    const column = screen.getByText(label).closest('[data-board-column]')!;
    // Assigned rather than spied: jsdom has no layout, so it does not define
    // `elementFromPoint` in the first place.
    document.elementFromPoint = () => column;
}

/** The Summary tab's urgent slice, apart from the timeline under it. */
const attention = () => screen.getByRole('region', { name: 'Needs attention' });
const timeline = () => screen.getByRole('region', { name: 'Timeline' });

describe('Summary', () => {
    it('puts a late task under Overdue and today’s under Due today', () => {
        mount('summary');
        const overdue = within(attention()).getByText('Overdue').closest('div')!.parentElement!;
        expect(within(overdue).getByText('Cut the release branch')).toBeTruthy();

        const due = within(attention()).getByText('Due today').closest('div')!.parentElement!;
        expect(within(due).getByText('Rewrite the picker copy')).toBeTruthy();

        // Dated later than today belongs to Upcoming, not to this slice.
        expect(within(attention()).queryByText('Transcribe the interview')).toBeNull();
    });

    it('ticking a task writes `done` to the file', () => {
        const updateItem = vi.fn();
        mount('summary', updateItem);
        fireEvent.click(within(attention()).getByLabelText('Mark Cut the release branch done'));
        expect(updateItem).toHaveBeenCalledWith('t1', { flags: { done: true } });
    });

    // The same task can be in both regions — the top is what is urgent, the
    // timeline is everything — so each is named rather than run together.
    it('lists every task in the timeline, finished ones included', () => {
        mount('summary');
        const shown = within(timeline());
        expect(shown.getByText('Still open')).toBeTruthy();
        expect(shown.getByText('Transcribe the interview')).toBeTruthy();
        expect(shown.getByText('Shipped it')).toBeTruthy();
    });

    // The history is where a finished task is looked at, so it has to be where
    // one can be reopened too.
    it('reopens a finished task from the timeline', () => {
        const updateItem = vi.fn();
        mount('summary', updateItem);

        fireEvent.click(within(timeline()).getByLabelText('Mark Shipped it not done'));
        expect(updateItem).toHaveBeenCalledWith('t5', { flags: { done: false } });
    });

    it('groups finished tasks by the day they were completed', () => {
        mount('summary');
        const group = within(timeline()).getByText('Yesterday').closest('div')!.parentElement!;
        expect(within(group).getByText('Shipped it')).toBeTruthy();
    });

    // `selectItem` sends the window back to the library, which would drop the
    // user out of Tasks the moment they clicked a row.
    it('selecting a task keeps the window on the Tasks surface', () => {
        mount('summary');
        fireEvent.click(within(attention()).getByText('Rewrite the picker copy'));
        expect(useStore.getState().selectedId).toBe('t2');
        expect(useStore.getState().mainView).toBe('tasks');
    });
});

describe('Upcoming', () => {
    it('draws a task with the same face the board gives it', () => {
        useStore.setState({
            collections: COLLECTIONS,
            items: [
                task('t9', 'Transcribe the interview', {
                    dueAt: day(2),
                    subtasks: { done: 1, total: 4 },
                }),
            ],
            mainView: 'tasks',
            taskView: 'upcoming',
        });
        render(<TasksView />);

        // Progress and the project tag are `TaskCard`'s, and the old column-only
        // card had neither.
        expect(screen.getByText('Progress')).toBeTruthy();
        expect(screen.getByText('1/4')).toBeTruthy();
        expect(screen.getByText('Onboarding')).toBeTruthy();
    });

    it('shows an empty state rather than five empty columns', () => {
        useStore.setState({
            collections: COLLECTIONS,
            items: [task('t9', 'No date on this one')],
            mainView: 'tasks',
            taskView: 'upcoming',
        });
        render(<TasksView />);

        expect(screen.getByText('The week is clear')).toBeTruthy();
        expect(screen.getByText('Add a task')).toBeTruthy();
    });
});

describe('Board', () => {
    it('lays each task out under the column its status names', () => {
        mount('board');
        const todo = screen.getByText('To do').closest('[data-board-column]')!;
        // Nothing seeded carries a status, so every card starts in column one.
        expect(within(todo as HTMLElement).getByText('Triage the reading list')).toBeTruthy();
    });

    it('moves a card to the column the pointer is released over', () => {
        const updateItem = vi.fn();
        mount('board', updateItem);
        pointerOver('In progress');

        const card = screen.getByLabelText('Triage the reading list — in To do');
        fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 });
        fireEvent.pointerMove(window, { clientX: 300, clientY: 120 });
        fireEvent.pointerUp(window, { clientX: 300, clientY: 120 });

        expect(updateItem).toHaveBeenCalledWith('t4', {
            flags: { done: false, inbox: true },
            status: 'doing',
        });
    });

    it('paints the grabbing cursor on the document, not just the card', () => {
        mount('board');
        pointerOver('In progress');

        const card = screen.getByLabelText('Triage the reading list — in To do');
        fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 });
        expect(document.documentElement.hasAttribute('data-dragging')).toBe(false);

        fireEvent.pointerMove(window, { clientX: 300, clientY: 120 });
        expect(document.documentElement.hasAttribute('data-dragging')).toBe(true);

        fireEvent.pointerUp(window, { clientX: 300, clientY: 120 });
        expect(document.documentElement.hasAttribute('data-dragging')).toBe(false);
    });

    it('lets go of the cursor when a drag is abandoned', () => {
        mount('board');
        pointerOver('In progress');

        const card = screen.getByLabelText('Triage the reading list — in To do');
        fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 });
        fireEvent.pointerMove(window, { clientX: 300, clientY: 120 });
        fireEvent.keyDown(window, { key: 'Escape' });

        expect(document.documentElement.hasAttribute('data-dragging')).toBe(false);
    });

    // A card is a button as well as a cargo: releasing a drag must not also
    // open the task that was just moved.
    it('does not open the task a drag just moved', () => {
        mount('board');
        pointerOver('In progress');

        const card = screen.getByLabelText('Triage the reading list — in To do');
        fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 });
        fireEvent.pointerMove(window, { clientX: 300, clientY: 120 });
        fireEvent.pointerUp(window, { clientX: 300, clientY: 120 });
        fireEvent.click(card);

        expect(useStore.getState().selectedId).toBeNull();
    });

    it('a press that never travels is a click, not a drag', () => {
        const updateItem = vi.fn();
        mount('board', updateItem);
        pointerOver('In progress');

        const card = screen.getByLabelText('Triage the reading list — in To do');
        fireEvent.pointerDown(card, { button: 0, clientX: 10, clientY: 10 });
        fireEvent.pointerMove(window, { clientX: 12, clientY: 11 });
        fireEvent.pointerUp(window, { clientX: 12, clientY: 11 });
        fireEvent.click(card);

        expect(updateItem).not.toHaveBeenCalled();
        expect(useStore.getState().selectedId).toBe('t4');
    });

    // The pointer is not the only way in: a board you can only use with a mouse
    // is a board half the keyboard cannot reach.
    it('moves a focused card one column with the arrow keys', () => {
        const updateItem = vi.fn();
        mount('board', updateItem);

        fireEvent.keyDown(screen.getByLabelText('Triage the reading list — in To do'), {
            key: 'ArrowRight',
        });
        expect(updateItem).toHaveBeenCalledWith('t4', {
            flags: { done: false, inbox: true },
            status: 'doing',
        });
    });

    it('does not walk a card off either end', () => {
        const updateItem = vi.fn();
        mount('board', updateItem);

        fireEvent.keyDown(screen.getByLabelText('Triage the reading list — in To do'), {
            key: 'ArrowLeft',
        });
        expect(updateItem).not.toHaveBeenCalled();
    });

    it('shows checklist progress and the comment count on a card', () => {
        mount('board');
        // `subtasks` is derived from the body by the repository, so a card can
        // draw a progress bar without one.
        expect(screen.getByLabelText('1 of 3 subtasks done')).toBeTruthy();
        expect(screen.getByLabelText('2 comments')).toBeTruthy();
    });

    it('shows the task’s own prose as the card description', () => {
        mount('board');
        expect(screen.getByText('Read the current three screens first')).toBeTruthy();
    });

    it('adds a task into the column the + was pressed in', () => {
        mount('board');
        fireEvent.click(screen.getByLabelText('Add a task to In progress'));

        expect(useStore.getState().captureOpen).toBe(true);
        expect(useStore.getState().capturePreset).toEqual({
            collectionId: 'c1',
            done: false,
            status: 'doing',
            type: 'task',
        });
    });

    // A task captured into the completing column has to arrive already done, or
    // `boardColumnFor` reads it as open and puts it back in the first column —
    // which looked like Done refusing to take a new task.
    it('marks a task added to the completing column as done', () => {
        mount('board');
        fireEvent.click(screen.getByLabelText('Add a task to Done'));

        expect(useStore.getState().capturePreset).toEqual({
            collectionId: 'c1',
            done: true,
            status: 'done',
            type: 'task',
        });
    });

    // A capture opened any other way must not inherit the column.
    it('drops the preset when the capture is opened from anywhere else', () => {
        mount('board');
        fireEvent.click(screen.getByLabelText('Add a task to In progress'));
        expect(useStore.getState().capturePreset).not.toBeNull();

        useStore.getState().toggleCapture();
        useStore.getState().toggleCapture();
        expect(useStore.getState().capturePreset).toBeNull();
    });

    it('reorders columns by dragging a handle onto another column', () => {
        mount('board');
        pointerOver('Done');

        const handle = screen.getByTitle('Drag To do to reorder');
        fireEvent.pointerDown(handle, { button: 0, clientX: 10, clientY: 10 });
        fireEvent.pointerMove(window, { clientX: 400, clientY: 30 });
        fireEvent.pointerUp(window, { clientX: 400, clientY: 30 });

        // Lifted out and put back in, not swapped with the column it landed on.
        expect(useStore.getState().boards.c1.columns.map((c) => c.id)).toEqual([
            'doing',
            'done',
            'todo',
        ]);
    });
});

describe('the board filter', () => {
    it('narrows the columns, and says how many facets are on', () => {
        mount('board');
        expect(screen.getByText('Triage the reading list')).toBeTruthy();

        fireEvent.change(screen.getByLabelText('Search this board'), {
            target: { value: 'picker' },
        });
        expect(screen.queryByText('Triage the reading list')).toBeNull();
        expect(screen.getByText('Rewrite the picker copy')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Filter/ }).textContent).toContain('1');
    });

    // The filter describes the board being looked at, so carrying it to the
    // next one would hide cards for no reason the user can see.
    it('is dropped when another board is opened', () => {
        mount('board');
        fireEvent.change(screen.getByLabelText('Search this board'), {
            target: { value: 'picker' },
        });
        expect(useStore.getState().boardFilter.query).toBe('picker');

        useStore.getState().openBoard('c2');
        expect(useStore.getState().boardFilter.query).toBe('');
    });
});

describe('board columns', () => {
    it('adds a column, and keeps its id stable across a rename', async () => {
        mount('board');

        fireEvent.click(screen.getByText('Add column'));
        fireEvent.change(screen.getByPlaceholderText('Column name'), {
            target: { value: 'In review' },
        });
        fireEvent.keyDown(screen.getByPlaceholderText('Column name'), { key: 'Enter' });
        await waitFor(() => expect(screen.getByText('In review')).toBeTruthy());

        const columns = () => useStore.getState().boards.c1.columns;
        const added = columns()[columns().length - 1];
        expect(added).toEqual({ id: 'in-review', name: 'In review' });

        // A rename must not move any card: `status` holds the id, not the name.
        fireEvent.click(screen.getByText('In review'));
        const field = screen.getByDisplayValue('In review');
        fireEvent.change(field, { target: { value: 'QA' } });
        fireEvent.keyDown(field, { key: 'Enter' });
        await waitFor(() => expect(screen.getByText('QA')).toBeTruthy());
        expect(columns()[columns().length - 1]).toEqual({ id: 'in-review', name: 'QA' });
    });

    it('refuses to delete the last column', () => {
        mount('board', vi.fn(), { columns: [{ id: 'only', name: 'Only' }], view: 'cards' });

        fireEvent.click(screen.getByLabelText('Only column options'));
        expect(screen.getByText('Delete column').closest('button')!.disabled).toBe(true);
    });

    it('lays the same cards out as a list when the board asks for one', () => {
        mount('board', vi.fn(), { columns: [{ id: 'todo', name: 'To do' }], view: 'list' });

        // The list is the same board read another way: no columns to edit.
        expect(screen.queryByText('Add column')).toBeNull();
        expect(screen.getByText('To do')).toBeTruthy();
        expect(screen.getByText('Triage the reading list')).toBeTruthy();
    });
});

describe('the task rail', () => {
    // The panel describes what the rail is showing, so laying it over the rail
    // hides the thing it is about. List, rail and panel are three columns.
    it('docks the Properties panel beside the rail, not over it', () => {
        const { container } = mount('summary');
        useStore.setState({ prefs: { ...useStore.getState().prefs, propertiesOpen: true } });
        fireEvent.click(within(attention()).getByText('Rewrite the picker copy'));

        const columns = [...container.firstElementChild!.children];
        expect(columns.length).toBe(3);
        for (const column of columns) {
            expect(getComputedStyle(column).position).not.toBe('absolute');
        }
        // Both are on screen at once: the rail's own close button, and a row
        // that only the panel draws.
        expect(screen.getByLabelText('Close')).toBeTruthy();
        expect(screen.getByText('Priority')).toBeTruthy();
    });

    // Unmounting it would make it pop in and reflow as it goes; the library
    // collapses it by width, and so does this.
    it('collapses the panel by width rather than dropping it', () => {
        const { container } = mount('summary');
        fireEvent.click(within(attention()).getByText('Rewrite the picker copy'));

        const panel = () => [...container.firstElementChild!.children][2] as HTMLElement;
        expect(panel().style.width).toBe('0px');
        expect(panel().hasAttribute('inert')).toBe(true);
        expect(panel().className).toContain('transition-[width]');

        fireEvent.click(screen.getByTitle(/^Properties \(/));
        expect(panel().style.width).toBe('316px');
        expect(panel().hasAttribute('inert')).toBe(false);
    });

    it('drops the transition when Reduce Motion is on', () => {
        const prefs = useStore.getState().prefs;
        const { container } = mount('summary');
        useStore.setState({ prefs: { ...prefs, switches: { ...prefs.switches, motion: true } } });
        fireEvent.click(within(attention()).getByText('Rewrite the picker copy'));

        const panel = [...container.firstElementChild!.children][2] as HTMLElement;
        expect(panel.className).not.toContain('transition-[width]');
    });

    it('closes from its own button, and again from Escape', () => {
        const { container } = mount('summary');
        const rail = () => [...container.firstElementChild!.children][1] as HTMLElement;

        fireEvent.click(within(attention()).getByText('Rewrite the picker copy'));
        expect(rail().style.width).toBe('392px');

        fireEvent.click(screen.getByLabelText('Close'));
        expect(rail().style.width).toBe('0px');
        expect(rail().hasAttribute('inert')).toBe(true);

        // Closing a view is not deselecting: the library leaves `selectedId`
        // alone when its drawer closes, and the rail has to keep drawing the
        // task all the way through the collapse.
        expect(useStore.getState().selectedId).toBe('t2');
    });

    it('collapses the rail by width rather than dropping it', () => {
        const { container } = mount('summary');
        const rail = [...container.firstElementChild!.children][1] as HTMLElement;

        // Mounted before anything is selected, or it would arrive at its final
        // width with nothing to animate from.
        expect(rail.style.width).toBe('0px');
        expect(rail.hasAttribute('inert')).toBe(true);
        expect(rail.className).toContain('transition-[width]');
    });
});

describe('the Board overview', () => {
    it('lists every board when none is open', () => {
        mount('board', vi.fn(), undefined, null);
        expect(screen.getByText('Onboarding')).toBeTruthy();
        expect(screen.getByText('4 open · 1 done')).toBeTruthy();
        // The list, not a board: no columns to edit.
        expect(screen.queryByText('Add column')).toBeNull();
    });

    // Projects and Board used to be two tabs indexing the same collections. One
    // tab, two states: opening one swaps the overview for its columns, and the
    // breadcrumb swaps back.
    it('opens one board, and comes back from the breadcrumb', () => {
        mount('board', vi.fn(), undefined, null);

        fireEvent.click(screen.getByText('Open board ↗'));
        expect(useStore.getState().boardId).toBe('c1');
        expect(screen.getByText('To do')).toBeTruthy();
        expect(screen.getByText('Onboarding')).toBeTruthy();

        fireEvent.click(screen.getByLabelText('Back to all boards'));
        expect(useStore.getState().boardId).toBeNull();
        expect(screen.getByText('4 open · 1 done')).toBeTruthy();
    });

    // The tab used to leave `boardId` alone, so once a board was open there was
    // no way back to the overview except the breadcrumb — clicking Board did
    // nothing at all.
    it('comes back to the overview from the tab, with a board already open', () => {
        mount('board');
        expect(screen.getByText('To do')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Board' }));
        expect(useStore.getState().boardId).toBeNull();
        expect(screen.getByText('4 open · 1 done')).toBeTruthy();
    });

    it('lands on the overview when the tab is reached from another one', () => {
        mount('board');
        fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
        fireEvent.click(screen.getByRole('button', { name: 'Board' }));
        expect(useStore.getState().boardId).toBeNull();
    });
});
