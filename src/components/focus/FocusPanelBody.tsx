// `Lore Settings.dc.html` frame 1e — the popover's contents: a progress ring,
// the session pips, the transport, what the session is working on, and the Do
// Not Disturb footer.
//
// Rendered by two hosts: the menu-bar window the tray icon opens, and the
// in-window popover under the title bar's timer chip. It draws a snapshot and
// calls back — neither the store nor Tauri is reachable from here.

import type { FocusSnapshot } from './focusSnapshot';

import { cn } from '../../lib/cn';
import { elapsedFraction, formatClock } from '../../lib/focusTimer';
import { ChevronDown, Expand } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { SettingsIcon } from '../common/settingsGlyphs';
import { FocusLabel, SessionPips, Transport } from './controls';
import { completedSessions, phaseLabel } from './focusSnapshot';

const RADIUS = 58;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export interface FocusPanelActions {
    onNextTask: () => void;
    onOpenFocusMode: () => void;
    onReset: () => void;
    onSkip: () => void;
    onStop: () => void;
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
                className="absolute top-2 right-2 z-1 flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-7 border-none bg-transparent p-0 text-faint hover:bg-hover"
                onClick={actions.onOpenFocusMode}
                title="Open Focus mode"
                type="button"
            >
                <Expand size={14} />
            </button>

            <div className="flex flex-col items-center px-5 pt-[22px] pb-[18px]">
                <div className="relative h-[132px] w-[132px]">
                    <svg
                        className="block [transform:rotate(-90deg)]"
                        height={132}
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
                            className="transition-[stroke-dasharray] duration-300 ease-linear"
                            cx="66"
                            cy="66"
                            fill="none"
                            r={RADIUS}
                            stroke="var(--ac)"
                            strokeDasharray={`${CIRCUMFERENCE - swept} ${CIRCUMFERENCE}`}
                            strokeLinecap="round"
                            strokeWidth="9"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3px]">
                        <span className="text-[30px] leading-none font-semibold tracking-[-.03em] tabular-nums">
                            {formatClock(remainingSec)}
                        </span>
                        <span className="text-caption font-[640] tracking-[.06em] text-text3 uppercase">
                            {phaseLabel(snapshot.phase)}
                        </span>
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-[5px]">
                    <SessionPips
                        done={completedSessions(snapshot)}
                        total={snapshot.totalSessions}
                    />
                    <span className="ml-[6px] text-label text-text3">
                        Session {snapshot.sessionIndex} of {snapshot.totalSessions}
                    </span>
                </div>

                <div className="mt-[18px]">
                    <Transport
                        onReset={actions.onReset}
                        onSkip={actions.onSkip}
                        onStop={snapshot.canStop ? actions.onStop : undefined}
                        onToggle={actions.onToggle}
                        running={snapshot.running}
                    />
                </div>
            </div>

            <div className="border-t border-border-soft px-4 py-[13px]">
                <FocusLabel>Working on</FocusLabel>
                {snapshot.taskTitle ? (
                    <button
                        // The design's chevron opens a picker; until there is one
                        // this steps through the queue.
                        className={cn(
                            'mt-[9px] flex w-full items-center gap-[10px] border-none bg-transparent p-0 text-left font-[inherit] text-[inherit]',
                            canCycle ? 'cursor-pointer' : 'cursor-default',
                        )}
                        onClick={actions.onNextTask}
                        type="button"
                    >
                        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-type-task-bg text-type-task-fg">
                            <Icon name="task" size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-body-lg font-semibold">
                                {snapshot.taskTitle}
                            </span>
                            <span className="mt-px block text-label text-text3">
                                {snapshot.taskMeta ?? 'Task'}
                            </span>
                        </span>
                        {canCycle && (
                            <span className="flex text-faint">
                                <ChevronDown size={15} />
                            </span>
                        )}
                    </button>
                ) : (
                    <div className="mt-2 text-body leading-[1.5] text-text3">
                        Nothing in Today yet — flag a task and it shows up here.
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between border-t border-border-soft bg-surface2 px-4 py-[10px]">
                <span className="inline-flex items-center gap-[7px] text-label text-text3">
                    <SettingsIcon name="info" size={13} sw={1.8} />
                    Do Not Disturb is {snapshot.dnd ? 'on' : 'off'}
                </span>
                <span className="rounded-5 border border-b-2 border-kbd-border bg-kbd-bg px-[6px] py-px font-mono text-micro text-text2">
                    ⌥⇧F
                </span>
            </div>
        </>
    );
}
