// `Lore Settings.dc.html` frame 1e — the popover's contents: a progress ring,
// the session pips, the transport, what the session is working on, and the Do
// Not Disturb footer.
//
// Rendered by two hosts: the menu-bar window the tray icon opens, and the
// in-window popover under the title bar's timer chip. It draws a snapshot and
// calls back — neither the store nor Tauri is reachable from here.

import type { FocusSnapshot } from './focusSnapshot';

import { elapsedFraction, formatClock } from '../../lib/focusTimer';
import { ChevronDown, Expand } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { SettingsIcon } from '../common/settingsGlyphs';
import { FocusLabel, SessionPips, Transport } from './controls';
import { expandButton } from './Focus.css';
import { completedSessions, phaseLabel } from './focusSnapshot';

const RADIUS = 58;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface FocusPanelActions {
    onNextTask: () => void;
    onOpenFocusMode: () => void;
    onReset: () => void;
    onSkip: () => void;
    onToggle: () => void;
}

export function FocusPanelBody({
    actions,
    /** Seconds left right now — the host ticks this, since only it knows the clock. */
    remainingSec,
    snapshot,
}: {
    actions: FocusPanelActions;
    remainingSec: number;
    snapshot: FocusSnapshot;
}) {
    // The arc shows what is left, so it starts whole and empties.
    const swept = elapsedFraction(remainingSec, snapshot.totalSec) * CIRCUMFERENCE;
    const canCycle = snapshot.queueCount > 1;

    return (
        <>
            <button
                aria-label="Open Focus mode"
                className={expandButton}
                onClick={actions.onOpenFocusMode}
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
                            {formatClock(remainingSec)}
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
                            {phaseLabel(snapshot.phase)}
                        </span>
                    </div>
                </div>

                <div style={{ alignItems: 'center', display: 'flex', gap: 5, marginTop: 16 }}>
                    <SessionPips
                        done={completedSessions(snapshot)}
                        total={snapshot.totalSessions}
                    />
                    <span style={{ color: 'var(--text3, #9a9aa5)', fontSize: 11.5, marginLeft: 6 }}>
                        Session {snapshot.sessionIndex} of {snapshot.totalSessions}
                    </span>
                </div>

                <div style={{ marginTop: 18 }}>
                    <Transport
                        onReset={actions.onReset}
                        onSkip={actions.onSkip}
                        onToggle={actions.onToggle}
                        running={snapshot.running}
                    />
                </div>
            </div>

            <div
                style={{ borderTop: '1px solid var(--border-soft, #f0f0f2)', padding: '13px 16px' }}
            >
                <FocusLabel>Working on</FocusLabel>
                {snapshot.taskTitle ? (
                    <button
                        // The design's chevron opens a picker; until there is one
                        // this steps through the queue.
                        onClick={actions.onNextTask}
                        style={{
                            alignItems: 'center',
                            background: 'transparent',
                            border: 'none',
                            color: 'inherit',
                            cursor: canCycle ? 'pointer' : 'default',
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
                                {snapshot.taskTitle}
                            </span>
                            <span
                                style={{
                                    color: 'var(--text3, #9a9aa5)',
                                    display: 'block',
                                    fontSize: 11.5,
                                    marginTop: 1,
                                }}
                            >
                                {snapshot.taskMeta ?? 'Task'}
                            </span>
                        </span>
                        {canCycle && (
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
                    Do Not Disturb is {snapshot.dnd ? 'on' : 'off'}
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
        </>
    );
}
