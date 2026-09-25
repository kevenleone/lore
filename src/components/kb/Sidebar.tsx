// Left sidebar: the workspace switcher, Quick Capture, Library views (with
// counts), Collections, Tags,
// and the footer (Ask Lore + Settings).

import type { IconName, TaskView, View } from '../../store/types';

import { captureShortcut } from '../../lib/appMode';
import { cn } from '../../lib/cn';
import { formatHotkey, hotkeyFor } from '../../lib/hotkeys';
import { boardRollups, dayKey, taskCounts } from '../../store/tasks';
import { UNFILED_BOARD } from '../../store/types';
import { useStore } from '../../store/useStore';
import { isViewActive, tagCounts, viewCounts } from '../../store/views';
import { Message, Plus, Settings, Sparkle } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { CollectionsSection } from './CollectionsSection';
import { SavedSearchesSection } from './SavedSearchesSection';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

/** Fixed while the pane collapses, so the contents don't reflow mid-transition. */
export const SIDEBAR_WIDTH = 248;

/**
 * Every row here is a button: the sidebar is how the library is navigated, so
 * each one has to be reachable by keyboard as well as by pointer. The reset
 * strips the chrome a `<button>` brings with it, leaving the row it replaced.
 */
const ROW_BASE =
    'text-subhead flex w-full items-center gap-[9px] rounded-7 border-none bg-transparent px-[9px] py-[6px] text-left font-[inherit]';

const SECTION_LABEL =
    'text-caption px-[9px] pt-[15px] pb-[5px] font-[680] tracking-[.06em] text-faint uppercase';

const COUNT = 'text-body-sm tabular-nums opacity-50';

/** Today's count when something is late — the badge the mock puts on the row. */
const OVERDUE_COUNT =
    'rounded-full bg-danger-tint px-[7px] py-[1px] text-caption font-[620] tabular-nums text-danger';

const FOOTER_ROW =
    'flex w-full items-center gap-[9px] rounded-7 border-none bg-transparent px-[9px] py-[8px] text-left font-[inherit] text-text2 hover:bg-hover';

/** Selected rows carry the accent; the rest only light up under the pointer. */
function rowClass(active: boolean): string {
    return cn(
        ROW_BASE,
        active ? 'bg-accent-tint font-[590] text-accent' : 'text-text2 hover:bg-hover',
    );
}

const KEY_CAP = 'font-mono text-caption opacity-50';

const LIB_VIEWS: {
    countKey: keyof ReturnType<typeof viewCounts>;
    icon: IconName;
    keys: string;
    kind: View['kind'];
    label: string;
}[] = [
    {
        countKey: 'all',
        icon: 'layers',
        keys: formatHotkey(hotkeyFor('view-all')),
        kind: 'all',
        label: 'Everything',
    },
    {
        countKey: 'inbox',
        icon: 'inbox',
        keys: formatHotkey(hotkeyFor('view-inbox')),
        kind: 'inbox',
        label: 'Inbox',
    },
    {
        countKey: 'notes',
        icon: 'note',
        keys: formatHotkey(hotkeyFor('view-notes')),
        kind: 'notes',
        label: 'Notes',
    },
    {
        countKey: 'links',
        icon: 'globe',
        keys: formatHotkey(hotkeyFor('view-links')),
        kind: 'links',
        label: 'Links',
    },
    {
        countKey: 'files',
        icon: 'file',
        keys: formatHotkey(hotkeyFor('view-files')),
        kind: 'files',
        label: 'Files',
    },
];

const TASK_VIEWS: {
    countKey: keyof ReturnType<typeof taskCounts>;
    icon: IconName;
    keys?: string;
    label: string;
    view: TaskView;
}[] = [
    // The count is today's workload, which is what the row badges even though
    // the tab it opens also carries the timeline below it.
    {
        countKey: 'today',
        icon: 'sun',
        keys: formatHotkey(hotkeyFor('view-tasks')),
        label: 'Summary',
        view: 'summary',
    },
    { countKey: 'upcoming', icon: 'calendar', label: 'Upcoming', view: 'upcoming' },
    { countKey: 'boards', icon: 'board', label: 'Board', view: 'board' },
];

export function Sidebar({ onCapture }: { onCapture: () => void }) {
    const boardId = useStore((state) => state.boardId);
    const collections = useStore((state) => state.collections);
    const items = useStore((state) => state.items);
    const mainView = useStore((state) => state.mainView);
    const openBoard = useStore((state) => state.openBoard);
    const openSettings = useStore((state) => state.openSettings);
    const selectView = useStore((state) => state.selectView);
    const setMainView = useStore((state) => state.setMainView);
    const setTaskView = useStore((state) => state.setTaskView);
    const rails = useStore((state) => state.prefs.switches.sidebarRails);
    const showCounts = useStore((state) => state.prefs.switches.counts);
    const taskView = useStore((state) => state.taskView);
    const toggleChat = useStore((state) => state.toggleChat);
    const view = useStore((state) => state.view);

    const counts = viewCounts(items);
    const projects = boardRollups(items, collections);
    const tags = tagCounts(items);
    const today = dayKey(new Date());
    const tasks = taskCounts(items, collections, today);

    return (
        <div
            className="flex h-full flex-none flex-col overflow-auto border-r border-border bg-surface2 p-[10px] text-subhead"
            // The width is shared with App.tsx's collapse transition, so it stays
            // a constant rather than becoming a class.
            style={{ width: SIDEBAR_WIDTH }}
        >
            {/* Which vault this window is showing — scopes everything below it. */}
            <WorkspaceSwitcher />

            {/* Quick Capture */}
            <button
                className="mb-[10px] flex w-full items-center gap-[9px] rounded-9 border border-accent-border bg-accent-tint px-[11px] py-[9px] text-left font-[inherit] font-[590] text-accent"
                onClick={onCapture}
                type="button"
            >
                <Sparkle size={15} />
                Quick Capture
                <span className="ml-auto font-mono text-caption opacity-75">
                    {captureShortcut()}
                </span>
            </button>

            {/*
             * Grouped, and named for the group: Library and Tasks each have a
             * row called "Today" — one is the focus queue across every item
             * type, the other is the task list — and without the landmark they
             * are two identical announcements.
             */}
            <nav aria-label="Library">
                <div className={cn(SECTION_LABEL, 'pt-[6px]')}>Library</div>
                {LIB_VIEWS.map((v) => {
                    const active = mainView === 'library' && isViewActive(view, v.kind);

                    return (
                        <button
                            aria-current={active ? 'page' : undefined}
                            className={rowClass(active)}
                            key={v.kind}
                            onClick={() => selectView(v.kind, null)}
                            type="button"
                        >
                            <span className="flex flex-none">
                                <Icon name={v.icon} />
                            </span>
                            <span className="flex-1">{v.label}</span>
                            {showCounts && <span className={COUNT}>{counts[v.countKey]}</span>}
                            <span className={KEY_CAP}>{v.keys}</span>
                        </button>
                    );
                })}
            </nav>

            {/* The calendar is a surface rather than a filter, so it sits apart. */}
            <button
                aria-current={mainView === 'calendar' ? 'page' : undefined}
                className={rowClass(mainView === 'calendar')}
                onClick={() => setMainView('calendar')}
                type="button"
            >
                <span className="flex flex-none">
                    <Icon name="calendar" />
                </span>
                <span className="flex-1">Calendar</span>
                <span className={KEY_CAP}>{formatHotkey(hotkeyFor('view-calendar'))}</span>
            </button>

            {/* The graph is a surface too: the whole vault at once, not a filter of it. */}
            <button
                aria-current={mainView === 'graph' ? 'page' : undefined}
                className={rowClass(mainView === 'graph')}
                onClick={() => setMainView('graph')}
                type="button"
            >
                <span className="flex flex-none">
                    <Icon name="layers" />
                </span>
                <span className="flex-1">Graph</span>
            </button>

            {/* Tasks — a surface of its own, like the calendar, with four reads of it. */}
            <nav aria-label="Tasks">
                <div className="flex items-center gap-[7px] px-[9px] pt-[15px] pb-[5px]">
                    <span className="text-caption font-[680] tracking-[.06em] text-faint uppercase">
                        Tasks
                    </span>
                    {tasks.overdue > 0 && (
                        <span className="rounded-full bg-danger-tint px-[7px] py-[1px] text-caption font-[620] text-danger">
                            {tasks.overdue} overdue
                        </span>
                    )}
                    <button
                        aria-label="New task"
                        className="ml-auto flex flex-none items-center justify-center border-none bg-transparent p-0 font-[inherit] text-faint hover:text-text2"
                        onClick={onCapture}
                        type="button"
                    >
                        <Plus size={14} />
                    </button>
                </div>
                {TASK_VIEWS.map((v) => {
                    // Board is a parent row: with one of the boards under it
                    // open, that row carries the selection instead, so the two
                    // are never lit at once.
                    const active =
                        mainView === 'tasks' &&
                        taskView === v.view &&
                        !(v.view === 'board' && boardId !== null);

                    return (
                        <button
                            aria-current={active ? 'page' : undefined}
                            className={rowClass(active)}
                            key={v.view}
                            onClick={() => setTaskView(v.view)}
                            type="button"
                        >
                            <span className="flex flex-none">
                                <Icon name={v.icon} />
                            </span>
                            <span className="flex-1">{v.label}</span>
                            {showCounts && (
                                <span
                                    className={
                                        v.countKey === 'today' && tasks.overdue > 0
                                            ? OVERDUE_COUNT
                                            : COUNT
                                    }
                                >
                                    {tasks[v.countKey]}
                                </span>
                            )}
                            {v.keys && <span className={KEY_CAP}>{v.keys}</span>}
                        </button>
                    );
                })}
                {/*
                 * One row per board: a board is a collection, and its columns
                 * are how that collection's tasks are laid out. The Board row
                 * above opens the overview, which lists these same boards with
                 * their progress; these are the shortcut straight into one.
                 */}
                <div
                    className={cn(
                        'ml-[9px] flex flex-col pl-[10px]',
                        // The same preference the nested collections read: one
                        // rail switched off and the other still drawn would be
                        // a sidebar arguing with itself.
                        rails && 'border-l border-border',
                    )}
                >
                    {projects.map((project) => {
                        const id = project.collectionId ?? UNFILED_BOARD;
                        const active =
                            mainView === 'tasks' && taskView === 'board' && boardId === id;

                        return (
                            <button
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    ROW_BASE,
                                    'text-body-lg',
                                    active
                                        ? 'bg-accent-tint font-[590] text-accent'
                                        : 'text-text2 hover:bg-hover',
                                )}
                                key={id}
                                onClick={() => openBoard(id)}
                                type="button"
                            >
                                <span
                                    className="h-[9px] w-[9px] flex-none rounded-xs"
                                    // The collection's own colour, which the user picks.
                                    style={{ background: project.color }}
                                />
                                <span className="flex-1 truncate">{project.name}</span>
                                {showCounts && <span className={COUNT}>{project.open}</span>}
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Saved searches — a named view, filters and query */}
            <SavedSearchesSection />

            {/* Collections (add / edit / remove) */}
            <CollectionsSection />

            {/* Tags */}
            <div className={SECTION_LABEL}>Tags</div>
            {tags.map((tag) => {
                const active = isViewActive(view, 'tag', tag.name);

                return (
                    <button
                        aria-current={active ? 'page' : undefined}
                        className={rowClass(active)}
                        key={tag.name}
                        onClick={() => selectView('tag', tag.name)}
                        type="button"
                    >
                        <span className="flex flex-none opacity-60">
                            <Icon name="tag" />
                        </span>
                        <span className="flex-1">{tag.name}</span>
                        {showCounts && <span className={COUNT}>{tag.count}</span>}
                    </button>
                );
            })}

            <div className="min-h-4 flex-1" />

            {/* Footer */}
            <button className={FOOTER_ROW} onClick={toggleChat} type="button">
                <span className="flex flex-none text-accent">
                    <Message />
                </span>
                Ask Lore
                <span className="ml-auto rounded-5 bg-accent-tint px-[6px] py-[1px] text-caption font-semibold text-accent">
                    AI
                </span>
            </button>
            <button className={FOOTER_ROW} onClick={() => openSettings()} type="button">
                <span className="flex flex-none">
                    <Settings />
                </span>
                Settings
            </button>
        </div>
    );
}
