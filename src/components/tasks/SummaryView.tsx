// Summary: what needs attention now — late, due today, and whatever was pulled
// into the focus queue without a date — and under it the whole history, every
// task including the finished ones. The grouping rules are all in
// `store/tasks.ts`.

import type { Item } from '../../store/types';

import { cn } from '../../lib/cn';
import { taskGroups } from '../../store/tasks';
import { useStore } from '../../store/useStore';
import { DuePill, PriorityChip, ProjectTag, TaskCheckbox, TitleText } from './TaskRow';
import { TaskTimeline } from './TaskTimeline';

export function SummaryView({ today }: { today: string }) {
    const items = useStore((state) => state.items);
    const collections = useStore((state) => state.collections);
    const selectedId = useStore((state) => state.selectedId);
    const selectTask = useStore((state) => state.selectTask);

    const groups = taskGroups(items, today).filter((taskGroup) => taskGroup.tasks.length > 0);

    return (
        <div className="flex-1 overflow-auto px-5 py-[18px]">
            {/*
             * Two named regions, because the same task can legitimately appear in
             * both: the top is the slice that needs attention now, the timeline
             * is everything. Without the names they are one undifferentiated run
             * of rows with duplicates in it.
             */}
            <section aria-label="Needs attention">
                {groups.length === 0 && (
                    <div className="rounded-xl border border-dashed border-dash px-[14px] py-4 text-body text-text3">
                        Nothing due today. Anything dated later is under Upcoming.
                    </div>
                )}
                {groups.map((group) => (
                    <div className="mb-[22px]" key={group.kind}>
                        <div className="flex items-center gap-[9px] px-[2px] pb-[9px]">
                            <span
                                className={cn(
                                    'text-caption font-[680] tracking-[.07em] uppercase',
                                    group.kind === 'overdue' ? 'text-danger' : 'text-faint',
                                )}
                            >
                                {group.label}
                            </span>
                            <span className="text-body-sm text-faint tabular-nums">
                                {group.tasks.length}
                            </span>
                            <span className="h-px flex-1 bg-border-soft" />
                        </div>
                        <div className="flex flex-col gap-[7px]">
                            {group.tasks.map((task) => (
                                <TaskListRow
                                    collections={collections}
                                    key={task.id}
                                    onSelect={() => selectTask(task.id)}
                                    selected={task.id === selectedId}
                                    task={task}
                                    today={today}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </section>

            <TaskTimeline today={today} />
        </div>
    );
}

function TaskListRow({
    collections,
    onSelect,
    selected,
    task,
    today,
}: {
    collections: ReturnType<typeof useStore.getState>['collections'];
    onSelect: () => void;
    selected: boolean;
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
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
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
                <TitleText item={task} />
                <span className="mt-[6px] flex flex-wrap items-center gap-[9px]">
                    <ProjectTag collections={collections} item={task} />
                    <DuePill item={task} today={today} />
                    <PriorityChip priority={task.priority} />
                </span>
            </span>
        </div>
    );
}
