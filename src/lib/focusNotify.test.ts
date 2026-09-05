import { describe, expect, it } from 'vitest';

import type { Prefs } from '../store/types';

import { DEFAULT_PREFS } from '../store/types';
import { intervalEndCopy, isQuietHours } from './focusNotify';

const prefs: Prefs = { ...DEFAULT_PREFS, durations: { focus: 25, long: 15, short: 5 } };

function at(hours: number, minutes: number): Date {
    return new Date(2026, 0, 1, hours, minutes);
}

describe('isQuietHours', () => {
    it('is quiet from 22:00 until 07:30', () => {
        expect(isQuietHours(at(22, 0))).toBe(true);
        expect(isQuietHours(at(2, 0))).toBe(true);
        expect(isQuietHours(at(7, 29))).toBe(true);
    });

    it('is not quiet on either side of the window', () => {
        expect(isQuietHours(at(21, 59))).toBe(false);
        expect(isQuietHours(at(7, 30))).toBe(false);
        expect(isQuietHours(at(12, 0))).toBe(false);
    });
});

describe('intervalEndCopy', () => {
    it('announces the short break a focus interval earned', () => {
        expect(intervalEndCopy('focus', 'short', prefs)).toEqual({
            body: 'Time for a 5-minute break.',
            title: 'Focus complete',
        });
    });

    it('names the long break', () => {
        expect(intervalEndCopy('focus', 'long', prefs)).toEqual({
            body: 'Time for a 15-minute long break.',
            title: 'Focus complete',
        });
    });

    it('sends the user back to focus after a break', () => {
        expect(intervalEndCopy('short', 'focus', prefs)).toEqual({
            body: 'Back to focus — 25 minutes.',
            title: 'Break over',
        });
        expect(intervalEndCopy('long', 'focus', prefs).title).toBe('Break over');
    });
});
