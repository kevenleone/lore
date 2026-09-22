// The board's filter. Narrow by what a Lore task actually has — its words, its
// priority, its tags, and whether it is late. There is no assignee or value to
// filter by, so there is no control for one.

import { useEffect, useRef, useState } from 'react';

import type { Item, Priority } from '../../store/types';

import { cn } from '../../lib/cn';
import { boardFilterCount } from '../../store/tasks';
import { PRIORITIES } from '../../store/types';
import { useStore } from '../../store/useStore';
import { Filter, Search } from '../common/glyphs';

const CHIP = 'rounded-md border px-[7px] py-[2.5px] font-[inherit] text-label';
const CHIP_ON = 'border-solid border-transparent bg-accent-tint font-semibold text-accent';
const CHIP_OFF = 'border-dashed border-dash bg-transparent font-medium text-faint';

export function BoardFilterBar({ tasks }: { tasks: Item[] }) {
    const filter = useStore((state) => state.boardFilter);
    const setBoardFilter = useStore((state) => state.setBoardFilter);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onDown = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        window.addEventListener('mousedown', onDown);

        return () => window.removeEventListener('mousedown', onDown);
    }, [open]);

    const active = boardFilterCount(filter);
    // Only tags that are actually on this board — a facet that can only ever
    // empty the screen is not worth offering.
    const tags = [...new Set(tasks.flatMap((task) => task.tags))].sort();

    const toggle = <T,>(list: T[], value: T): T[] =>
        list.includes(value) ? list.filter((t) => t !== value) : [...list, value];

    return (
        <div className="flex flex-none items-center gap-2 border-b border-border px-[14px] py-[8px]">
            <span className="flex min-w-0 flex-1 items-center gap-2 rounded-7 bg-surface3 px-[9px] py-[5px]">
                <Search className="flex-none text-faint" size={13} />
                <input
                    aria-label="Search this board"
                    className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-body text-text outline-none"
                    onChange={(event) => setBoardFilter({ query: event.target.value })}
                    placeholder="Search tasks…"
                    value={filter.query}
                />
            </span>

            <div className="relative" ref={ref}>
                <button
                    aria-expanded={open}
                    className={cn(
                        'inline-flex items-center gap-[6px] rounded-7 border px-[9px] py-[5px] font-[inherit] text-body',
                        active > 0
                            ? 'border-accent-border bg-accent-tint text-accent'
                            : 'border-border bg-transparent text-text2 hover:bg-hover',
                    )}
                    onClick={() => setOpen((o) => !o)}
                    type="button"
                >
                    <Filter size={13} />
                    Filter
                    {active > 0 && <span className="tabular-nums">{active}</span>}
                </button>

                {open && (
                    <div className="absolute top-[34px] right-0 z-25 w-[260px] rounded-10 border border-border bg-surface p-3 shadow-float">
                        <Section label="Priority">
                            {PRIORITIES.map((p) => (
                                <button
                                    aria-pressed={filter.priorities.includes(p)}
                                    className={cn(
                                        CHIP,
                                        'capitalize',
                                        filter.priorities.includes(p) ? CHIP_ON : CHIP_OFF,
                                    )}
                                    key={p}
                                    onClick={() =>
                                        setBoardFilter({
                                            priorities: toggle<Priority>(filter.priorities, p),
                                        })
                                    }
                                    type="button"
                                >
                                    {p}
                                </button>
                            ))}
                        </Section>

                        {tags.length > 0 && (
                            <Section label="Tags">
                                {tags.map((tag) => (
                                    <button
                                        aria-pressed={filter.tags.includes(tag)}
                                        className={cn(
                                            CHIP,
                                            filter.tags.includes(tag) ? CHIP_ON : CHIP_OFF,
                                        )}
                                        key={tag}
                                        onClick={() =>
                                            setBoardFilter({ tags: toggle(filter.tags, tag) })
                                        }
                                        type="button"
                                    >
                                        #{tag}
                                    </button>
                                ))}
                            </Section>
                        )}

                        <Section label="Due">
                            <button
                                aria-pressed={filter.overdue}
                                className={cn(CHIP, filter.overdue ? CHIP_ON : CHIP_OFF)}
                                onClick={() => setBoardFilter({ overdue: !filter.overdue })}
                                type="button"
                            >
                                Overdue only
                            </button>
                        </Section>

                        {active > 0 && (
                            <button
                                className="mt-3 w-full rounded-7 border-none bg-surface3 py-[6px] font-[inherit] text-body text-text2 hover:brightness-[.97]"
                                onClick={() => setBoardFilter(null)}
                                type="button"
                            >
                                Clear filter
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function Section({ children, label }: { children: React.ReactNode; label: string }) {
    return (
        <div className="mb-3 last:mb-0">
            <div className="text-caption font-[680] tracking-[.06em] text-faint uppercase">
                {label}
            </div>
            <div className="mt-[7px] flex flex-wrap gap-[5px]">{children}</div>
        </div>
    );
}
