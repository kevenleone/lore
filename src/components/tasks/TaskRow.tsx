// The pieces every task view draws: the checkbox, the due pill, the priority
// chip and the project dot. They live here so a task reads the same way in the
// Today list, an Upcoming column and a board card.

import type { DueTone } from '../../store/tasks';
import type { Collection, Item, Priority } from '../../store/types';

import { cn } from '../../lib/cn';
import { formatDueDay } from '../../lib/format';
import { dueTone } from '../../store/tasks';
import { useStore } from '../../store/useStore';
import { Check, PriorityBars } from '../common/glyphs';

const PILL = 'inline-flex items-center gap-[5px] rounded-md px-2 py-[2px] text-label';

/**
 * Overdue borrows the destructive palette rather than a colour of its own: a
 * task list has exactly one "this is wrong" state, and every task manager
 * paints it red.
 */
const DUE_TONE: Record<DueTone, string> = {
    later: 'bg-surface3 text-text3',
    none: 'bg-surface3 text-text3',
    overdue: 'bg-danger-tint font-semibold text-danger',
    today: 'bg-accent-tint font-semibold text-accent',
};

/** `normal` is the absence of a priority, so it has no chip at all. */
const PRIORITY_CHIP: Record<Exclude<Priority, 'normal'>, string> = {
    high: 'bg-surface3 font-semibold text-alert-warning-fg',
    low: 'bg-surface3 text-faint',
    urgent: 'bg-danger-tint font-semibold text-danger',
};

/** How many bars the chip's glyph fills. */
const PRIORITY_LEVEL: Record<Exclude<Priority, 'normal'>, 1 | 2 | 3> = {
    high: 2,
    low: 1,
    urgent: 3,
};

export function DuePill({ item, today }: { item: Item; today: string }) {
    if (!item.dueAt) {
        return null;
    }

    const tone = dueTone(item, today);

    return <span className={cn(PILL, DUE_TONE[tone])}>{formatDueDay(item.dueAt, today)}</span>;
}

export function PriorityChip({ priority }: { priority?: Priority }) {
    if (!priority || priority === 'normal') {
        return null;
    }

    return (
        <span className={cn(PILL, 'capitalize', PRIORITY_CHIP[priority])}>
            <PriorityBars level={PRIORITY_LEVEL[priority]} />
            {priority}
        </span>
    );
}

export function ProjectTag({ collections, item }: { collections: Collection[]; item: Item }) {
    const collection = collections.find((collection) => collection.id === item.collectionId);

    return (
        <span className="inline-flex min-w-0 items-center gap-[6px] text-label text-text3">
            <span
                className="h-2 w-2 flex-none rounded-xs"
                // The collection's own colour, which the user picks.
                style={{ background: collection?.color ?? 'var(--dash)' }}
            />
            <span className="truncate">{collection?.name ?? 'Unfiled'}</span>
        </span>
    );
}

/** The checkbox. Ticking writes `done` straight to the file. */
export function TaskCheckbox({ item, size = 20 }: { item: Item; size?: number }) {
    const updateItem = useStore((state) => state.updateItem);
    const done = !!item.flags.done;

    return (
        <button
            aria-label={done ? `Mark ${item.title} not done` : `Mark ${item.title} done`}
            aria-pressed={done}
            className={cn(
                'flex flex-none items-center justify-center rounded-md border-2 p-0',
                done ? 'border-accent bg-accent text-white' : 'border-dash bg-transparent',
            )}
            onClick={(event) => {
                event.stopPropagation();
                void updateItem(item.id, { flags: { ...item.flags, done: !done } });
            }}
            // Sized by the caller: the board's cards carry a smaller box than
            // the Today list's rows.
            style={{ height: size, width: size }}
            type="button"
        >
            {done && <Check size={size * 0.6} />}
        </button>
    );
}

export function TitleText({ item }: { item: Item }) {
    return (
        <span
            className={cn(
                'block text-subhead leading-[1.4]',
                item.flags.done ? 'text-faint line-through' : 'text-text',
            )}
        >
            {item.title}
        </span>
    );
}
