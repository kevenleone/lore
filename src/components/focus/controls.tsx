// Pieces shared by the focus popover (frame 1e) and the focus surface (1f):
// the restart / pause / skip transport, the session pips, and the queue rows.

import type { CSSProperties, ReactNode } from 'react';

import type { Item } from '../../store/types';

import { PHASE_LABELS } from '../../lib/focusTimer';
import { useStore } from '../../store/useStore';
import { Check, Pause, Play, Restart, SkipForward } from '../common/glyphs';
import { queueRow, transportButton } from './Focus.css';

/** Small uppercase caption used above every block in both surfaces. */
export function FocusLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
    return (
        <div
            style={{
                color: 'var(--faint, #a8a8b0)',
                fontSize: 10.5,
                fontWeight: 680,
                letterSpacing: '.07em',
                textTransform: 'uppercase',
                ...style,
            }}
        >
            {children}
        </div>
    );
}

/**
 * A task in the focus queue. Clicking the row makes it what the session is
 * "working on"; the box takes it off Today, which is as close to "done" as the
 * item format gets — there is no completion field on an item yet.
 */
export function QueueRow({ item }: { item: Item }) {
    const taskId = useStore((s) => s.focus.taskId);
    const setFocusTask = useStore((s) => s.setFocusTask);
    const updateItem = useStore((s) => s.updateItem);
    const collections = useStore((s) => s.collections);

    const active = item.id === taskId;
    const collection = collections.find((c) => c.id === item.collectionId)?.name;

    return (
        <div
            className={queueRow}
            onClick={() => setFocusTask(item.id)}
            style={{
                background: active ? 'var(--surface, #fff)' : 'transparent',
                border: `1px solid ${active ? 'var(--ac-border, #dedee5)' : 'transparent'}`,
                ...(active ? { boxShadow: '0 1px 3px rgba(0,0,0,.05)' } : null),
            }}
        >
            <button
                aria-label={`Clear ${item.title} from Today`}
                onClick={(e) => {
                    e.stopPropagation();
                    void updateItem(item.id, { flags: { ...item.flags, today: false } });
                }}
                style={{
                    alignItems: 'center',
                    background: 'transparent',
                    border: '1.5px solid var(--dash, #d2d2dc)',
                    borderRadius: 5,
                    color: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flex: 'none',
                    height: 17,
                    justifyContent: 'center',
                    marginTop: 1,
                    padding: 0,
                    width: 17,
                }}
                type="button"
            >
                <Check size={11} sw={3.2} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        color: 'var(--text, #1a1a1f)',
                        fontSize: 12.5,
                        fontWeight: active ? 620 : 560,
                        lineHeight: 1.4,
                    }}
                >
                    {item.title}
                </div>
                <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 11, marginTop: 2 }}>
                    {[collection, item.flags.today ? 'due today' : null]
                        .filter(Boolean)
                        .join(' · ') || 'Task'}
                </div>
            </div>
        </div>
    );
}

export function SessionCaption() {
    const sessionIndex = useStore((s) => s.focus.sessionIndex);
    const phase = useStore((s) => s.focus.phase);
    const total = useStore((s) => s.prefs.longBreakAfter);

    if (phase !== 'focus') return <>next: {PHASE_LABELS[phase].toLowerCase()}</>;
    return (
        <>
            Session {sessionIndex} of {total}
        </>
    );
}

/** One filled dot per completed session in the current cycle. */
export function SessionPips({ size = 7 }: { size?: number }) {
    const sessionIndex = useStore((s) => s.focus.sessionIndex);
    const phase = useStore((s) => s.focus.phase);
    const total = useStore((s) => s.prefs.longBreakAfter);

    // The session in progress counts as done only once its break has started.
    const done = phase === 'focus' ? sessionIndex - 1 : sessionIndex;

    return (
        <span style={{ alignItems: 'center', display: 'flex', gap: 5 }}>
            {Array.from({ length: total }, (_, i) => (
                <span
                    key={i}
                    style={{
                        background: i < done ? 'var(--ac)' : 'var(--surface3, #e6e6ea)',
                        borderRadius: '50%',
                        height: size,
                        width: size,
                    }}
                />
            ))}
        </span>
    );
}

export function Transport({ size = 38 }: { size?: number }) {
    const running = useStore((s) => s.focus.running);
    const toggle = useStore((s) => s.toggleFocus);
    const reset = useStore((s) => s.resetFocusInterval);
    const skip = useStore((s) => s.skipFocusInterval);

    return (
        <div style={{ alignItems: 'center', display: 'flex', gap: 9 }}>
            <button
                aria-label="Start this interval over"
                className={transportButton}
                onClick={reset}
                style={{ height: size, width: size }}
                type="button"
            >
                <Restart size={size * 0.4} />
            </button>
            <button
                className={transportButton}
                onClick={toggle}
                style={{
                    background: 'var(--ac)',
                    color: '#fff',
                    fontSize: size * 0.355,
                    fontWeight: 620,
                    gap: 8,
                    height: size,
                    padding: `0 ${size * 0.53}px`,
                    width: 'auto',
                }}
                type="button"
            >
                {running ? <Pause size={size * 0.37} /> : <Play size={size * 0.37} />}
                {running ? 'Pause' : 'Start'}
            </button>
            <button
                aria-label="Skip to the next interval"
                className={transportButton}
                onClick={skip}
                style={{ height: size, width: size }}
                type="button"
            >
                <SkipForward size={size * 0.4} />
            </button>
        </div>
    );
}
