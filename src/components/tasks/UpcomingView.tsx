// Upcoming: the next few days as columns, each holding the tasks due on it.
// Only dated, open tasks appear — an undated task has no day to sit in.

import { cn } from '../../lib/cn';
import { UPCOMING_DAYS, upcomingDays } from '../../store/tasks';
import { useStore } from '../../store/useStore';
import { EmptyState } from '../common/EmptyState';
import { TaskCard } from './TaskCard';

export function UpcomingView({ from, today }: { from: Date; today: string }) {
    const items = useStore((s) => s.items);
    const collections = useStore((s) => s.collections);
    const selectTask = useStore((s) => s.selectTask);
    const openCapture = useStore((s) => s.openCapture);

    const days = upcomingDays(items, from, UPCOMING_DAYS);

    // Five empty columns say nothing; the columns are only worth drawing once
    // at least one of them has a task to hold.
    if (days.every((day) => day.tasks.length === 0)) {
        return (
            <div className="flex-1 overflow-auto">
                <EmptyState
                    action={{ label: 'Add a task', onClick: openCapture }}
                    hint={`Nothing is due in the next ${UPCOMING_DAYS} days. A task shows up here once it has a due date.`}
                    icon="calendar"
                    title="The week is clear"
                />
            </div>
        );
    }

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
                                /* The same face the board draws, in the same
                                   frame: a task must not look like two different
                                   things depending on which tab found it. */
                                <button
                                    className="block w-full rounded-11 border border-border bg-surface px-[13px] py-3 text-left font-[inherit] hover:border-accent-border"
                                    key={task.id}
                                    onClick={() => selectTask(task.id)}
                                    type="button"
                                >
                                    <TaskCard
                                        collections={collections}
                                        item={task}
                                        showProject
                                        today={today}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
