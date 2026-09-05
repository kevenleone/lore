// Pure focus-timer arithmetic, shared by the popover (`Lore Settings.dc.html`
// frame 1e), the full Focus surface (1f) and the calendar's session blocks (1g).
// Nothing here touches the store, so the phase machine is unit-testable.

import type { Durations, FocusPhase, FocusSession, FocusState } from '../store/types';

/** `MM:SS`, clamped at zero — the timer never shows a negative countdown. */
export function formatClock(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** How long `phase` runs, in seconds. */
export function phaseSeconds(phase: FocusPhase, durations: Durations): number {
    return durations[phase] * 60;
}

export const PHASE_LABELS: Record<FocusPhase, string> = {
    focus: 'Focus',
    long: 'Long break',
    short: 'Short break',
};

/** Fraction of the current interval already elapsed, 0–1. */
export function elapsedFraction(remaining: number, total: number): number {
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, 1 - remaining / total));
}

/** Total seconds of focus logged on the calendar day containing `day`. */
export function focusedSecondsOn(sessions: FocusSession[], day: Date): number {
    const start = startOfDay(day).getTime();
    const end = start + 86_400_000;
    return sessions.reduce((total, s) => {
        const startedAt = new Date(s.startedAt).getTime();
        if (startedAt < start || startedAt >= end) return total;
        return total + Math.max(0, (new Date(s.endedAt).getTime() - startedAt) / 1000);
    }, 0);
}

/** `2h 05m` / `48m` — the "focused today" readout in frame 1f's header. */
export function formatDuration(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/**
 * True only for a timer with no session under way: a full focus interval, not
 * running, at the start of a cycle. It is the one state the menu bar leaves
 * blank — a paused session is still a session, and stays up there until it is
 * stopped.
 */
export function isTimerIdle(focus: FocusState, durations: Durations): boolean {
    return (
        // The decisive one: `startedAt` survives a pause and is cleared by a
        // stop, so it says whether a session exists rather than inferring it
        // from the clock. Without it, pausing inside the first second still
        // read as untouched — the interval had not lost a whole second yet.
        focus.startedAt === null &&
        !focus.running &&
        focus.phase === 'focus' &&
        focus.sessionIndex === 1 &&
        focus.remainingSec >= phaseSeconds('focus', durations)
    );
}

/**
 * What follows `phase`. A focus interval leads into a long break every
 * `longBreakAfter` sessions and a short one otherwise; any break leads back
 * into focus.
 */
export function nextPhase(
    phase: FocusPhase,
    sessionIndex: number,
    longBreakAfter: number,
): FocusPhase {
    if (phase !== 'focus') return 'focus';
    return sessionIndex >= longBreakAfter ? 'long' : 'short';
}

/**
 * Seconds left in the current interval. While the timer runs this is derived
 * from the wall clock rather than accumulated from ticks, so a throttled
 * background window cannot make the countdown drift slow.
 *
 * Rounded **up**, matching `remaining_at` in `focus_tray.rs`: the menu bar and
 * the window read the same `endsAt`, so rounding them differently showed two
 * times a second apart for half of every second.
 */
export function remainingSeconds(focus: FocusState, now: number = Date.now()): number {
    if (!focus.running || focus.endsAt === null) return focus.remainingSec;
    return Math.max(0, Math.ceil((focus.endsAt - now) / 1000));
}

export function startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
}
