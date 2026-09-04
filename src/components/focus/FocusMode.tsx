// `Lore Settings.dc.html` frame 1f — Focus mode: the same timer given the whole
// window, with Today's queue and what was captured during the session beside it.
//
// The design draws it as its own window. Lore has one window, so this covers the
// knowledge base rather than opening a second one; Esc puts it away.

import { useEffect, useMemo, useState } from 'react';

import {
    elapsedFraction,
    focusedSecondsOn,
    formatClock,
    formatDuration,
    isTimerIdle,
    PHASE_LABELS,
    phaseSeconds,
} from '../../lib/focusTimer';
import { useStore } from '../../store/useStore';
import { queueItems } from '../../store/views';
import { Close, Plus, Search } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { AddToQueueButton, FocusLabel, QueueRow, SessionPips, Transport } from './controls';
import { pulseDot, queueRow, surface } from './Focus.css';

export function FocusMode() {
    const close = useStore((s) => s.toggleFocusMode);
    const durations = useStore((s) => s.prefs.durations);
    const focus = useStore((s) => s.focus);
    const items = useStore((s) => s.items);
    const sessions = useStore((s) => s.focusSessions);
    const totalSessions = useStore((s) => s.prefs.longBreakAfter);
    const reset = useStore((s) => s.resetFocusInterval);
    const skip = useStore((s) => s.skipFocusInterval);
    const stop = useStore((s) => s.stopFocus);
    const toggle = useStore((s) => s.toggleFocus);
    const updateItem = useStore((s) => s.updateItem);
    const [adding, setAdding] = useState(false);

    const addToQueue = (id: string) => {
        const item = items.find((i) => i.id === id);
        if (item) void updateItem(id, { flags: { ...item.flags, today: true } });
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                close();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [close]);

    const idle = isTimerIdle(focus, durations);
    const total = phaseSeconds(focus.phase, durations);
    const progress = elapsedFraction(focus.remainingSec, total);
    const queue = queueItems(items);

    // "Captured this session" is derived from creation times rather than tracked
    // as ids: Quick Capture saves from its own window and only tells this one to
    // refresh, so there is no id to record at the moment of capture.
    const captured = focus.startedAt
        ? items.filter((i) => i.createdAt >= focus.startedAt!).slice(0, 6)
        : [];

    const focusedToday =
        focusedSecondsOn(sessions, new Date()) +
        // The interval in progress is not a session yet, but it is time spent.
        (focus.running && focus.phase === 'focus' ? total - focus.remainingSec : 0);

    return (
        <div aria-label="Focus" className={surface} role="dialog">
            <div
                style={{
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border, #ececef)',
                    display: 'flex',
                    flex: 'none',
                    gap: 12,
                    height: 44,
                    padding: '0 14px',
                }}
            >
                <span style={{ color: 'var(--text2, #3b3b44)', fontSize: 12.5, fontWeight: 640 }}>
                    Focus
                </span>
                {focus.running && (
                    <span
                        style={{
                            alignItems: 'center',
                            background: 'var(--ac-tint, #eeeef2)',
                            borderRadius: 6,
                            color: 'var(--ac)',
                            display: 'inline-flex',
                            fontSize: 11.5,
                            gap: 6,
                            padding: '2px 8px',
                        }}
                    >
                        <span className={pulseDot} />
                        {PHASE_LABELS[focus.phase]} running
                    </span>
                )}
                <span
                    style={{
                        color: 'var(--text3, #9a9aa5)',
                        fontSize: 12,
                        marginLeft: 'auto',
                    }}
                >
                    {formatDuration(focusedToday)} focused today
                </span>
                <button
                    aria-label="Leave focus mode"
                    onClick={close}
                    style={{
                        alignItems: 'center',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 7,
                        color: 'var(--text2, #6b6b76)',
                        cursor: 'pointer',
                        display: 'flex',
                        height: 26,
                        justifyContent: 'center',
                        padding: 0,
                        width: 26,
                    }}
                    type="button"
                >
                    <Close size={16} />
                </button>
            </div>

            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                <div
                    style={{
                        alignItems: 'center',
                        borderRight: '1px solid var(--border, #ececef)',
                        display: 'flex',
                        flex: 1,
                        flexDirection: 'column',
                        gap: 20,
                        justifyContent: 'center',
                        minWidth: 0,
                        padding: 24,
                    }}
                >
                    <FocusLabel style={{ fontSize: 11, letterSpacing: '.09em' }}>
                        {PHASE_LABELS[focus.phase]} · session {focus.sessionIndex} of{' '}
                        {totalSessions}
                    </FocusLabel>
                    <div
                        style={{
                            fontSize: 76,
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 500,
                            letterSpacing: '-.045em',
                            lineHeight: 1,
                        }}
                    >
                        {formatClock(focus.remainingSec)}
                    </div>
                    <div
                        style={{
                            background: 'var(--surface3, #f1f1f3)',
                            borderRadius: 4,
                            height: 5,
                            overflow: 'hidden',
                            width: 230,
                        }}
                    >
                        <span
                            style={{
                                background: 'var(--ac)',
                                display: 'block',
                                height: '100%',
                                transition: 'width .3s linear',
                                width: `${progress * 100}%`,
                            }}
                        />
                    </div>
                    <div style={{ marginTop: 4 }}>
                        <Transport
                            onReset={reset}
                            onSkip={skip}
                            onStop={idle ? undefined : stop}
                            onToggle={toggle}
                            running={focus.running}
                            size={40}
                        />
                    </div>
                    <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                        <SessionPips
                            done={
                                focus.phase === 'focus'
                                    ? focus.sessionIndex - 1
                                    : focus.sessionIndex
                            }
                            total={totalSessions}
                        />
                        <span
                            style={{
                                color: 'var(--text3, #9a9aa5)',
                                fontSize: 11.5,
                                marginLeft: 5,
                            }}
                        >
                            Session {focus.sessionIndex} of {totalSessions}
                        </span>
                    </div>
                </div>

                <div
                    style={{
                        background: 'var(--surface2, #fafafa)',
                        display: 'flex',
                        flex: 'none',
                        flexDirection: 'column',
                        width: 288,
                    }}
                >
                    <div
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            gap: 8,
                            padding: '14px 16px 10px',
                        }}
                    >
                        <FocusLabel style={{ flex: 1 }}>Queue · from Today</FocusLabel>
                        <AddToQueueButton
                            label={adding ? 'Close the picker' : 'Add something to the queue'}
                            onClick={() => setAdding((open) => !open)}
                        />
                    </div>
                    {adding && <QueuePicker onPick={addToQueue} />}
                    <div
                        style={{
                            display: 'flex',
                            flex: 1,
                            flexDirection: 'column',
                            gap: 7,
                            overflow: 'auto',
                            padding: '0 12px 12px',
                        }}
                    >
                        {queue.map((item) => (
                            <QueueRow item={item} key={item.id} />
                        ))}
                        {queue.length === 0 && (
                            <div
                                style={{
                                    color: 'var(--text3, #9a9aa5)',
                                    fontSize: 12,
                                    lineHeight: 1.5,
                                    padding: '0 11px',
                                }}
                            >
                                Nothing in Today yet. Add something with + above, or flag an item
                                from the list.
                            </div>
                        )}
                    </div>

                    <div
                        style={{
                            borderTop: '1px solid var(--border, #ececef)',
                            padding: '12px 16px',
                        }}
                    >
                        <FocusLabel style={{ marginBottom: 9 }}>Captured this session</FocusLabel>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {captured.map((item) => (
                                <div
                                    key={item.id}
                                    style={{ alignItems: 'center', display: 'flex', gap: 9 }}
                                >
                                    <span
                                        style={{
                                            alignItems: 'center',
                                            background: `var(--type-${item.type}-bg)`,
                                            borderRadius: 6,
                                            color: `var(--type-${item.type}-fg)`,
                                            display: 'flex',
                                            flex: 'none',
                                            height: 22,
                                            justifyContent: 'center',
                                            width: 22,
                                        }}
                                    >
                                        <Icon name={item.type} size={13} />
                                    </span>
                                    <span
                                        style={{
                                            color: 'var(--text2, #3b3b44)',
                                            flex: 1,
                                            fontSize: 12,
                                            minWidth: 0,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {item.title}
                                    </span>
                                    {!item.flags.today && (
                                        <AddToQueueButton
                                            label={`Add ${item.title} to the queue`}
                                            onClick={() => addToQueue(item.id)}
                                        />
                                    )}
                                </div>
                            ))}
                            {captured.length === 0 && (
                                <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12 }}>
                                    Nothing yet — ⌥Space captures without leaving the session.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Everything not in Today yet, filtered as you type. Picking one flags it, which
 * is what putting something in the queue means — the queue is the Today view.
 */
function QueuePicker({ onPick }: { onPick: (id: string) => void }) {
    const items = useStore((s) => s.items);
    const [query, setQuery] = useState('');

    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        return items
            .filter((i) => !i.flags.today)
            .filter((i) => !q || i.title.toLowerCase().includes(q))
            .slice(0, 8);
    }, [items, query]);

    return (
        <div style={{ padding: '0 12px 10px' }}>
            <label
                style={{
                    alignItems: 'center',
                    background: 'var(--surface3, #f1f1f3)',
                    borderRadius: 8,
                    color: 'var(--text3, #9a9aa5)',
                    display: 'flex',
                    fontSize: 12,
                    gap: 7,
                    padding: '6px 9px',
                }}
            >
                <Search size={13} />
                <input
                    autoFocus
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find something to work on"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text, #1a1a1f)',
                        flex: 1,
                        font: 'inherit',
                        minWidth: 0,
                        outline: 'none',
                    }}
                    value={query}
                />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
                {matches.map((item) => (
                    <button
                        className={queueRow}
                        key={item.id}
                        onClick={() => onPick(item.id)}
                        style={{
                            alignItems: 'center',
                            background: 'transparent',
                            border: 'none',
                            font: 'inherit',
                            textAlign: 'left',
                            width: '100%',
                        }}
                        type="button"
                    >
                        <span
                            style={{
                                alignItems: 'center',
                                background: `var(--type-${item.type}-bg)`,
                                borderRadius: 6,
                                color: `var(--type-${item.type}-fg)`,
                                display: 'flex',
                                flex: 'none',
                                height: 20,
                                justifyContent: 'center',
                                width: 20,
                            }}
                        >
                            <Icon name={item.type} size={12} />
                        </span>
                        <span
                            style={{
                                color: 'var(--text2, #3b3b44)',
                                flex: 1,
                                fontSize: 12,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {item.title}
                        </span>
                        <Plus size={12} sw={2.4} />
                    </button>
                ))}
                {matches.length === 0 && (
                    <div
                        style={{
                            color: 'var(--text3, #9a9aa5)',
                            fontSize: 12,
                            padding: '8px 11px',
                        }}
                    >
                        Everything already in the queue.
                    </div>
                )}
            </div>
        </div>
    );
}
