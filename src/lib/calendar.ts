// Date arithmetic and event assembly for the calendar view
// (`Lore Settings.dc.html` frame 1g). Pure — it takes items, focus sessions and
// the schedule map and returns positioned blocks, so the component only lays out.

import type { FocusSession, Item, WeekStart } from '../store/types';

import { startOfDay } from './focusTimer';

/** First and last hour rows drawn in the day/week grid. */
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 19;
/** Pixel height of one hour row; the grid's whole geometry derives from it. */
export const HOUR_HEIGHT = 56;

export const HOUR_LABELS = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR },
    (_, i) => `${String(DAY_START_HOUR + i).padStart(2, '0')}:00`,
);

export interface CalendarEvent {
    /** Minutes from midnight. */
    endMinutes: number;
    id: string;
    /** The item this block came from, so clicking it can select the item. */
    itemId: null | string;
    kind: CalendarEventKind;
    startMinutes: number;
    time: string;
    title: string;
}

export type CalendarEventKind = 'focus' | 'task';

export function addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
}

export function addMonths(date: Date, months: number): Date {
    const copy = new Date(date);
    // Clamp to the 1st first: adding a month to the 31st would otherwise skip
    // a month entirely (31 Mar + 1 month = 1 May).
    copy.setDate(1);
    copy.setMonth(copy.getMonth() + months);
    return copy;
}

/** Top offset and height in px for a block, clipped to the drawn hour range. */
export function blockGeometry(event: CalendarEvent): { height: number; top: number } {
    const gridStart = DAY_START_HOUR * 60;
    const gridEnd = DAY_END_HOUR * 60;
    const start = Math.min(Math.max(event.startMinutes, gridStart), gridEnd);
    const end = Math.min(Math.max(event.endMinutes, start), gridEnd);
    const perMinute = HOUR_HEIGHT / 60;
    return {
        height: Math.max((end - start) * perMinute - 3, 22),
        top: (start - gridStart) * perMinute,
    };
}

/**
 * Every block that belongs on `day`, sorted by start time.
 *
 * `schedule` maps an item id to the ISO time it was dragged onto — the calendar
 * is the only thing that writes it, so an unscheduled task simply has no entry.
 */
export function eventsForDay({
    day,
    items,
    schedule,
    sessions,
    showFocus,
    showTasks,
}: {
    day: Date;
    items: Item[];
    schedule: Record<string, string>;
    sessions: FocusSession[];
    showFocus: boolean;
    showTasks: boolean;
}): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    if (showTasks) {
        for (const item of items) {
            const at = schedule[item.id];
            if (!at || !isSameDay(new Date(at), day)) continue;
            const start = minutesOfDay(at);
            events.push({
                endMinutes: start + 30,
                id: `task:${item.id}`,
                itemId: item.id,
                kind: 'task',
                startMinutes: start,
                time: formatTime(at),
                title: item.title,
            });
        }
    }

    if (showFocus) {
        for (const session of sessions) {
            if (!isSameDay(new Date(session.startedAt), day)) continue;
            const start = minutesOfDay(session.startedAt);
            const end = minutesOfDay(session.endedAt);
            const task = session.taskId ? items.find((i) => i.id === session.taskId) : undefined;
            events.push({
                // A session that ran past midnight would come back with an end
                // before its start; clamp it to the end of the day instead.
                endMinutes: end > start ? end : DAY_END_HOUR * 60,
                id: `focus:${session.id}`,
                itemId: session.taskId,
                kind: 'focus',
                startMinutes: start,
                time: `${formatTime(session.startedAt)} – ${formatTime(session.endedAt)}`,
                title: task ? `Focus · ${task.title}` : 'Focus session',
            });
        }
    }

    return events.sort((a, b) => a.startMinutes - b.startMinutes);
}

export function formatTime(iso: string): string {
    const date = new Date(iso);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

export function minutesOfDay(iso: string): number {
    const date = new Date(iso);
    return date.getHours() * 60 + date.getMinutes();
}

/** The 6x7 grid of a month view, padded out to whole weeks. */
export function monthGrid(anchor: Date, weekStart: WeekStart): Date[] {
    const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const first = startOfWeek(firstOfMonth, weekStart);
    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

/** The Monday (or Sunday) on or before `date`. */
export function startOfWeek(date: Date, weekStart: WeekStart): Date {
    const first = weekStart === 'Sunday' ? 0 : 1;
    const day = startOfDay(date);
    const shift = (day.getDay() - first + 7) % 7;
    return addDays(day, -shift);
}

/**
 * The time a drop at `offsetY` inside a day column lands on, snapped to the
 * nearest quarter hour.
 */
export function timeAtOffset(day: Date, offsetY: number): Date {
    const minutes = DAY_START_HOUR * 60 + (offsetY / HOUR_HEIGHT) * 60;
    const snapped = Math.round(minutes / 15) * 15;
    const at = startOfDay(day);
    at.setMinutes(Math.min(snapped, DAY_END_HOUR * 60 - 15));
    return at;
}

export function weekDays(anchor: Date, weekStart: WeekStart): Date[] {
    const first = startOfWeek(anchor, weekStart);
    return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}
