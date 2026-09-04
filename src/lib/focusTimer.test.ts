import { describe, expect, it } from 'vitest';

import type { FocusSession, FocusState } from '../store/types';

import {
    elapsedFraction,
    focusedSecondsOn,
    formatClock,
    formatDuration,
    nextPhase,
    phaseSeconds,
    remainingSeconds,
} from './focusTimer';

const DURATIONS = { focus: 25, long: 15, short: 5 };

const paused: FocusState = {
    endsAt: null,
    phase: 'focus',
    remainingSec: 900,
    running: false,
    sessionIndex: 1,
    startedAt: null,
    taskId: null,
};

describe('formatClock', () => {
    it('pads both halves', () => {
        expect(formatClock(65)).toBe('01:05');
        expect(formatClock(1500)).toBe('25:00');
    });

    it('never shows a negative countdown', () => {
        expect(formatClock(-30)).toBe('00:00');
    });
});

describe('phaseSeconds', () => {
    it('reads the matching duration', () => {
        expect(phaseSeconds('focus', DURATIONS)).toBe(1500);
        expect(phaseSeconds('short', DURATIONS)).toBe(300);
        expect(phaseSeconds('long', DURATIONS)).toBe(900);
    });
});

describe('nextPhase', () => {
    it('takes a short break until the cycle is up', () => {
        expect(nextPhase('focus', 1, 4)).toBe('short');
        expect(nextPhase('focus', 3, 4)).toBe('short');
    });

    it('takes the long break on the last session of the cycle', () => {
        expect(nextPhase('focus', 4, 4)).toBe('long');
    });

    it('returns to focus after any break', () => {
        expect(nextPhase('short', 2, 4)).toBe('focus');
        expect(nextPhase('long', 4, 4)).toBe('focus');
    });
});

describe('remainingSeconds', () => {
    it('reads the stored value while paused', () => {
        expect(remainingSeconds(paused, 1_000)).toBe(900);
    });

    it('derives from the clock while running, so ticks cannot drift', () => {
        const running: FocusState = { ...paused, endsAt: 60_000, running: true };
        expect(remainingSeconds(running, 30_000)).toBe(30);
    });

    it('floors at zero once the interval is over', () => {
        const running: FocusState = { ...paused, endsAt: 60_000, running: true };
        expect(remainingSeconds(running, 90_000)).toBe(0);
    });
});

describe('elapsedFraction', () => {
    it('runs 0 → 1 across the interval', () => {
        expect(elapsedFraction(1500, 1500)).toBe(0);
        expect(elapsedFraction(750, 1500)).toBe(0.5);
        expect(elapsedFraction(0, 1500)).toBe(1);
    });

    it('clamps rather than dividing by zero', () => {
        expect(elapsedFraction(10, 0)).toBe(0);
    });
});

describe('focusedSecondsOn', () => {
    const session = (startHour: number, minutes: number, day = 3): FocusSession => ({
        endedAt: new Date(2026, 8, day, startHour, minutes).toISOString(),
        id: `s${startHour}`,
        startedAt: new Date(2026, 8, day, startHour, 0).toISOString(),
        taskId: null,
    });

    it('adds up only the sessions that started that day', () => {
        const sessions = [session(9, 25), session(11, 25), session(10, 25, 4)];
        expect(focusedSecondsOn(sessions, new Date(2026, 8, 3))).toBe(3000);
    });

    it('is zero for a day with nothing on it', () => {
        expect(focusedSecondsOn([session(9, 25)], new Date(2026, 8, 1))).toBe(0);
    });
});

describe('formatDuration', () => {
    it('drops the hour when there is none', () => {
        expect(formatDuration(48 * 60)).toBe('48m');
    });

    it('pads the minutes beside an hour', () => {
        expect(formatDuration(2 * 3600 + 5 * 60)).toBe('2h 05m');
    });
});
