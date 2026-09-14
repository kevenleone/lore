// A card face: the title, then whatever the task actually has to say about
// itself — checklist progress, comments, due date, priority. Every one of these
// is absent on a plain task, so a bare card stays a single line of text.

import type { Collection, Item } from '../../store/types';

import { cn } from '../../lib/cn';
import { DuePill, PriorityChip, ProjectTag, TitleText } from './TaskRow';

export function TaskCard({
    collections,
    item,
    showProject,
    today,
}: {
    collections: Collection[];
    item: Item;
    /** Off on a collection's own board, where every card shares its project. */
    showProject?: boolean;
    today: string;
}) {
    return (
        <>
            <TitleText item={item} />
            <Description text={item.prose} />
            <Progress subtasks={item.subtasks} />
            <span className="mt-[9px] flex flex-wrap items-center gap-[7px]">
                {showProject && <ProjectTag collections={collections} item={item} />}
                <DuePill item={item} today={today} />
                <PriorityChip priority={item.priority} />
                <CommentCount count={item.comments?.length ?? 0} />
            </span>
        </>
    );
}

function CommentCount({ count }: { count: number }) {
    if (count === 0) return null;
    return (
        <span
            aria-label={`${count} ${count === 1 ? 'comment' : 'comments'}`}
            className="inline-flex items-center gap-[4px] text-label text-text3"
        >
            <svg
                aria-hidden
                fill="none"
                height={12}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
                width={12}
            >
                <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />
            </svg>
            {count}
        </span>
    );
}

/** The task's own prose, one line. Derived from the body — see `deriveProse`. */
function Description({ text }: { text?: string }) {
    if (!text) return null;
    return (
        <span className="mt-[5px] flex items-start gap-[6px] text-body text-text3">
            <svg
                aria-hidden
                className="mt-[3px] flex-none"
                fill="none"
                height={11}
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth={1.9}
                viewBox="0 0 12 12"
                width={11}
            >
                <path d="M1.5 2.5h9M1.5 6h9M1.5 9.5h5.5" />
            </svg>
            <span className="line-clamp-2 min-w-0">{text}</span>
        </span>
    );
}

/** The checklist tally. `subtasks` is derived from the body — see `derive.ts`. */
function Progress({ subtasks }: { subtasks?: Item['subtasks'] }) {
    if (!subtasks) return null;
    const percent = Math.round((subtasks.done / subtasks.total) * 100);
    const complete = subtasks.done === subtasks.total;
    return (
        <span className="mt-[10px] block">
            <span className="flex items-center justify-between text-label text-text3">
                Progress
                <span className="tabular-nums">
                    {subtasks.done}/{subtasks.total}
                </span>
            </span>
            <span
                aria-label={`${subtasks.done} of ${subtasks.total} subtasks done`}
                className="mt-[5px] block h-[5px] overflow-hidden rounded-sm bg-surface3"
                role="img"
            >
                <span
                    className={cn(
                        'block h-full rounded-sm',
                        complete ? 'bg-type-task-fg' : 'bg-accent',
                    )}
                    // The one value a class cannot carry: the share done.
                    style={{ width: `${percent}%` }}
                />
            </span>
        </span>
    );
}
