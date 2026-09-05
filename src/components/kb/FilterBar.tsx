// The library's filter row, under the list header. Search narrows by text; this
// narrows by facet — category, tag, collection and capture date — and the two
// compose with whichever view the sidebar has selected.
//
// The row only appears once something is filtered or the Filter button is
// pressed, so an unfiltered library keeps the header it had.

import { useEffect, useRef, useState } from 'react';

import type { FilterFacet, ItemType } from '../../store/types';

import { cn } from '../../lib/cn';
import { SEED_TAG_ORDER } from '../../store/seed';
import { TYPE_META } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { activeFilterCount, tagCounts } from '../../store/views';
import { ChevronDown } from '../common/glyphs';

/** Which popover is open, or `date` for the two date inputs. */
type MenuId = 'date' | FilterFacet;

const CATEGORIES = Object.keys(TYPE_META) as ItemType[];

export function FilterBar() {
    const items = useStore((s) => s.items);
    const collections = useStore((s) => s.collections);
    const filters = useStore((s) => s.filters);
    const toggleFilter = useStore((s) => s.toggleFilter);
    const setFilters = useStore((s) => s.setFilters);
    const clearFilters = useStore((s) => s.clearFilters);
    const vaultTagOrder = useStore((s) => s.tagOrder);

    const [menu, setMenu] = useState<MenuId | null>(null);
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menu) return;
        const onDown = (e: MouseEvent) => {
            if (barRef.current && !barRef.current.contains(e.target as Node)) setMenu(null);
        };
        window.addEventListener('mousedown', onDown);
        return () => window.removeEventListener('mousedown', onDown);
    }, [menu]);

    const tags = tagCounts(items, vaultTagOrder.length ? vaultTagOrder : SEED_TAG_ORDER);
    const count = activeFilterCount(filters);

    return (
        <div
            className="flex flex-none flex-wrap items-center gap-[6px] border-b border-border px-4 py-2"
            ref={barRef}
        >
            <Menu
                active={filters.categories.length > 0}
                label={facetLabel('Category', filters.categories.length)}
                onToggle={() => setMenu((m) => (m === 'categories' ? null : 'categories'))}
                open={menu === 'categories'}
            >
                {CATEGORIES.map((type) => (
                    <Option
                        checked={filters.categories.includes(type)}
                        key={type}
                        label={TYPE_META[type].label}
                        onClick={() => toggleFilter('categories', type)}
                    />
                ))}
            </Menu>

            <Menu
                active={filters.tags.length > 0}
                label={facetLabel('Tag', filters.tags.length)}
                onToggle={() => setMenu((m) => (m === 'tags' ? null : 'tags'))}
                open={menu === 'tags'}
            >
                {tags.length === 0 && <Empty>No tags yet</Empty>}
                {tags.map((tag) => (
                    <Option
                        checked={filters.tags.includes(tag.name)}
                        count={tag.count}
                        key={tag.name}
                        label={`#${tag.name}`}
                        onClick={() => toggleFilter('tags', tag.name)}
                    />
                ))}
            </Menu>

            <Menu
                active={filters.collectionIds.length > 0}
                label={facetLabel('Collection', filters.collectionIds.length)}
                onToggle={() => setMenu((m) => (m === 'collectionIds' ? null : 'collectionIds'))}
                open={menu === 'collectionIds'}
            >
                {collections.length === 0 && <Empty>No collections yet</Empty>}
                {collections.map((collection) => (
                    <Option
                        checked={filters.collectionIds.includes(collection.id)}
                        color={collection.color}
                        key={collection.id}
                        label={collection.name}
                        onClick={() => toggleFilter('collectionIds', collection.id)}
                    />
                ))}
            </Menu>

            <Menu
                active={!!filters.from || !!filters.to}
                label={dateLabel(filters.from, filters.to)}
                onToggle={() => setMenu((m) => (m === 'date' ? null : 'date'))}
                open={menu === 'date'}
                width={230}
            >
                <DateField
                    label="From"
                    onChange={(from) => setFilters({ from })}
                    value={filters.from}
                />
                <DateField label="To" onChange={(to) => setFilters({ to })} value={filters.to} />
            </Menu>

            {count > 0 && (
                <button
                    className="ml-[2px] cursor-pointer border-none bg-transparent px-[6px] py-1 font-[inherit] text-body text-text3 hover:bg-hover"
                    onClick={() => {
                        clearFilters();
                        setMenu(null);
                    }}
                    type="button"
                >
                    Clear {count === 1 ? 'filter' : `all ${count}`}
                </button>
            )}
        </div>
    );
}

function Checkbox({ checked }: { checked: boolean }) {
    return (
        <span
            className={cn(
                'flex h-[14px] w-[14px] flex-none items-center justify-center rounded-sm border-[1.5px]',
                checked ? 'border-accent bg-accent text-white' : 'border-border',
            )}
        >
            {checked && (
                <svg fill="none" height="10" viewBox="0 0 24 24" width="10">
                    <polyline
                        points="20 6 9 17 4 12"
                        stroke="#fff"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3.2"
                    />
                </svg>
            )}
        </span>
    );
}

function DateField({
    label,
    onChange,
    value,
}: {
    label: string;
    onChange: (value: null | string) => void;
    value: null | string;
}) {
    return (
        <label className="flex items-center gap-2 px-2 py-[5px] text-body text-text2">
            <span className="w-[34px]">{label}</span>
            <input
                className="min-w-0 flex-1 rounded-7 border border-border bg-surface3 px-[7px] py-1 font-[inherit] text-text outline-none"
                onChange={(e) => onChange(e.target.value || null)}
                type="date"
                value={value ?? ''}
            />
        </label>
    );
}

function dateLabel(from: null | string, to: null | string): string {
    if (from && to) return `${short(from)} – ${short(to)}`;
    if (from) return `After ${short(from)}`;
    if (to) return `Before ${short(to)}`;
    return 'Date';
}

function Empty({ children }: { children: React.ReactNode }) {
    return <div className="px-[10px] py-[7px] text-body text-text3">{children}</div>;
}

function facetLabel(label: string, count: number): string {
    return count === 0 ? label : `${label} · ${count}`;
}

function Menu({
    active,
    children,
    label,
    onToggle,
    open,
    width = 200,
}: {
    active: boolean;
    children: React.ReactNode;
    label: string;
    onToggle: () => void;
    open: boolean;
    width?: number;
}) {
    return (
        <div className="relative">
            <button
                aria-expanded={open}
                className={cn(
                    'flex cursor-pointer items-center gap-[5px] rounded-lg border px-2 py-1 font-[inherit] text-body',
                    active
                        ? 'border-transparent bg-accent-tint font-[590] text-accent'
                        : 'border-border bg-surface font-medium text-text2',
                )}
                onClick={onToggle}
                type="button"
            >
                {label}
                <ChevronDown size={11} />
            </button>
            {open && (
                <div
                    className="absolute top-[30px] left-0 z-25 max-h-[280px] overflow-y-auto rounded-10 border border-border bg-surface p-[5px] shadow-[0_12px_30px_-10px_rgba(24,24,48,.3)]"
                    style={{ width }}
                >
                    {children}
                </div>
            )}
        </div>
    );
}

function Option({
    checked,
    color,
    count,
    label,
    onClick,
}: {
    checked: boolean;
    color?: string;
    count?: number;
    label: string;
    onClick: () => void;
}) {
    return (
        <div
            className={cn(
                'flex cursor-pointer items-center gap-2 rounded-7 px-[9px] py-[6px] text-body-lg hover:bg-hover',
                checked ? 'font-[590] text-accent' : 'font-normal text-text2',
            )}
            onClick={onClick}
        >
            <Checkbox checked={checked} />
            {color && (
                <span
                    className="h-2 w-2 flex-none rounded-full"
                    // The collection's own colour, which the user picks.
                    style={{ background: color }}
                />
            )}
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {count !== undefined && (
                <span className="text-label font-normal text-faint tabular-nums">{count}</span>
            )}
        </div>
    );
}

/** `2026-09-05` → `5 Sep`. Parsed as local so the label matches what was picked. */
function short(day: string): string {
    const [year, month, date] = day.split('-').map(Number);
    return new Date(year, month - 1, date).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
    });
}
