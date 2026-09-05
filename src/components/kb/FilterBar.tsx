// The library's filter row, under the list header. Search narrows by text; this
// narrows by facet — category, tag, collection and capture date — and the two
// compose with whichever view the sidebar has selected.
//
// The row only appears once something is filtered or the Filter button is
// pressed, so an unfiltered library keeps the header it had.

import { useEffect, useRef, useState } from 'react';

import type { FilterFacet, ItemType } from '../../store/types';

import { SEED_TAG_ORDER } from '../../store/seed';
import { TYPE_META } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { activeFilterCount, tagCounts } from '../../store/views';
import { hoverable } from '../../theme/util.css';
import { ChevronDown } from '../common/glyphs';

const AC = 'var(--ac, #5b5bd6)';

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
            ref={barRef}
            style={{
                alignItems: 'center',
                borderBottom: '1px solid var(--border, #ececef)',
                display: 'flex',
                flex: 'none',
                flexWrap: 'wrap',
                gap: 6,
                padding: '8px 16px',
            }}
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
                    className={hoverable}
                    onClick={() => {
                        clearFilters();
                        setMenu(null);
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text3, #9a9aa5)',
                        cursor: 'pointer',
                        font: 'inherit',
                        fontSize: 12.5,
                        marginLeft: 2,
                        padding: '4px 6px',
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
            style={{
                alignItems: 'center',
                border: `1.5px solid ${checked ? AC : 'var(--border, #d8d8de)'}`,
                borderRadius: 4,
                display: 'flex',
                flex: 'none',
                height: 14,
                justifyContent: 'center',
                width: 14,
                ...(checked ? { background: AC, color: '#fff' } : {}),
            }}
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
        <label
            style={{
                alignItems: 'center',
                color: 'var(--text2, #6b6b76)',
                display: 'flex',
                fontSize: 12.5,
                gap: 8,
                padding: '5px 8px',
            }}
        >
            <span style={{ width: 34 }}>{label}</span>
            <input
                onChange={(e) => onChange(e.target.value || null)}
                style={{
                    background: 'var(--surface3, #f1f1f3)',
                    border: '1px solid var(--border, #ececef)',
                    borderRadius: 7,
                    color: 'var(--text, #1a1a1f)',
                    flex: 1,
                    font: 'inherit',
                    minWidth: 0,
                    outline: 'none',
                    padding: '4px 7px',
                }}
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
    return (
        <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12.5, padding: '7px 10px' }}>
            {children}
        </div>
    );
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
        <div style={{ position: 'relative' }}>
            <button
                aria-expanded={open}
                onClick={onToggle}
                style={{
                    alignItems: 'center',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    fontFamily: 'inherit',
                    fontSize: 12.5,
                    gap: 5,
                    padding: '4px 8px',
                    ...(active
                        ? {
                              background: 'var(--ac-tint, #eeeef2)',
                              border: '1px solid transparent',
                              color: AC,
                              fontWeight: 590,
                          }
                        : {
                              background: 'var(--surface, #fff)',
                              border: '1px solid var(--border, #ececef)',
                              color: 'var(--text2, #6b6b76)',
                              fontWeight: 500,
                          }),
                }}
                type="button"
            >
                {label}
                <ChevronDown size={11} />
            </button>
            {open && (
                <div
                    style={{
                        background: 'var(--surface, #fff)',
                        border: '1px solid var(--border, #ececef)',
                        borderRadius: 10,
                        boxShadow: '0 12px 30px -10px rgba(24,24,48,.3)',
                        left: 0,
                        maxHeight: 280,
                        overflowY: 'auto',
                        padding: 5,
                        position: 'absolute',
                        top: 30,
                        width,
                        zIndex: 25,
                    }}
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
            className={hoverable}
            onClick={onClick}
            style={{
                alignItems: 'center',
                borderRadius: 7,
                color: checked ? AC : 'var(--text2, #6b6b76)',
                cursor: 'pointer',
                display: 'flex',
                fontSize: 13,
                fontWeight: checked ? 590 : 400,
                gap: 8,
                padding: '6px 9px',
            }}
        >
            <Checkbox checked={checked} />
            {color && (
                <span
                    style={{
                        background: color,
                        borderRadius: '50%',
                        flex: 'none',
                        height: 8,
                        width: 8,
                    }}
                />
            )}
            <span
                style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </span>
            {count !== undefined && (
                <span
                    style={{
                        color: 'var(--faint, #a8a8b0)',
                        fontSize: 11.5,
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 400,
                    }}
                >
                    {count}
                </span>
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
