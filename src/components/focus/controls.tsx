// Pieces shared by the focus popover (frame 1e) and the focus surface (1f):
// the restart / pause / skip transport, the session pips, and the queue rows.
//
// They take props rather than reading the store: the popover also runs inside
// the menu-bar window, which has no store to read.

import type { CSSProperties, ReactNode } from 'react';

import type { Item } from '../../store/types';

import { useStore } from '../../store/useStore';
import { Check, Pause, Play, Plus, Restart, SkipForward } from '../common/glyphs';
import { queueRow, transportButton } from './Focus.css';

/** The small round "+" that puts a captured item into the queue. */
export function AddToQueueButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            aria-label={label}
            className={transportButton}
            onClick={onClick}
            style={{
                background: 'transparent',
                border: '1px solid var(--border, #e4e4ea)',
                borderRadius: 6,
                color: 'var(--text2, #6b6b76)',
                flex: 'none',
                height: 20,
                width: 20,
            }}
            title={label}
            type="button"
        >
            <Plus size={12} sw={2.4} />
        </button>
    );
}

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
 * A row in the focus queue. Clicking it makes it what the session is "working
 * on"; the box ticks it off, which strikes it through and sinks it to the
 * bottom rather than removing it — a finished task should read as finished.
 */
export function QueueRow({ item }: { item: Item }) {
    const taskId = useStore((s) => s.focus.taskId);
    const setFocusTask = useStore((s) => s.setFocusTask);
    const updateItem = useStore((s) => s.updateItem);
    const collections = useStore((s) => s.collections);

    const done = !!item.flags.done;
    const active = item.id === taskId && !done;
    const collection = collections.find((c) => c.id === item.collectionId)?.name;

    return (
        <div
            className={queueRow}
            onClick={() => !done && setFocusTask(item.id)}
            style={{
                background: active ? 'var(--surface, #fff)' : 'transparent',
                border: `1px solid ${active ? 'var(--ac-border, #dedee5)' : 'transparent'}`,
                cursor: done ? 'default' : 'pointer',
                ...(active ? { boxShadow: '0 1px 3px rgba(0,0,0,.05)' } : null),
            }}
        >
            <button
                aria-checked={done}
                aria-label={item.title}
                onClick={(e) => {
                    e.stopPropagation();
                    void updateItem(item.id, { flags: { ...item.flags, done: !done } });
                }}
                role="checkbox"
                style={{
                    alignItems: 'center',
                    borderRadius: 5,
                    cursor: 'pointer',
                    display: 'flex',
                    flex: 'none',
                    height: 17,
                    justifyContent: 'center',
                    marginTop: 1,
                    padding: 0,
                    width: 17,
                    ...(done
                        ? {
                              background: 'var(--ac)',
                              border: '1.5px solid var(--ac)',
                              color: '#fff',
                          }
                        : {
                              background: 'transparent',
                              border: '1.5px solid var(--dash, #d2d2dc)',
                              color: 'transparent',
                          }),
                }}
                type="button"
            >
                <Check size={11} sw={3.2} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div
                    style={{
                        fontSize: 12.5,
                        lineHeight: 1.4,
                        ...(done
                            ? { color: 'var(--text3, #9a9aa5)', textDecoration: 'line-through' }
                            : { color: 'var(--text, #1a1a1f)', fontWeight: active ? 620 : 560 }),
                    }}
                >
                    {item.title}
                </div>
                <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 11, marginTop: 2 }}>
                    {[collection, item.flags.today && !done ? 'due today' : null]
                        .filter(Boolean)
                        .join(' · ') || 'Task'}
                </div>
            </div>
        </div>
    );
}

/** One filled dot per completed session in the current cycle. */
export function SessionPips({
    done,
    size = 7,
    total,
}: {
    done: number;
    size?: number;
    total: number;
}) {
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

export function Transport({
    onReset,
    onSkip,
    onToggle,
    running,
    size = 38,
}: {
    onReset: () => void;
    onSkip: () => void;
    onToggle: () => void;
    running: boolean;
    size?: number;
}) {
    return (
        <div style={{ alignItems: 'center', display: 'flex', gap: 9 }}>
            <button
                aria-label="Start this interval over"
                className={transportButton}
                onClick={onReset}
                style={{ height: size, width: size }}
                type="button"
            >
                <Restart size={size * 0.4} />
            </button>
            <button
                className={transportButton}
                onClick={onToggle}
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
                onClick={onSkip}
                style={{ height: size, width: size }}
                type="button"
            >
                <SkipForward size={size * 0.4} />
            </button>
        </div>
    );
}
