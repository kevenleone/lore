// `Lore Settings.dc.html` frame 1e as its own window: the popover the menu-bar
// icon opens, floating over whatever you were doing.
//
// It owns no timer. The main window pushes a snapshot through Rust on every
// change, and every control here emits an event back for the main window to
// act on — so there is one phase machine, not two that can disagree. The only
// thing this window computes is the second-by-second countdown, ticked from the
// snapshot's `endsAt`; it is visible whenever it matters, so its timers are not
// throttled.

import { useCallback, useEffect, useRef, useState } from 'react';

import type { FocusSnapshot } from './focusSnapshot';

import { loadPersisted } from '../../store/persisted';
import { applyTokens, effectiveTheme, resolveAccent } from '../../theme/tokens';
import { PANEL_MARGIN, panelSurface, panelWindow } from './Focus.css';
import { FocusPanelBody } from './FocusPanelBody';

const EMPTY: FocusSnapshot = {
    dnd: true,
    endsAt: null,
    phase: 'focus',
    queueCount: 0,
    remainingSec: 25 * 60,
    running: false,
    sessionIndex: 1,
    taskMeta: null,
    taskTitle: null,
    totalSec: 25 * 60,
    totalSessions: 4,
};

export function FocusPanel() {
    const [snapshot, setSnapshot] = useState<FocusSnapshot>(EMPTY);
    const [remainingSec, setRemainingSec] = useState(EMPTY.remainingSec);
    const cardRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    // This window has no store, so preferences come straight off the shared
    // origin's localStorage — the same place the main window persists them.
    const prefs = loadPersisted().prefs;
    const theme = effectiveTheme(prefs.appearance);

    useEffect(() => {
        if (rootRef.current) applyTokens(rootRef.current, theme);
    }, [theme]);

    // Fit the window to the card instead of guessing a height in the config: the
    // card grows and shrinks with the task title's wrapping and the empty state,
    // and a window even a few pixels short scrolls its own contents under the
    // cursor.
    useEffect(() => {
        const card = cardRef.current;
        const root = rootRef.current;
        if (!card || !root) return;
        let disposed = false;
        const resize = async (height: number) => {
            try {
                const [{ getCurrentWindow }, { LogicalSize }] = await Promise.all([
                    import('@tauri-apps/api/window'),
                    import('@tauri-apps/api/dpi'),
                ]);
                if (disposed) return;
                const win = getCurrentWindow();
                await win.setSize(
                    new LogicalSize(
                        card.offsetWidth + PANEL_MARGIN * 2,
                        Math.ceil(height) + PANEL_MARGIN * 2,
                    ),
                );
            } catch {
                // Outside Tauri — the page is just as tall as it is.
            }
        };
        const observer = new ResizeObserver(
            ([entry]) =>
                void resize(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height),
        );
        observer.observe(card);
        return () => {
            disposed = true;
            observer.disconnect();
        };
    }, []);

    // Seed from the cached snapshot on open, then follow the pushes.
    useEffect(() => {
        let cancelled = false;
        let unlisten: (() => void) | undefined;
        void (async () => {
            try {
                const [{ invoke }, { listen }] = await Promise.all([
                    import('@tauri-apps/api/core'),
                    import('@tauri-apps/api/event'),
                ]);
                const off = await listen<FocusSnapshot>('focus:state', (e) =>
                    setSnapshot(e.payload),
                );
                const cached = await invoke<FocusSnapshot | null>('focus_snapshot');
                if (cancelled) {
                    off();
                    return;
                }
                if (cached) setSnapshot(cached);
                unlisten = off;
            } catch {
                // Outside Tauri — the panel only exists as a Tauri window.
            }
        })();
        return () => {
            cancelled = true;
            unlisten?.();
        };
    }, []);

    // Tick from the snapshot's end instant rather than counting down locally, so
    // a slow push cannot leave this window showing a different time to the tray.
    useEffect(() => {
        const read = () =>
            snapshot.running && snapshot.endsAt !== null
                ? Math.max(0, Math.round((snapshot.endsAt - Date.now()) / 1000))
                : snapshot.remainingSec;
        setRemainingSec(read());
        if (!snapshot.running) return;
        const id = setInterval(() => setRemainingSec(read()), 500);
        return () => clearInterval(id);
    }, [snapshot]);

    const send = useCallback((event: string) => {
        void (async () => {
            try {
                const { emitTo } = await import('@tauri-apps/api/event');
                await emitTo('main', event);
            } catch {
                // Outside Tauri — nothing to drive.
            }
        })();
    }, []);

    // Focus mode needs the main window in front, which is Rust's job — this
    // window may be the only one on screen.
    const openFocusMode = useCallback(() => {
        void (async () => {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                await invoke('open_focus_mode');
            } catch {
                // Outside Tauri — no window to raise.
            }
        })();
    }, []);

    return (
        <div
            className={panelWindow}
            data-frameless
            ref={rootRef}
            style={{ ['--ac' as string]: resolveAccent(prefs.accent, theme) }}
        >
            <div className={panelSurface} ref={cardRef}>
                <FocusPanelBody
                    actions={{
                        onNextTask: () => send('focus:next-task'),
                        onOpenFocusMode: openFocusMode,
                        onReset: () => send('focus:reset'),
                        onSkip: () => send('focus:skip'),
                        onToggle: () => send('focus:toggle'),
                    }}
                    remainingSec={remainingSec}
                    snapshot={snapshot}
                />
            </div>
        </div>
    );
}
