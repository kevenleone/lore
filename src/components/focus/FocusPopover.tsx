// `Lore Settings.dc.html` frame 1e — the focus timer as a popover hanging off
// the title bar's timer chip: a progress ring, the session pips, the transport,
// what the session is working on, and the Do Not Disturb footer.
//
// The design draws it under a macOS menu bar. Lore's timer lives in this
// window's title bar instead, so the popover anchors there and the menu bar is
// left out rather than faked.

import { useEffect, useRef } from 'react';

import { elapsedFraction, formatClock, PHASE_LABELS, phaseSeconds } from '../../lib/focusTimer';
import { useStore } from '../../store/useStore';
import { ChevronDown, Expand } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { SettingsIcon } from '../common/settingsGlyphs';
import { FocusLabel, SessionCaption, SessionPips, Transport } from './controls';
import { expandButton, popover } from './Focus.css';

const RADIUS = 58;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function FocusPopover() {
    const close = useStore((s) => s.toggleFocusPopover);
    const durations = useStore((s) => s.prefs.durations);
    const dnd = useStore((s) => s.prefs.switches.dnd);
    const focus = useStore((s) => s.focus);
    const items = useStore((s) => s.items);
    const openFocusMode = useStore((s) => s.toggleFocusMode);
    const setFocusTask = useStore((s) => s.setFocusTask);
    const ref = useRef<HTMLDivElement>(null);

    // A click anywhere else dismisses it, the way a menu-bar popover does.
    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) close();
        };
        // Deferred: the click that opened the popover is still being dispatched.
        const id = setTimeout(() => document.addEventListener('mousedown', onDown));
        return () => {
            clearTimeout(id);
            document.removeEventListener('mousedown', onDown);
        };
    }, [close]);

    const total = phaseSeconds(focus.phase, durations);
    const swept = elapsedFraction(focus.remainingSec, total) * CIRCUMFERENCE;

    const queue = items.filter((i) => i.type === 'task' && i.flags.today);
    const task = items.find((i) => i.id === focus.taskId) ?? queue[0] ?? null;

    return (
        <div className={popover} ref={ref}>
            <button
                aria-label="Open Focus mode"
                className={expandButton}
                onClick={openFocusMode}
                title="Open Focus mode"
                type="button"
            >
                <Expand size={14} />
            </button>
            <div
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '22px 20px 18px',
                }}
            >
                <div style={{ height: 132, position: 'relative', width: 132 }}>
                    <svg
                        height={132}
                        style={{ display: 'block', transform: 'rotate(-90deg)' }}
                        viewBox="0 0 132 132"
                        width={132}
                    >
                        <circle
                            cx="66"
                            cy="66"
                            fill="none"
                            r={RADIUS}
                            stroke="var(--surface3, #f1f1f3)"
                            strokeWidth="9"
                        />
                        <circle
                            cx="66"
                            cy="66"
                            fill="none"
                            r={RADIUS}
                            stroke="var(--ac)"
                            strokeDasharray={`${CIRCUMFERENCE - swept} ${CIRCUMFERENCE}`}
                            strokeLinecap="round"
                            strokeWidth="9"
                            style={{ transition: 'stroke-dasharray .3s linear' }}
                        />
                    </svg>
                    <div
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            inset: 0,
                            justifyContent: 'center',
                            position: 'absolute',
                        }}
                    >
                        <span
                            style={{
                                fontSize: 30,
                                fontVariantNumeric: 'tabular-nums',
                                fontWeight: 600,
                                letterSpacing: '-.03em',
                                lineHeight: 1,
                            }}
                        >
                            {formatClock(focus.remainingSec)}
                        </span>
                        <span
                            style={{
                                color: 'var(--text3, #9a9aa5)',
                                fontSize: 11,
                                fontWeight: 640,
                                letterSpacing: '.06em',
                                textTransform: 'uppercase',
                            }}
                        >
                            {PHASE_LABELS[focus.phase]}
                        </span>
                    </div>
                </div>

                <div style={{ alignItems: 'center', display: 'flex', gap: 5, marginTop: 16 }}>
                    <SessionPips />
                    <span
                        style={{
                            color: 'var(--text3, #9a9aa5)',
                            fontSize: 11.5,
                            marginLeft: 6,
                        }}
                    >
                        <SessionCaption />
                    </span>
                </div>

                <div style={{ marginTop: 18 }}>
                    <Transport />
                </div>
            </div>

            <div
                style={{
                    borderTop: '1px solid var(--border-soft, #f0f0f2)',
                    padding: '13px 16px',
                }}
            >
                <FocusLabel>Working on</FocusLabel>
                {task ? (
                    <button
                        // Cycles through Today's tasks — the design's chevron opens a
                        // picker, which this stands in for until there is one.
                        onClick={() => {
                            const next =
                                queue[
                                    (queue.findIndex((i) => i.id === task.id) + 1) % queue.length
                                ];
                            if (next) setFocusTask(next.id);
                        }}
                        style={{
                            alignItems: 'center',
                            background: 'transparent',
                            border: 'none',
                            color: 'inherit',
                            cursor: queue.length > 1 ? 'pointer' : 'default',
                            display: 'flex',
                            font: 'inherit',
                            gap: 10,
                            marginTop: 9,
                            padding: 0,
                            textAlign: 'left',
                            width: '100%',
                        }}
                        type="button"
                    >
                        <span
                            style={{
                                alignItems: 'center',
                                background: 'var(--type-task-bg, #e8f2ec)',
                                borderRadius: 8,
                                color: 'var(--type-task-fg, #4d855f)',
                                display: 'flex',
                                flex: 'none',
                                height: 28,
                                justifyContent: 'center',
                                width: 28,
                            }}
                        >
                            <Icon name="task" size={15} />
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                            <span
                                style={{
                                    display: 'block',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {task.title}
                            </span>
                            <span
                                style={{
                                    color: 'var(--text3, #9a9aa5)',
                                    display: 'block',
                                    fontSize: 11.5,
                                    marginTop: 1,
                                }}
                            >
                                {task.flags.today ? 'due today' : 'Task'}
                            </span>
                        </span>
                        {queue.length > 1 && (
                            <span style={{ color: 'var(--faint, #c4c4cc)', display: 'flex' }}>
                                <ChevronDown size={15} />
                            </span>
                        )}
                    </button>
                ) : (
                    <div
                        style={{
                            color: 'var(--text3, #9a9aa5)',
                            fontSize: 12.5,
                            lineHeight: 1.5,
                            marginTop: 8,
                        }}
                    >
                        Nothing in Today yet — flag a task and it shows up here.
                    </div>
                )}
            </div>

            <div
                style={{
                    alignItems: 'center',
                    background: 'var(--surface2, #fafafa)',
                    borderTop: '1px solid var(--border-soft, #f0f0f2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                }}
            >
                <span
                    style={{
                        alignItems: 'center',
                        color: 'var(--text3, #9a9aa5)',
                        display: 'inline-flex',
                        fontSize: 11.5,
                        gap: 7,
                    }}
                >
                    <SettingsIcon name="info" size={13} sw={1.8} />
                    Do Not Disturb is {dnd ? 'on' : 'off'}
                </span>
                <span
                    style={{
                        background: 'var(--kbd-bg, #fff)',
                        border: '1px solid var(--kbd-border, #e2e2e7)',
                        borderBottomWidth: 2,
                        borderRadius: 5,
                        color: 'var(--text2, #6b6b76)',
                        fontFamily: 'ui-monospace,Menlo,monospace',
                        fontSize: 10.5,
                        padding: '1px 6px',
                    }}
                >
                    ⌥⇧F
                </span>
            </div>
        </div>
    );
}
