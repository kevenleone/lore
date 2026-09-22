// Drives the focus countdown and keeps the menu-bar tray in step with it.
// Mounted once, at the app root.

import { useEffect } from 'react';

import { isTimerIdle, PHASE_LABELS, phaseSeconds } from '../../lib/focusTimer';
import { useStore } from '../../store/useStore';
import { useFocusSnapshot } from './useFocusSnapshot';

/**
 * Polls the countdown while an interval runs, and again whenever the window
 * comes back to the foreground — a backgrounded window has its timers throttled,
 * so without the visibility pass an interval that ended while the app was hidden
 * would only roll over on the next tick.
 *
 * Four times a second, not once: the displayed value only changes on a second
 * boundary, and polling at exactly one second would notice each boundary up to a
 * second late, which is what put the window behind the menu bar. The tick is a
 * no-op when the value has not changed.
 */
/** Poll interval for every surface that draws the countdown. */
export const TICK_MS = 250;

export function useFocusTimer(): void {
    const running = useStore((state) => state.focus.running);
    const tick = useStore((state) => state.tickFocus);

    useEffect(() => {
        if (!running) {
            return;
        }

        const id = setInterval(tick, TICK_MS);

        const onVisible = () => {
            if (!document.hidden) {
                tick();
            }
        };

        document.addEventListener('visibilitychange', onVisible);

        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [running, tick]);

    useTrayMirror();
    useTrayCommands();
}

/** The tray menu's focus lines, and the "this interval is over" wake-up. */
function useTrayCommands(): void {
    const cycleFocusTask = useStore((state) => state.cycleFocusTask);
    const openFocusMode = useStore((state) => state.toggleFocusMode);
    const reset = useStore((state) => state.resetFocusInterval);
    const skip = useStore((state) => state.skipFocusInterval);
    const stop = useStore((state) => state.stopFocus);
    const tick = useStore((state) => state.tickFocus);
    const toggleFocus = useStore((state) => state.toggleFocus);

    useEffect(() => {
        let unlisten: (() => void)[] = [];
        let cancelled = false;

        void (async () => {
            try {
                const { listen } = await import('@tauri-apps/api/event');
                const offs = [
                    await listen('focus:toggle', () => toggleFocus()),
                    await listen('focus:reset', () => reset()),
                    await listen('focus:skip', () => skip()),
                    await listen('focus:stop', () => stop()),
                    await listen('focus:next-task', () => cycleFocusTask()),
                    // Rust reaches zero first; events are not throttled the way
                    // timers are, so this is what rolls the phase over while the
                    // window is hidden.
                    await listen('focus:elapsed', () => tick()),
                    await listen('focus:mode', () => {
                        if (!useStore.getState().focusModeOpen) {
                            openFocusMode();
                        }
                    }),
                ];

                // The effect can be torn down before the imports resolve — in
                // development it always is, since StrictMode mounts twice.
                if (cancelled) {
                    offs.forEach((off) => off());
                } else {
                    unlisten = offs;
                }
            } catch {
                // Outside Tauri — no event bus.
            }
        })();

        return () => {
            cancelled = true;
            unlisten.forEach((off) => off());
        };
    }, [cycleFocusTask, openFocusMode, reset, skip, stop, tick, toggleFocus]);
}

/**
 * Hands the tray the instant the interval ends and lets Rust count down to it,
 * rather than pushing a title every second: a hidden window's timers are
 * throttled to roughly once a minute, and the tray clock has to keep moving
 * exactly then. The dependencies below are the ones that survive a tick, so
 * this fires on real state changes only.
 *
 * The menu bar shows a session only while it is *running*. Pausing takes it
 * down, which is the whole point of the icon: it says work is happening.
 */
function useTrayMirror(): void {
    const endsAt = useStore((state) => state.focus.endsAt);
    const fullSec = useStore((state) => phaseSeconds(state.focus.phase, state.prefs.durations));
    const label = useStore((state) => PHASE_LABELS[state.focus.phase]);
    const running = useStore((state) => state.focus.running);
    // Only meaningful while paused; it changes on every tick when it is not.
    const pausedSec = useStore((state) => (state.focus.running ? null : state.focus.remainingSec));
    // Only a running interval belongs in the menu bar: pausing puts the plain
    // mark back, and so does stopping.
    const canStop = useStore((state) => !isTimerIdle(state.focus, state.prefs.durations));
    const snapshot = useFocusSnapshot();
    // The snapshot object is rebuilt on every render; compare its contents so a
    // tick that changes nothing the popover shows does not cross the bridge.
    const snapshotKey = JSON.stringify(snapshot);

    useEffect(() => {
        void (async () => {
            try {
                const { invoke } = await import('@tauri-apps/api/core');

                await invoke('sync_focus', {
                    canStop,
                    endsAtMs: running ? endsAt : null,
                    label,
                    remainingSec: Math.round(pausedSec ?? fullSec),
                    running,
                    show: running,
                    snapshot: JSON.parse(snapshotKey),
                });
            } catch {
                // Outside Tauri — there is no tray to paint.
            }
        })();
    }, [canStop, endsAt, fullSec, label, pausedSec, running, snapshotKey]);
}
