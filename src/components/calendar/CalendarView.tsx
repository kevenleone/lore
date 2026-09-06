// `Lore Settings.dc.html` frame 1g — the calendar as a view in the knowledge-base
// window: a toolbar, a rail of unscheduled tasks, and a day/week/month grid
// carrying scheduled tasks and finished focus sessions.
//
// Connected calendar accounts have no backend behind them yet, so the legend
// names them and says so rather than drawing invented meetings. Everything the
// grid does draw is real: tasks the user placed, and sessions the timer ran.

import { useState } from 'react';

import type { CalendarEvent } from '../../lib/calendar';
import type { CalendarScale } from '../../store/types';

import {
    addDays,
    addMonths,
    blockGeometry,
    DAY_END_HOUR,
    DAY_START_HOUR,
    eventsForDay,
    HOUR_HEIGHT,
    HOUR_LABELS,
    isSameDay,
    monthGrid,
    timeAtOffset,
    weekDays,
} from '../../lib/calendar';
import { cn } from '../../lib/cn';
import { startOfDay } from '../../lib/focusTimer';
import { useStore } from '../../store/useStore';
import { ChevronRight, Plus } from '../common/glyphs';
import { CALENDAR_ACCOUNTS } from '../settings/calendarAccounts';
import { Segmented } from '../settings/controls';
/** Square icon button in the toolbar. */
const TOOLBAR_BUTTON =
    'inline-flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-7 border-none bg-surface3 p-0 font-[inherit] text-text2 hover:brightness-[.96]';

const MONTH_CELL =
    'flex min-h-0 min-w-0 flex-col gap-[3px] overflow-hidden border-t border-l border-border px-[7px] py-[6px]';

const SCALES: readonly CalendarScale[] = ['Day', 'Week', 'Month'] as const;
const GRID_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT;
const DRAG_TYPE = 'application/x-lore-item';

export function CalendarView({ onCapture }: { onCapture: () => void }) {
    const [scale, setScale] = useState<CalendarScale>('Week');
    const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
    const weekStart = useStore((s) => s.prefs.weekStart);

    const days =
        scale === 'Day' ? [anchor] : scale === 'Week' ? weekDays(anchor, weekStart) : [anchor];

    const step = (direction: -1 | 1) => {
        if (scale === 'Month') setAnchor(addMonths(anchor, direction));
        else setAnchor(addDays(anchor, direction * (scale === 'Week' ? 7 : 1)));
    };

    return (
        <div className="flex min-w-0 flex-1 flex-col bg-surface">
            <div className="flex h-[46px] flex-none items-center gap-3 border-b border-border px-[14px]">
                <span className="text-title-lg font-[680] tracking-[-.01em]">
                    {anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </span>
                <span className="flex gap-1">
                    <button
                        aria-label="Previous"
                        className={TOOLBAR_BUTTON}
                        onClick={() => step(-1)}
                        type="button"
                    >
                        <ChevronRight className="[transform:rotate(180deg)]" size={14} sw={2.2} />
                    </button>
                    <button
                        aria-label="Next"
                        className={TOOLBAR_BUTTON}
                        onClick={() => step(1)}
                        type="button"
                    >
                        <ChevronRight size={14} sw={2.2} />
                    </button>
                </span>
                <button
                    className="cursor-pointer rounded-lg border border-border bg-transparent px-[11px] py-[5px] font-[inherit] text-body text-text2"
                    onClick={() => setAnchor(startOfDay(new Date()))}
                    type="button"
                >
                    Today
                </button>
                <div className="ml-auto flex items-center gap-[10px]">
                    <Segmented onChange={setScale} options={SCALES} value={scale} />
                    <button
                        className="inline-flex cursor-pointer items-center gap-[7px] rounded-lg border-none bg-accent px-[11px] py-[6px] font-[inherit] text-body font-semibold text-white"
                        onClick={onCapture}
                        type="button"
                    >
                        <Plus />
                        Capture
                    </button>
                </div>
            </div>

            <div className="flex min-h-0 flex-1">
                <CalendarRail />
                {scale === 'Month' ? <MonthGrid anchor={anchor} /> : <TimeGrid days={days} />}
            </div>
        </div>
    );
}

/** Calendars legend + the tasks that have not been given a time yet. */
function CalendarRail() {
    const items = useStore((s) => s.items);
    const schedule = useStore((s) => s.schedule);
    const switches = useStore((s) => s.prefs.switches);

    const connected = CALENDAR_ACCOUNTS.filter((a) => switches[a.key]);
    const unscheduled = items.filter((i) => i.type === 'task' && !schedule[i.id]);

    return (
        <div className="flex w-[216px] flex-none flex-col gap-[18px] overflow-auto border-r border-border bg-surface2 px-3 py-[14px]">
            <div>
                <RailLabel>Calendars</RailLabel>
                <div className="flex flex-col gap-2">
                    {switches.showTasks && (
                        <LegendRow color="var(--type-task-fg, #4d855f)" name="Captured tasks" />
                    )}
                    {switches.showFocus && <LegendRow color="var(--ac)" name="Focus sessions" />}
                    {connected.map((a) => (
                        <LegendRow color={a.color} key={a.key} muted name={a.name} />
                    ))}
                </div>
                {connected.length > 0 && (
                    <div className="mt-[10px] text-label leading-[1.5] text-text3">
                        Connected accounts aren’t syncing yet — nothing from them is drawn.
                    </div>
                )}
            </div>

            <div>
                <RailLabel>Unscheduled tasks</RailLabel>
                <div className="flex flex-col gap-[6px]">
                    {unscheduled.map((item) => (
                        <div
                            className="flex cursor-grab items-start gap-2 rounded-9 border border-border bg-surface px-[9px] py-2 hover:border-accent-border active:cursor-grabbing"
                            draggable
                            key={item.id}
                            onDragStart={(e) => {
                                e.dataTransfer.setData(DRAG_TYPE, item.id);
                                e.dataTransfer.effectAllowed = 'move';
                            }}
                        >
                            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-type-task-fg" />
                            <span className="min-w-0 flex-1 text-body-sm leading-[1.4] text-text2">
                                {item.title}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="mt-[10px] text-label leading-[1.5] text-text3">
                    {unscheduled.length > 0
                        ? 'Drag one onto the week to give it a time.'
                        : 'Every task has a time. Drag one off the grid to unschedule it.'}
                </div>
            </div>
        </div>
    );
}

function EventBlock({
    event,
    onOpen,
    onUnschedule,
}: {
    event: CalendarEvent;
    onOpen: () => void;
    onUnschedule: () => void;
}) {
    const { height, top } = blockGeometry(event);
    const compact = height <= 30;
    const focus = event.kind === 'focus';

    return (
        <div
            className={cn(
                'absolute right-1 left-1 z-4 flex cursor-pointer overflow-hidden rounded-lg border-l-[2.5px] hover:brightness-[.97]',
                focus
                    ? 'border-l-accent bg-[repeating-linear-gradient(45deg,var(--ac-tint),var(--ac-tint)_6px,transparent_6px,transparent_12px)]'
                    : 'border-l-type-task-fg bg-type-task-bg',
                compact
                    ? 'flex-row items-center gap-[6px] px-2 py-[2px]'
                    : 'flex-col gap-[2px] px-2 py-[6px]',
            )}
            onClick={onOpen}
            onDoubleClick={onUnschedule}
            // Geometry comes from the event's own time and duration.
            style={{ height, top }}
            title={event.kind === 'task' ? 'Click to open · double-click to unschedule' : undefined}
        >
            <span
                className={cn(
                    'truncate text-label leading-[1.3] font-[640]',
                    focus ? 'text-text2' : 'text-type-task-fg',
                )}
            >
                {event.title}
            </span>
            <span
                className={cn(
                    'flex-none text-micro whitespace-nowrap tabular-nums opacity-72',
                    focus ? 'text-text2' : 'text-type-task-fg',
                )}
            >
                {event.time}
            </span>
        </div>
    );
}

function LegendRow({ color, muted, name }: { color: string; muted?: boolean; name: string }) {
    return (
        <div
            className={cn(
                'flex items-center gap-[9px] text-body text-text2',
                muted ? 'opacity-55' : 'opacity-100',
            )}
        >
            <span
                className="h-[11px] w-[11px] flex-none rounded-[3px]"
                // The calendar's own colour, as the provider reports it.
                style={{ background: color }}
            />
            <span className="min-w-0 flex-1">{name}</span>
        </div>
    );
}

/** Month view: whole weeks of cells, each listing that day's blocks as chips. */
function MonthGrid({ anchor }: { anchor: Date }) {
    const items = useStore((s) => s.items);
    const schedule = useStore((s) => s.schedule);
    const scheduleItem = useStore((s) => s.scheduleItem);
    const selectItem = useStore((s) => s.selectItem);
    const sessions = useStore((s) => s.focusSessions);
    const switches = useStore((s) => s.prefs.switches);
    const weekStart = useStore((s) => s.prefs.weekStart);

    const cells = monthGrid(anchor, weekStart);
    const today = new Date();

    return (
        <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex border-b border-border">
                {cells.slice(0, 7).map((day) => (
                    <div
                        className="min-w-0 flex-1 border-l border-border px-[10px] py-[9px] text-label font-[640] tracking-[.05em] text-text3 uppercase"
                        key={day.toISOString()}
                    >
                        {day.toLocaleDateString(undefined, { weekday: 'short' })}
                    </div>
                ))}
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-auto">
                {cells.map((day) => {
                    const events = eventsForDay({
                        day,
                        items,
                        schedule,
                        sessions,
                        showFocus: switches.showFocus,
                        showTasks: switches.showTasks,
                    });
                    const outside = day.getMonth() !== anchor.getMonth();
                    return (
                        <div
                            className={cn(MONTH_CELL, outside && 'opacity-45')}
                            key={day.toISOString()}
                            onDragOver={(e) => {
                                if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
                                e.preventDefault();
                            }}
                            onDrop={(e) => {
                                const id = e.dataTransfer.getData(DRAG_TYPE);
                                if (!id) return;
                                e.preventDefault();
                                // A month cell has no time in it, so a drop lands at the
                                // start of the working day.
                                const at = startOfDay(day);
                                at.setHours(DAY_START_HOUR);
                                scheduleItem(id, at);
                            }}
                        >
                            <span
                                className={cn(
                                    'text-body-sm tabular-nums',
                                    isSameDay(day, today) ? 'font-bold text-accent' : 'font-[560]',
                                )}
                            >
                                {day.getDate()}
                            </span>
                            {events.slice(0, 3).map((event) => (
                                <span
                                    className={cn(
                                        'cursor-pointer truncate rounded-5 px-[6px] py-[3px] text-micro leading-[1.3] font-semibold',
                                        event.kind === 'focus'
                                            ? 'bg-accent-tint text-accent'
                                            : 'bg-type-task-bg text-type-task-fg',
                                    )}
                                    key={event.id}
                                    onClick={() => event.itemId && selectItem(event.itemId)}
                                >
                                    {event.title}
                                </span>
                            ))}
                            {events.length > 3 && (
                                <span className="text-micro text-text3">
                                    +{events.length - 3} more
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function RailLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-[9px] text-micro font-[680] tracking-[.07em] text-faint uppercase">
            {children}
        </div>
    );
}

/** The day / week grid: an hour gutter and one absolutely-positioned column per day. */
function TimeGrid({ days }: { days: Date[] }) {
    const items = useStore((s) => s.items);
    const schedule = useStore((s) => s.schedule);
    const scheduleItem = useStore((s) => s.scheduleItem);
    const selectItem = useStore((s) => s.selectItem);
    const sessions = useStore((s) => s.focusSessions);
    const switches = useStore((s) => s.prefs.switches);
    const [over, setOver] = useState<null | number>(null);

    // Opening a block means opening the item behind it, which lives in the library.
    const open = (id: null | string) => id && selectItem(id);

    const today = new Date();
    const nowOffset =
        (today.getHours() * 60 + today.getMinutes() - DAY_START_HOUR * 60) * (HOUR_HEIGHT / 60);

    return (
        <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex border-b border-border">
                <span className="w-[56px] flex-none" />
                {days.map((day) => {
                    const isToday = isSameDay(day, today);
                    return (
                        <div
                            className="flex min-w-0 flex-1 items-baseline gap-[7px] border-l border-border px-[10px] pt-[10px] pb-[9px]"
                            key={day.toISOString()}
                        >
                            <span className="text-label font-[640] tracking-[.05em] text-text3 uppercase">
                                {day.toLocaleDateString(undefined, { weekday: 'short' })}
                            </span>
                            <span
                                className={cn(
                                    'text-title-lg tracking-[-.01em]',
                                    isToday
                                        ? 'rounded-7 bg-accent px-[7px] py-px font-bold text-white'
                                        : 'font-semibold text-text',
                                )}
                            >
                                {String(day.getDate()).padStart(2, '0')}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="flex-1 overflow-auto">
                <div className="flex min-h-full">
                    <div className="w-[56px] flex-none">
                        {HOUR_LABELS.map((label) => (
                            <div
                                className="flex justify-end pr-[9px]"
                                key={label}
                                // The row height is the grid's scale constant.
                                style={{ height: HOUR_HEIGHT }}
                            >
                                <span className="[transform:translateY(-6px)] text-micro text-faint tabular-nums">
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>

                    {days.map((day, index) => {
                        const isToday = isSameDay(day, today);
                        const events = eventsForDay({
                            day,
                            items,
                            schedule,
                            sessions,
                            showFocus: switches.showFocus,
                            showTasks: switches.showTasks,
                        });
                        return (
                            <div
                                className={cn(
                                    'relative min-w-0 flex-1 border-l border-border',
                                    over === index && 'bg-accent-tint',
                                    isToday && over !== index && 'bg-sel',
                                )}
                                key={day.toISOString()}
                                onDragLeave={() => setOver((o) => (o === index ? null : o))}
                                onDragOver={(e) => {
                                    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    setOver(index);
                                }}
                                onDrop={(e) => {
                                    const id = e.dataTransfer.getData(DRAG_TYPE);
                                    setOver(null);
                                    if (!id) return;
                                    e.preventDefault();
                                    const box = e.currentTarget.getBoundingClientRect();
                                    scheduleItem(id, timeAtOffset(day, e.clientY - box.top));
                                }}
                            >
                                {HOUR_LABELS.map((label) => (
                                    <div
                                        className="border-b border-border-soft"
                                        key={label}
                                        style={{ height: HOUR_HEIGHT }}
                                    />
                                ))}
                                {events.map((event) => (
                                    <EventBlock
                                        event={event}
                                        key={event.id}
                                        onOpen={() => open(event.itemId)}
                                        onUnschedule={() =>
                                            event.itemId &&
                                            event.kind === 'task' &&
                                            scheduleItem(event.itemId, null)
                                        }
                                    />
                                ))}
                                {isToday && nowOffset >= 0 && nowOffset <= GRID_HEIGHT && (
                                    <div
                                        className="absolute right-0 left-0 z-6 border-t-[1.5px] border-t-[#c4553d]"
                                        // Positioned at the current time.
                                        style={{ top: nowOffset }}
                                    >
                                        <span className="absolute top-[-4px] left-[-4px] h-2 w-2 rounded-full bg-[#c4553d]" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
