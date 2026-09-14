// Upcoming: the next few days as columns, each holding the tasks due on it.
// Only dated, open tasks appear — an undated task has no day to sit in.

import { cn } from '../../lib/cn';
import { UPCOMING_DAYS, upcomingDays } from '../../store/tasks';
import { useStore } from '../../store/useStore';
import { PriorityChip, ProjectTag, TaskCheckbox, TitleText } from './TaskRow';

export function UpcomingView({ from }: { from: Date }) {
    const items = useStore((s) => s.items);
    const collections = useStore((s) => s.collections);
    const selectTask = useStore((s) => s.selectTask);

    const days = upcomingDays(items, from, UPCOMING_DAYS);

    return (
        <div className="flex-1 overflow-auto px-5 py-[18px]">
            <div className="flex items-stretch gap-3">
                {days.map((day) => (
                    <div
                        className={cn(
                            'min-w-0 flex-1 rounded-xl border p-3',
                            day.isToday ? 'border-accent-border bg-surface2' : 'border-border',
                        )}
                        key={day.key}
                    >
                        <div className="flex items-baseline gap-[7px] px-[2px] pb-[10px]">
                            <span
                                className={cn(
                                    'text-body-lg',
                                    day.isToday
                                        ? 'font-[680] text-accent'
                                        : 'font-[560] text-text2',
                                )}
                            >
                                {day.date.toLocaleDateString(undefined, { weekday: 'short' })}
                            </span>
                            <span className="text-label text-faint tabular-nums">
                                {day.date.getDate()}
                            </span>
                            <span className="ml-auto text-label text-faint tabular-nums">
                                {day.tasks.length || ''}
                            </span>
                        </div>
                        <div className="flex flex-col gap-[7px]">
                            {day.tasks.map((task) => (
                                <button
                                    className="rounded-11 border border-border bg-surface px-3 py-[11px] text-left font-[inherit] hover:border-accent-border"
                                    key={task.id}
                                    onClick={() => selectTask(task.id)}
                                    type="button"
                                >
                                    <span className="flex items-start gap-2">
                                        <TaskCheckbox item={task} size={15} />
                                        <span className="min-w-0 flex-1">
                                            <TitleText item={task} />
                                        </span>
                                    </span>
                                    <span className="mt-2 flex items-center gap-[6px]">
                                        <ProjectTag collections={collections} item={task} />
                                        <PriorityChip priority={task.priority} />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
