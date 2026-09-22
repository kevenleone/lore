// Every task, finished ones included, down a single thread: what is still open,
// then each day something was completed, newest first.
//
// The date is `completedAt`, stamped when a task is ticked off — not
// `updatedAt`, which is the file's last write and would move a task up the
// timeline every time its wording was fixed months later.

import type { Item } from '../../store/types';

import { formatTime } from '../../lib/calendar';
import { cn } from '../../lib/cn';
import { taskTimeline } from '../../store/tasks';
import { useStore } from '../../store/useStore';
import { DuePill, PriorityChip, ProjectTag, TaskCheckbox, TitleText } from './TaskRow';

export function TaskTimeline({ today }: { today: string }) {
    const items = useStore((s) => s.items);
    const collections = useStore((s) => s.collections);
    const selectTask = useStore((s) => s.selectTask);
    const selectedId = useStore((s) => s.selectedId);

    const groups = taskTimeline(items, today);

    if (groups.length === 0) {
        return null;
    }

    return (
        <section aria-label="Timeline" className="mt-[30px] border-t border-border-soft pt-[18px]">
            <div className="px-[2px] pb-[14px]">
                <span className="text-caption font-[680] tracking-[.07em] text-faint uppercase">
                    Timeline
                </span>
                <span className="ml-2 text-body text-text3">Everything, finished or not</span>
            </div>

            {groups.map((group) => (
                <div className="relative pb-[18px] pl-[22px]" key={group.key}>
                    {/*
                     * The thread. Drawn per group rather than once behind them
                     * all so the last group's line stops at its last row instead
                     * of running on into the padding.
                     */}
                    <span
                        aria-hidden
                        className="absolute top-[7px] bottom-0 left-[4px] w-px bg-border"
                    />
                    <span
                        aria-hidden
                        className={cn(
                            'absolute top-[5px] left-0 h-[9px] w-[9px] rounded-full border-2',
                            group.key === 'open'
                                ? 'border-accent bg-surface'
                                : 'border-transparent bg-border',
                        )}
                    />

                    <div className="flex items-baseline gap-2 pb-[9px]">
                        <span className="text-body-lg font-[620] text-text">{group.label}</span>
                        <span className="text-label text-faint tabular-nums">
                            {group.tasks.length}
                        </span>
                    </div>

                    <div className="flex flex-col gap-[6px]">
                        {group.tasks.map((task) => (
                            <TimelineRow
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
    );
}

function TimelineRow({
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
                'flex cursor-pointer items-center gap-[10px] rounded-10 border px-[12px] py-[9px]',
                selected
                    ? 'border-accent bg-surface2'
                    : 'border-transparent hover:border-border hover:bg-surface2',
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
            {/*
             * The history is where a finished task is looked at, so it has to
             * be where one can be reopened too — otherwise the only way back is
             * to find the card again on its board.
             */}
            <span className="flex flex-none">
                <TaskCheckbox item={task} size={17} />
            </span>
            <span className="min-w-0 flex-1">
                <TitleText item={task} />
                <span className="mt-[5px] flex flex-wrap items-center gap-[8px]">
                    <ProjectTag collections={collections} item={task} />
                    {!task.flags.done && <DuePill item={task} today={today} />}
                    <PriorityChip priority={task.priority} />
                </span>
            </span>
            {/*
             * The time, not the day: the group heading already says which day,
             * and a row repeating it adds nothing a reader did not just read.
             */}
            {task.completedAt && (
                <span className="flex-none text-label text-faint tabular-nums">
                    {formatTime(task.completedAt)}
                </span>
            )}
        </div>
    );
}
