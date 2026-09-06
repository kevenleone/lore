// `Lore Settings.dc.html` frame 1f — Focus mode: the same timer given the whole
// window, with Today's queue and what was captured during the session beside it.
//
// The design draws it as its own window. Lore has one window, so this covers the
// knowledge base rather than opening a second one; Esc puts it away.

import { useEffect, useMemo, useState } from 'react';

import { cn } from '../../lib/cn';
import {
    elapsedFraction,
    focusedSecondsOn,
    formatClock,
    formatDuration,
    isTimerIdle,
    PHASE_LABELS,
    phaseSeconds,
} from '../../lib/focusTimer';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { queueItems } from '../../store/views';
import { Close, Plus, Search } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { AddToQueueButton, FocusLabel, QueueRow, SessionPips, Transport } from './controls';

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
        <div
            aria-label="Focus"
            className="absolute inset-0 z-25 flex animate-surface-in flex-col bg-surface"
            role="dialog"
        >
            <div className="flex h-11 flex-none items-center gap-3 border-b border-border px-[14px]">
                <span className="text-body font-[640] text-text2">Focus</span>
                {focus.running && (
                    <span className="inline-flex items-center gap-[6px] rounded-md bg-accent-tint px-2 py-[2px] text-label text-accent">
                        <span className="h-[6px] w-[6px] animate-ring-pulse rounded-full bg-accent" />
                        {PHASE_LABELS[focus.phase]} running
                    </span>
                )}
                <span className="ml-auto text-body-sm text-text3">
                    {formatDuration(focusedToday)} focused today
                </span>
                <button
                    aria-label="Leave focus mode"
                    className="flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-7 border-none bg-transparent p-0 text-text2"
                    onClick={close}
                    type="button"
                >
                    <Close size={16} />
                </button>
            </div>

            <div className="flex min-h-0 flex-1">
                <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-5 border-r border-border p-6">
                    <FocusLabel className="text-caption tracking-[.09em]">
                        {PHASE_LABELS[focus.phase]} · session {focus.sessionIndex} of{' '}
                        {totalSessions}
                    </FocusLabel>
                    <div className="text-[76px] leading-none font-medium tracking-[-.045em] tabular-nums">
                        {formatClock(focus.remainingSec)}
                    </div>
                    <div className="h-[5px] w-[230px] overflow-hidden rounded-sm bg-surface3">
                        <span
                            className="block h-full bg-accent transition-[width] duration-300 ease-linear"
                            // The only genuinely computed length in the app.
                            style={{ width: `${progress * 100}%` }}
                        />
                    </div>
                    <div className="mt-1">
                        <Transport
                            onReset={reset}
                            onSkip={skip}
                            onStop={idle ? undefined : stop}
                            onToggle={toggle}
                            running={focus.running}
                            size={40}
                        />
                    </div>
                    <div className="flex items-center gap-[6px]">
                        <SessionPips
                            done={
                                focus.phase === 'focus'
                                    ? focus.sessionIndex - 1
                                    : focus.sessionIndex
                            }
                            total={totalSessions}
                        />
                        <span className="ml-[5px] text-label text-text3">
                            Session {focus.sessionIndex} of {totalSessions}
                        </span>
                    </div>
                </div>

                <div className="flex w-[288px] flex-none flex-col bg-surface2">
                    <div className="flex items-center gap-2 px-4 pt-[14px] pb-[10px]">
                        <FocusLabel className="flex-1">Queue · from Today</FocusLabel>
                        <AddToQueueButton
                            label={adding ? 'Close the picker' : 'Add something to the queue'}
                            onClick={() => setAdding((open) => !open)}
                        />
                    </div>
                    {adding && <QueuePicker onPick={addToQueue} />}
                    <div className="flex flex-1 flex-col gap-[7px] overflow-auto px-3 pb-3">
                        {queue.map((item) => (
                            <QueueRow item={item} key={item.id} />
                        ))}
                        {queue.length === 0 && (
                            <div className="px-[11px] text-body-sm leading-[1.5] text-text3">
                                Nothing in Today yet. Add something with + above, or flag an item
                                from the list.
                            </div>
                        )}
                    </div>

                    <div className="border-t border-border px-4 py-3">
                        <FocusLabel className="mb-[9px]">Captured this session</FocusLabel>
                        <div className="flex flex-col gap-[7px]">
                            {captured.map((item) => (
                                <div className="flex items-center gap-[9px]" key={item.id}>
                                    <span
                                        className={cn(
                                            'flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md',
                                            typeMeta(item.type).chip,
                                        )}
                                    >
                                        <Icon name={item.type} size={13} />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-body-sm text-text2">
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
                                <div className="text-body-sm text-text3">
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
        <div className="px-3 pb-[10px]">
            <label className="flex items-center gap-[7px] rounded-lg bg-surface3 px-[9px] py-[6px] text-body-sm text-text3">
                <Search size={13} />
                <input
                    autoFocus
                    className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-text outline-none"
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find something to work on"
                    value={query}
                />
            </label>
            <div className="mt-1 flex flex-col">
                {matches.map((item) => (
                    <button
                        className="flex w-full cursor-pointer items-center gap-[10px] rounded-10 border-none bg-transparent px-[11px] py-[10px] text-left font-[inherit] hover:bg-hover"
                        key={item.id}
                        onClick={() => onPick(item.id)}
                        type="button"
                    >
                        <span
                            className={cn(
                                'flex h-5 w-5 flex-none items-center justify-center rounded-md',
                                typeMeta(item.type).chip,
                            )}
                        >
                            <Icon name={item.type} size={12} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-body-sm text-text2">
                            {item.title}
                        </span>
                        <Plus size={12} sw={2.4} />
                    </button>
                ))}
                {matches.length === 0 && (
                    <div className="px-[11px] py-2 text-body-sm text-text3">
                        Everything already in the queue.
                    </div>
                )}
            </div>
        </div>
    );
}
