import { describe, expect, it } from 'vitest';

import type { FocusSession, Item } from '../store/types';

import {
    addMonths,
    blockGeometry,
    DAY_START_HOUR,
    eventsForDay,
    HOUR_HEIGHT,
    monthGrid,
    startOfWeek,
    timeAtOffset,
    weekDays,
} from './calendar';

/** Thursday 3 September 2026. */
const THU = new Date(2026, 8, 3);

const task = (id: string, title: string): Item => ({
    createdAt: THU.toISOString(),
    flags: {},
    id,
    related: [],
    tags: [],
    title,
    type: 'task',
    updatedAt: THU.toISOString(),
});

describe('startOfWeek', () => {
    it('walks back to Monday by default', () => {
        expect(startOfWeek(THU, 'Monday').getDate()).toBe(31);
    });

    it('walks back to Sunday when the week starts there', () => {
        expect(startOfWeek(THU, 'Sunday').getDate()).toBe(30);
    });

    it('leaves a day that already starts the week alone', () => {
        const monday = new Date(2026, 7, 31);
        expect(startOfWeek(monday, 'Monday').getDate()).toBe(31);
    });
});

describe('weekDays', () => {
    it('returns seven consecutive days from the week start', () => {
        const days = weekDays(THU, 'Monday');
        expect(days).toHaveLength(7);
        expect(days.map((d) => d.getDate())).toEqual([31, 1, 2, 3, 4, 5, 6]);
    });
});

describe('addMonths', () => {
    it('does not skip a month from a long one', () => {
        expect(addMonths(new Date(2026, 0, 31), 1).getMonth()).toBe(1);
    });
});

describe('monthGrid', () => {
    it('pads the month out to six whole weeks', () => {
        const cells = monthGrid(THU, 'Monday');
        expect(cells).toHaveLength(42);
        expect(cells[0].getDay()).toBe(1);
    });
});

describe('eventsForDay', () => {
    const items = [task('t1', 'Draft the digest copy'), task('t2', 'File the screenshots')];
    const schedule = { t1: new Date(2026, 8, 3, 10, 0).toISOString() };
    const sessions: FocusSession[] = [
        {
            endedAt: new Date(2026, 8, 3, 9, 25).toISOString(),
            id: 's1',
            startedAt: new Date(2026, 8, 3, 9, 0).toISOString(),
            taskId: 't1',
        },
    ];
    const base = { day: THU, items, schedule, sessions, showFocus: true, showTasks: true };

    it('returns scheduled tasks and sessions in start order', () => {
        const events = eventsForDay(base);
        expect(events.map((e) => e.kind)).toEqual(['focus', 'task']);
        expect(events[0].title).toBe('Focus · Draft the digest copy');
        expect(events[1].startMinutes).toBe(600);
    });

    it('leaves unscheduled tasks off the grid', () => {
        expect(eventsForDay(base).some((e) => e.itemId === 't2')).toBe(false);
    });

    it('honours the Calendar pane visibility switches', () => {
        expect(eventsForDay({ ...base, showFocus: false })).toHaveLength(1);
        expect(eventsForDay({ ...base, showTasks: false })).toHaveLength(1);
        expect(eventsForDay({ ...base, showFocus: false, showTasks: false })).toHaveLength(0);
    });

    it('ignores another day', () => {
        expect(eventsForDay({ ...base, day: new Date(2026, 8, 4) })).toHaveLength(0);
    });
});

describe('blockGeometry', () => {
    it('places a block by its start and length', () => {
        const geometry = blockGeometry({
            endMinutes: 660,
            id: 'e',
            itemId: null,
            kind: 'task',
            startMinutes: 600,
            time: '10:00',
            title: 'x',
        });
        expect(geometry.top).toBe((600 - DAY_START_HOUR * 60) * (HOUR_HEIGHT / 60));
        expect(geometry.height).toBe(HOUR_HEIGHT - 3);
    });

    it('keeps a very short block readable', () => {
        const geometry = blockGeometry({
            endMinutes: 605,
            id: 'e',
            itemId: null,
            kind: 'task',
            startMinutes: 600,
            time: '10:00',
            title: 'x',
        });
        expect(geometry.height).toBe(22);
    });
});

describe('timeAtOffset', () => {
    it('snaps a drop to the nearest quarter hour', () => {
        const at = timeAtOffset(THU, HOUR_HEIGHT * 2 + 10);
        expect(at.getHours()).toBe(10);
        expect(at.getMinutes()).toBe(15);
    });

    it('lands on the first hour when dropped at the top', () => {
        const at = timeAtOffset(THU, 0);
        expect(at.getHours()).toBe(DAY_START_HOUR);
        expect(at.getMinutes()).toBe(0);
    });
});
