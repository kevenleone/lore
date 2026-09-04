// What the menu-bar popover needs to draw itself.
//
// The popover is its own Tauri window, so it has its own renderer and its own
// (empty) store — the timer lives in the main window. Rather than teach two
// windows to run one timer, the main window pushes this snapshot through Rust
// on every change and the popover renders it and sends commands back. There is
// still exactly one source of truth.

import type { FocusPhase } from '../../store/types';

import { PHASE_LABELS } from '../../lib/focusTimer';

export interface FocusSnapshot {
    /** False for an untouched timer, which hides the Stop button. */
    canStop: boolean;
    /** True when Do Not Disturb is on for sessions. */
    dnd: boolean;
    /** Epoch ms the interval ends at, while it runs; the panel ticks from this. */
    endsAt: null | number;
    phase: FocusPhase;
    /** How many items are in Today, so the panel knows whether cycling is useful. */
    queueCount: number;
    /** Authoritative while paused. */
    remainingSec: number;
    running: boolean;
    sessionIndex: number;
    /** "Work · due today", or null when nothing is being worked on. */
    taskMeta: null | string;
    taskTitle: null | string;
    /** Length of the current interval, for the ring's sweep. */
    totalSec: number;
    /** Sessions in a cycle — the number of pips. */
    totalSessions: number;
}

/** Pips are filled for finished sessions; the one in progress is not one yet. */
export function completedSessions(snapshot: { phase: FocusPhase; sessionIndex: number }): number {
    return snapshot.phase === 'focus' ? snapshot.sessionIndex - 1 : snapshot.sessionIndex;
}

export function phaseLabel(phase: FocusPhase): string {
    return PHASE_LABELS[phase];
}
