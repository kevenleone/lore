// Pieces shared by the focus popover (frame 1e) and the focus surface (1f):
// the restart / pause / skip transport, the session pips, and the queue rows.
//
// They take props rather than reading the store: the popover also runs inside
// the menu-bar window, which has no store to read.

import type { ReactNode } from 'react';

import type { Item } from '../../store/types';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { Check, Pause, Play, Plus, Restart, SkipForward, Stop } from '../common/glyphs';

/** Transport and queue-add buttons share this shell. */
const TRANSPORT_BUTTON =
    'inline-flex cursor-pointer items-center justify-center rounded-11 border-none bg-surface3 p-0 font-[inherit] text-text2 hover:brightness-[.96]';

/** The small round "+" that puts a captured item into the queue. */
export function AddToQueueButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            aria-label={label}
            className={cn(
                TRANSPORT_BUTTON,
                'h-5 w-5 flex-none rounded-md border border-border bg-transparent',
            )}
            onClick={onClick}
            title={label}
            type="button"
        >
            <Plus size={12} sw={2.4} />
        </button>
    );
}

/** Small uppercase caption used above every block in both surfaces. */
export function FocusLabel({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div
            className={cn('text-micro font-[680] tracking-[.07em] text-faint uppercase', className)}
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
            className={cn(
                'flex items-start gap-[10px] rounded-10 border px-[11px] py-[10px] hover:bg-hover',
                active
                    ? 'border-accent-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,.05)]'
                    : 'border-transparent bg-transparent',
                done ? 'cursor-default' : 'cursor-pointer',
            )}
            onClick={() => !done && setFocusTask(item.id)}
        >
            <button
                aria-checked={done}
                aria-label={item.title}
                className={cn(
                    'mt-px flex h-[17px] w-[17px] flex-none cursor-pointer items-center justify-center rounded-5 border-[1.5px] p-0',
                    done
                        ? 'border-accent bg-accent text-white'
                        : 'border-dash bg-transparent text-transparent',
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    void updateItem(item.id, { flags: { ...item.flags, done: !done } });
                }}
                role="checkbox"
                type="button"
            >
                <Check size={11} sw={3.2} />
            </button>
            <div className="min-w-0 flex-1">
                <div
                    className={cn(
                        'text-body leading-[1.4]',
                        done
                            ? 'text-text3 line-through'
                            : cn('text-text', active ? 'font-[620]' : 'font-[560]'),
                    )}
                >
                    {item.title}
                </div>
                <div className="mt-[2px] text-caption text-text3">
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
        <span className="flex items-center gap-[5px]">
            {Array.from({ length: total }, (_, i) => (
                <span
                    className={cn('rounded-full', i < done ? 'bg-accent' : 'bg-surface3')}
                    key={i}
                    // The pip size is a prop: the two surfaces draw it differently.
                    style={{ height: size, width: size }}
                />
            ))}
        </span>
    );
}

/**
 * Restart · start/pause · skip, plus Stop once a session is under way.
 *
 * Stop is the difference between pausing and finishing: a paused session still
 * counts down in the menu bar, and stopping is what takes it out of there.
 */
export function Transport({
    onReset,
    onSkip,
    onStop,
    onToggle,
    running,
    size = 38,
}: {
    onReset: () => void;
    onSkip: () => void;
    /** Omitted when there is no session to end, which hides the button. */
    onStop?: () => void;
    onToggle: () => void;
    running: boolean;
    size?: number;
}) {
    return (
        <div className="flex items-center gap-[9px]">
            <button
                aria-label="Start this interval over"
                className={TRANSPORT_BUTTON}
                onClick={onReset}
                style={{ height: size, width: size }}
                type="button"
            >
                <Restart size={size * 0.4} />
            </button>
            <button
                className={cn(TRANSPORT_BUTTON, 'w-auto gap-2 bg-accent font-[620] text-white')}
                onClick={onToggle}
                // Everything here scales with the `size` prop.
                style={{
                    fontSize: size * 0.355,
                    height: size,
                    padding: `0 ${size * 0.53}px`,
                }}
                type="button"
            >
                {running ? <Pause size={size * 0.37} /> : <Play size={size * 0.37} />}
                {running ? 'Pause' : 'Start'}
            </button>
            <button
                aria-label="Skip to the next interval"
                className={TRANSPORT_BUTTON}
                onClick={onSkip}
                style={{ height: size, width: size }}
                type="button"
            >
                <SkipForward size={size * 0.4} />
            </button>
            {onStop && (
                <button
                    aria-label="Stop the session"
                    className={TRANSPORT_BUTTON}
                    onClick={onStop}
                    style={{ height: size, width: size }}
                    title="Stop the session"
                    type="button"
                >
                    <Stop size={size * 0.34} />
                </button>
            )}
        </div>
    );
}
