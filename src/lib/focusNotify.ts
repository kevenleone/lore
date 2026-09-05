// Tells the user an interval ended when they are not looking at the menu bar:
// a system notification, the chime, and a bounce of the Dock icon.
//
// Every switch read here already existed in the settings sheet; this module is
// what gives them an effect.

import type { FocusPhase, Prefs } from '../store/types';

import { playChime } from './focusChime';
import { phaseSeconds } from './focusTimer';

/** Quiet hours, as minutes past midnight — 22:00 to 07:30, per the settings copy. */
const QUIET_FROM = 22 * 60;
const QUIET_UNTIL = 7 * 60 + 30;

interface IntervalEndCopy {
    body: string;
    title: string;
}

let permission: null | Promise<boolean> = null;

/**
 * Settles notification consent when a session *starts*. Asking at the moment
 * the interval ends would put the system's consent sheet in front of the
 * notification it was meant to allow, and the notification would be lost.
 */
export function ensureNotificationPermission(): Promise<boolean> {
    permission ??= requestPermission();
    return permission;
}

/** What the notification says about the interval that just ended. */
export function intervalEndCopy(
    endedPhase: FocusPhase,
    nextPhase: FocusPhase,
    prefs: Prefs,
): IntervalEndCopy {
    const minutes = Math.round(phaseSeconds(nextPhase, prefs.durations) / 60);
    if (endedPhase === 'focus') {
        const kind = nextPhase === 'long' ? 'long break' : 'break';
        return { body: `Time for a ${minutes}-minute ${kind}.`, title: 'Focus complete' };
    }
    return { body: `Back to focus — ${minutes} minutes.`, title: 'Break over' };
}

/** The window in which only sync problems are allowed through. */
export function isQuietHours(now: Date): boolean {
    const minutes = now.getHours() * 60 + now.getMinutes();
    // The range wraps midnight, so it is a union rather than an interval.
    return minutes >= QUIET_FROM || minutes < QUIET_UNTIL;
}

/** Everything that happens when an interval runs out. Never throws. */
export async function notifyIntervalEnd(
    prefs: Prefs,
    endedPhase: FocusPhase,
    nextPhase: FocusPhase,
): Promise<void> {
    if (!prefs.switches.focusEnd) return;
    if (prefs.switches.quiet && isQuietHours(new Date())) return;

    if (prefs.switches.sounds) playChime();

    const copy = intervalEndCopy(endedPhase, nextPhase, prefs);
    try {
        const { sendNotification } = await import('@tauri-apps/plugin-notification');
        if (await ensureNotificationPermission()) sendNotification(copy);
        await bounceDock(prefs);
    } catch {
        // Outside Tauri — there is no notification centre and no Dock.
    }
}

/**
 * Bounces the Dock icon, but only when Lore is not already the front window:
 * asking for attention you already have flashes the icon of the app the user is
 * looking at. `Alert` keeps bouncing until Lore is activated; `Banner` bounces
 * once.
 */
async function bounceDock(prefs: Prefs): Promise<void> {
    const { getCurrentWindow, UserAttentionType } = await import('@tauri-apps/api/window');
    const window = getCurrentWindow();
    if (await window.isFocused()) return;
    await window.requestUserAttention(
        prefs.notifStyle === 'Alert' ? UserAttentionType.Critical : UserAttentionType.Informational,
    );
}

async function requestPermission(): Promise<boolean> {
    try {
        const { isPermissionGranted, requestPermission: ask } =
            await import('@tauri-apps/plugin-notification');
        if (await isPermissionGranted()) return true;
        return (await ask()) === 'granted';
    } catch {
        return false;
    }
}
