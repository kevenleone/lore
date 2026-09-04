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
import { startOfDay } from '../../lib/focusTimer';
import { useStore } from '../../store/useStore';
import { ChevronRight, Plus } from '../common/glyphs';
import { Segmented } from '../settings/controls';
import { CALENDAR_ACCOUNTS } from '../settings/settingsData';
import {
    dropTarget,
    eventBlock,
    monthCell,
    toolbarButton,
    unscheduledCard,
} from './CalendarView.css';

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
        <div
            style={{
                background: 'var(--surface, #fff)',
                display: 'flex',
                flex: 1,
                flexDirection: 'column',
                minWidth: 0,
            }}
        >
            <div
                style={{
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border, #ececef)',
                    display: 'flex',
                    flex: 'none',
                    gap: 12,
                    height: 46,
                    padding: '0 14px',
                }}
            >
                <span style={{ fontSize: 15, fontWeight: 680, letterSpacing: '-.01em' }}>
                    {anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </span>
                <span style={{ display: 'flex', gap: 4 }}>
                    <button
                        aria-label="Previous"
                        className={toolbarButton}
                        onClick={() => step(-1)}
                        type="button"
                    >
                        <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} sw={2.2} />
                    </button>
                    <button
                        aria-label="Next"
                        className={toolbarButton}
                        onClick={() => step(1)}
                        type="button"
                    >
                        <ChevronRight size={14} sw={2.2} />
                    </button>
                </span>
                <button
                    onClick={() => setAnchor(startOfDay(new Date()))}
                    style={{
                        background: 'transparent',
                        border: '1px solid var(--border, #e4e4ea)',
                        borderRadius: 8,
                        color: 'var(--text2, #6b6b76)',
                        cursor: 'pointer',
                        font: 'inherit',
                        fontSize: 12.5,
                        padding: '5px 11px',
                    }}
                    type="button"
                >
                    Today
                </button>
                <div
                    style={{
                        alignItems: 'center',
                        display: 'flex',
                        gap: 10,
                        marginLeft: 'auto',
                    }}
                >
                    <Segmented onChange={setScale} options={SCALES} value={scale} />
                    <button
                        onClick={onCapture}
                        style={{
                            alignItems: 'center',
                            background: 'var(--ac)',
                            border: 'none',
                            borderRadius: 8,
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            font: 'inherit',
                            fontSize: 12.5,
                            fontWeight: 600,
                            gap: 7,
                            padding: '6px 11px',
                        }}
                        type="button"
                    >
                        <Plus />
                        Capture
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
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
        <div
            style={{
                background: 'var(--surface2, #fafafa)',
                borderRight: '1px solid var(--border, #ececef)',
                display: 'flex',
                flex: 'none',
                flexDirection: 'column',
                gap: 18,
                overflow: 'auto',
                padding: '14px 12px',
                width: 216,
            }}
        >
            <div>
                <RailLabel>Calendars</RailLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {switches.showTasks && (
                        <LegendRow color="var(--type-task-fg, #4d855f)" name="Captured tasks" />
                    )}
                    {switches.showFocus && <LegendRow color="var(--ac)" name="Focus sessions" />}
                    {connected.map((a) => (
                        <LegendRow color={a.color} key={a.key} muted name={a.name} />
                    ))}
                </div>
                {connected.length > 0 && (
                    <div
                        style={{
                            color: 'var(--text3, #9a9aa5)',
                            fontSize: 11.5,
                            lineHeight: 1.5,
                            marginTop: 10,
                        }}
                    >
                        Connected accounts aren’t syncing yet — nothing from them is drawn.
                    </div>
                )}
            </div>

            <div>
                <RailLabel>Unscheduled tasks</RailLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {unscheduled.map((item) => (
                        <div
                            className={unscheduledCard}
                            draggable
                            key={item.id}
                            onDragStart={(e) => {
                                e.dataTransfer.setData(DRAG_TYPE, item.id);
                                e.dataTransfer.effectAllowed = 'move';
                            }}
                        >
                            <span
                                style={{
                                    background: 'var(--type-task-fg, #4d855f)',
                                    borderRadius: '50%',
                                    flex: 'none',
                                    height: 8,
                                    marginTop: 4,
                                    width: 8,
                                }}
                            />
                            <span
                                style={{
                                    color: 'var(--text2, #3b3b44)',
                                    flex: 1,
                                    fontSize: 12,
                                    lineHeight: 1.4,
                                    minWidth: 0,
                                }}
                            >
                                {item.title}
                            </span>
                        </div>
                    ))}
                </div>
                <div
                    style={{
                        color: 'var(--text3, #9a9aa5)',
                        fontSize: 11.5,
                        lineHeight: 1.5,
                        marginTop: 10,
                    }}
                >
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
            className={eventBlock}
            onClick={onOpen}
            onDoubleClick={onUnschedule}
            style={{
                alignItems: compact ? 'center' : undefined,
                background: focus
                    ? 'repeating-linear-gradient(45deg, var(--ac-tint, #eeeef2), var(--ac-tint, #eeeef2) 6px, transparent 6px, transparent 12px)'
                    : 'var(--type-task-bg, #e8f2ec)',
                borderLeft: `2.5px solid ${focus ? 'var(--ac)' : 'var(--type-task-fg, #4d855f)'}`,
                flexDirection: compact ? 'row' : 'column',
                gap: compact ? 6 : 2,
                height,
                padding: compact ? '2px 8px' : '6px 8px',
                top,
            }}
            title={event.kind === 'task' ? 'Click to open · double-click to unschedule' : undefined}
        >
            <span
                style={{
                    color: focus ? 'var(--text2, #3b3b44)' : 'var(--type-task-fg, #4d855f)',
                    fontSize: 11.5,
                    fontWeight: 640,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {event.title}
            </span>
            <span
                style={{
                    color: focus ? 'var(--text2, #3b3b44)' : 'var(--type-task-fg, #4d855f)',
                    flex: 'none',
                    fontSize: 10.5,
                    fontVariantNumeric: 'tabular-nums',
                    opacity: 0.72,
                    whiteSpace: 'nowrap',
                }}
            >
                {event.time}
            </span>
        </div>
    );
}

function LegendRow({ color, muted, name }: { color: string; muted?: boolean; name: string }) {
    return (
        <div
            style={{
                alignItems: 'center',
                color: 'var(--text2, #3b3b44)',
                display: 'flex',
                fontSize: 12.5,
                gap: 9,
                opacity: muted ? 0.55 : 1,
            }}
        >
            <span
                style={{
                    background: color,
                    borderRadius: 3,
                    flex: 'none',
                    height: 11,
                    width: 11,
                }}
            />
            <span style={{ flex: 1, minWidth: 0 }}>{name}</span>
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
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0 }}>
            <div style={{ borderBottom: '1px solid var(--border, #ececef)', display: 'flex' }}>
                {cells.slice(0, 7).map((day) => (
                    <div
                        key={day.toISOString()}
                        style={{
                            borderLeft: '1px solid var(--border, #ececef)',
                            color: 'var(--text3, #9a9aa5)',
                            flex: 1,
                            fontSize: 11.5,
                            fontWeight: 640,
                            letterSpacing: '.05em',
                            minWidth: 0,
                            padding: '9px 10px',
                            textTransform: 'uppercase',
                        }}
                    >
                        {day.toLocaleDateString(undefined, { weekday: 'short' })}
                    </div>
                ))}
            </div>
            <div
                style={{
                    display: 'grid',
                    flex: 1,
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gridTemplateRows: 'repeat(6, 1fr)',
                    minHeight: 0,
                    overflow: 'auto',
                }}
            >
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
                            className={monthCell}
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
                            style={outside ? { opacity: 0.45 } : undefined}
                        >
                            <span
                                style={{
                                    fontSize: 12,
                                    fontVariantNumeric: 'tabular-nums',
                                    fontWeight: isSameDay(day, today) ? 700 : 560,
                                    ...(isSameDay(day, today) ? { color: 'var(--ac)' } : null),
                                }}
                            >
                                {day.getDate()}
                            </span>
                            {events.slice(0, 3).map((event) => (
                                <span
                                    key={event.id}
                                    onClick={() => event.itemId && selectItem(event.itemId)}
                                    style={{
                                        background:
                                            event.kind === 'focus'
                                                ? 'var(--ac-tint, #eeeef2)'
                                                : 'var(--type-task-bg, #e8f2ec)',
                                        borderRadius: 5,
                                        color:
                                            event.kind === 'focus'
                                                ? 'var(--ac)'
                                                : 'var(--type-task-fg, #4d855f)',
                                        cursor: 'pointer',
                                        fontSize: 10.5,
                                        fontWeight: 600,
                                        lineHeight: 1.3,
                                        overflow: 'hidden',
                                        padding: '3px 6px',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {event.title}
                                </span>
                            ))}
                            {events.length > 3 && (
                                <span style={{ color: 'var(--text3, #9a9aa5)', fontSize: 10.5 }}>
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
        <div
            style={{
                color: 'var(--faint, #a8a8b0)',
                fontSize: 10.5,
                fontWeight: 680,
                letterSpacing: '.07em',
                marginBottom: 9,
                textTransform: 'uppercase',
            }}
        >
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
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0 }}>
            <div style={{ borderBottom: '1px solid var(--border, #ececef)', display: 'flex' }}>
                <span style={{ flex: 'none', width: 56 }} />
                {days.map((day) => {
                    const isToday = isSameDay(day, today);
                    return (
                        <div
                            key={day.toISOString()}
                            style={{
                                alignItems: 'baseline',
                                borderLeft: '1px solid var(--border, #ececef)',
                                display: 'flex',
                                flex: 1,
                                gap: 7,
                                minWidth: 0,
                                padding: '10px 10px 9px',
                            }}
                        >
                            <span
                                style={{
                                    color: 'var(--text3, #9a9aa5)',
                                    fontSize: 11.5,
                                    fontWeight: 640,
                                    letterSpacing: '.05em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {day.toLocaleDateString(undefined, { weekday: 'short' })}
                            </span>
                            <span
                                style={{
                                    fontSize: 15,
                                    fontWeight: isToday ? 700 : 600,
                                    letterSpacing: '-.01em',
                                    ...(isToday
                                        ? {
                                              background: 'var(--ac)',
                                              borderRadius: 7,
                                              color: '#fff',
                                              padding: '1px 7px',
                                          }
                                        : { color: 'var(--text, #1a1a1f)' }),
                                }}
                            >
                                {String(day.getDate()).padStart(2, '0')}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
                <div style={{ display: 'flex', minHeight: '100%' }}>
                    <div style={{ flex: 'none', width: 56 }}>
                        {HOUR_LABELS.map((label) => (
                            <div
                                key={label}
                                style={{
                                    display: 'flex',
                                    height: HOUR_HEIGHT,
                                    justifyContent: 'flex-end',
                                    paddingRight: 9,
                                }}
                            >
                                <span
                                    style={{
                                        color: 'var(--faint, #a8a8b0)',
                                        fontSize: 10.5,
                                        fontVariantNumeric: 'tabular-nums',
                                        transform: 'translateY(-6px)',
                                    }}
                                >
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
                                className={over === index ? dropTarget : undefined}
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
                                style={{
                                    borderLeft: '1px solid var(--border, #ececef)',
                                    flex: 1,
                                    minWidth: 0,
                                    position: 'relative',
                                    ...(isToday && over !== index
                                        ? { background: 'var(--sel, #fafafa)' }
                                        : null),
                                }}
                            >
                                {HOUR_LABELS.map((label) => (
                                    <div
                                        key={label}
                                        style={{
                                            borderBottom: '1px solid var(--border-soft, #f4f4f6)',
                                            height: HOUR_HEIGHT,
                                        }}
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
                                        style={{
                                            borderTop: '1.5px solid #c4553d',
                                            left: 0,
                                            position: 'absolute',
                                            right: 0,
                                            top: nowOffset,
                                            zIndex: 6,
                                        }}
                                    >
                                        <span
                                            style={{
                                                background: '#c4553d',
                                                borderRadius: '50%',
                                                height: 8,
                                                left: -4,
                                                position: 'absolute',
                                                top: -4,
                                                width: 8,
                                            }}
                                        />
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
