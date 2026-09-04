// Drives the focus countdown and keeps the menu-bar tray in step with it.
// Mounted once, at the app root.

import { useEffect } from 'react';

import { PHASE_LABELS, phaseSeconds } from '../../lib/focusTimer';
import { useStore } from '../../store/useStore';
import { useFocusSnapshot } from './useFocusSnapshot';

/**
 * Ticks the store once a second while an interval runs, and again whenever the
 * window comes back to the foreground — a backgrounded window has its timers
 * throttled, so without the visibility pass an interval that ended while the
 * app was hidden would only roll over on the next tick.
 */
export function useFocusTimer(): void {
    const running = useStore((s) => s.focus.running);
    const tick = useStore((s) => s.tickFocus);

    useEffect(() => {
        if (!running) return;
        const id = setInterval(tick, 1000);
        const onVisible = () => {
            if (!document.hidden) tick();
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
    const cycleFocusTask = useStore((s) => s.cycleFocusTask);
    const openFocusMode = useStore((s) => s.toggleFocusMode);
    const reset = useStore((s) => s.resetFocusInterval);
    const skip = useStore((s) => s.skipFocusInterval);
    const tick = useStore((s) => s.tickFocus);
    const toggleFocus = useStore((s) => s.toggleFocus);

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
                    await listen('focus:next-task', () => cycleFocusTask()),
                    // Rust reaches zero first; events are not throttled the way
                    // timers are, so this is what rolls the phase over while the
                    // window is hidden.
                    await listen('focus:elapsed', () => tick()),
                    await listen('focus:mode', () => {
                        if (!useStore.getState().focusModeOpen) openFocusMode();
                    }),
                ];
                // The effect can be torn down before the imports resolve — in
                // development it always is, since StrictMode mounts twice.
                if (cancelled) offs.forEach((off) => off());
                else unlisten = offs;
            } catch {
                // Outside Tauri — no event bus.
            }
        })();
        return () => {
            cancelled = true;
            unlisten.forEach((off) => off());
        };
    }, [cycleFocusTask, openFocusMode, reset, skip, tick, toggleFocus]);
}

/**
 * Hands the tray the instant the interval ends and lets Rust count down to it,
 * rather than pushing a title every second: a hidden window's timers are
 * throttled to roughly once a minute, and the tray clock has to keep moving
 * exactly then. The dependencies below are the ones that survive a tick, so
 * this fires on real state changes only.
 */
function useTrayMirror(): void {
    const endsAt = useStore((s) => s.focus.endsAt);
    const fullSec = useStore((s) => phaseSeconds(s.focus.phase, s.prefs.durations));
    const label = useStore((s) => PHASE_LABELS[s.focus.phase]);
    const running = useStore((s) => s.focus.running);
    // Only meaningful while paused; it changes on every tick when it is not.
    const pausedSec = useStore((s) => (s.focus.running ? null : s.focus.remainingSec));
    const snapshot = useFocusSnapshot();
    // The snapshot object is rebuilt on every render; compare its contents so a
    // tick that changes nothing the popover shows does not cross the bridge.
    const snapshotKey = JSON.stringify(snapshot);

    useEffect(() => {
        void (async () => {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('sync_focus', {
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
    }, [endsAt, fullSec, label, pausedSec, running, snapshotKey]);
}
