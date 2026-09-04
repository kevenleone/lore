// Drives the focus countdown. Mounted once, at the app root.

import { useEffect } from 'react';

import { useStore } from '../../store/useStore';

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
}
