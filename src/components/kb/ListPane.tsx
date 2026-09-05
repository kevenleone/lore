// The library pane: the filtered item list for the current view (further
// narrowed by the ⌘K search box and the filter row), in whichever of the three
// layouts is selected — List, Cards or Table.
//
// List keeps a permanent detail column beside it, so the pane is a fixed 438px
// column. Cards and Table need the room, so they take the whole area and the
// detail pane arrives over (drawer) or instead of (page) them; see App.tsx.

import { useEffect, useRef, useState } from 'react';

import type { SortOrder } from '../../store/types';

import { useStore } from '../../store/useStore';
import {
    activeFilterCount,
    applyFilters,
    filterByView,
    SORT_LABELS,
    viewTitle,
} from '../../store/views';
import { Filter, Sort } from '../common/glyphs';
import { CardGrid } from './CardGrid';
import { FilterBar } from './FilterBar';
import { matchesSearch } from './itemText';
import { ListRows } from './ListRows';
import { TableView } from './TableView';
import { OpenModePicker, ViewModePicker } from './ViewModeControls';

/** Width of the List layout's column, which sits beside the detail pane. */
export const LIST_PANE_WIDTH = 438;

export function ListPane() {
    const items = useStore((s) => s.items);
    const collections = useStore((s) => s.collections);
    const view = useStore((s) => s.view);
    const viewMode = useStore((s) => s.prefs.viewMode);
    const search = useStore((s) => s.search)
        .trim()
        .toLowerCase();
    const searchResults = useStore((s) => s.searchResults);
    const searching = useStore((s) => s.searching);
    const sort = useStore((s) => s.sort);
    const setSort = useStore((s) => s.setSort);
    const filters = useStore((s) => s.filters);
    const [sortOpen, setSortOpen] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sortOpen) return;
        const onDown = (e: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        return () => window.removeEventListener('mousedown', onDown);
    }, [sortOpen]);

    let filtered = applyFilters(filterByView(items, view, sort), filters);
    if (search) {
        // The index searches full bodies; the client-side filter is the fallback
        // for queries too short to be worth a round-trip.
        const hits = searchResults && new Set(searchResults);
        filtered = hits
            ? filtered.filter((i) => hits.has(i.id))
            : filtered.filter((i) => matchesSearch(i, search));
    }

    const isList = viewMode === 'list';
    const filterCount = activeFilterCount(filters);
    // A filter that is on must stay visible, or it silently shortens the list.
    const showFilters = filtersOpen || filterCount > 0;
    let filterColor = 'var(--faint, #a8a8b0)';
    if (showFilters) filterColor = 'var(--text, #1a1a1f)';
    if (filterCount > 0) filterColor = 'var(--ac, #5b5bd6)';

    return (
        <div
            style={{
                borderRight: '1px solid var(--border, #ececef)',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                ...(isList ? { flex: 'none', width: LIST_PANE_WIDTH } : { flex: 1 }),
            }}
        >
            <div
                style={{
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border, #ececef)',
                    display: 'flex',
                    flex: 'none',
                    gap: 10,
                    padding: '11px 16px',
                }}
            >
                <span style={{ fontSize: 15, fontWeight: 680 }}>
                    {viewTitle(view, collections)}
                </span>
                <span
                    style={{
                        background: 'var(--surface3, #f1f1f3)',
                        borderRadius: 20,
                        color: 'var(--faint, #a8a8b0)',
                        fontSize: 12,
                        fontVariantNumeric: 'tabular-nums',
                        padding: '1px 8px',
                    }}
                >
                    {filtered.length}
                </span>
                <span
                    style={{
                        alignItems: 'center',
                        display: 'flex',
                        gap: 8,
                        marginLeft: 'auto',
                    }}
                >
                    {!isList && <OpenModePicker />}
                    <span
                        aria-label="Filter"
                        aria-pressed={showFilters}
                        onClick={() => setFiltersOpen((o) => !o)}
                        style={{
                            alignItems: 'center',
                            color: filterColor,
                            cursor: 'pointer',
                            display: 'flex',
                            gap: 3,
                        }}
                        title="Filter"
                    >
                        <Filter />
                        {filterCount > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 650 }}>{filterCount}</span>
                        )}
                    </span>
                    <ViewModePicker />
                    <div ref={sortRef} style={{ position: 'relative' }}>
                        <span
                            onClick={() => setSortOpen((o) => !o)}
                            style={{
                                color: sortOpen ? 'var(--text, #1a1a1f)' : 'var(--faint, #a8a8b0)',
                                cursor: 'pointer',
                                display: 'flex',
                            }}
                            title={`Sort: ${SORT_LABELS[sort]}`}
                        >
                            <Sort />
                        </span>
                        {sortOpen && (
                            <div
                                style={{
                                    background: 'var(--surface, #fff)',
                                    border: '1px solid var(--border, #ececef)',
                                    borderRadius: 10,
                                    boxShadow: '0 12px 30px -10px rgba(24,24,48,.3)',
                                    minWidth: 150,
                                    padding: 5,
                                    position: 'absolute',
                                    right: 0,
                                    top: 26,
                                    zIndex: 20,
                                }}
                            >
                                {(Object.keys(SORT_LABELS) as SortOrder[]).map((key) => (
                                    <div
                                        key={key}
                                        onClick={() => {
                                            setSort(key);
                                            setSortOpen(false);
                                        }}
                                        style={{
                                            background:
                                                key === sort
                                                    ? 'var(--ac-tint, #eeeef2)'
                                                    : 'transparent',
                                            borderRadius: 7,
                                            color:
                                                key === sort
                                                    ? 'var(--ac, #5b5bd6)'
                                                    : 'var(--text2, #6b6b76)',
                                            cursor: 'pointer',
                                            fontSize: 13,
                                            fontWeight: key === sort ? 600 : 400,
                                            padding: '7px 10px',
                                        }}
                                    >
                                        {SORT_LABELS[key]}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </span>
            </div>

            {showFilters && <FilterBar />}

            <div style={{ flex: 1, overflow: 'auto' }}>
                {filtered.length === 0 && (
                    <div
                        style={{
                            color: 'var(--text3, #9a9aa5)',
                            fontSize: 13,
                            lineHeight: 1.6,
                            padding: '28px 20px',
                            textAlign: 'center',
                        }}
                    >
                        {search && (
                            <>
                                Nothing matches{' '}
                                <strong style={{ color: 'var(--text2, #6b6b76)' }}>{search}</strong>
                                {searching && ' yet…'}
                            </>
                        )}
                        {!search &&
                            (filterCount > 0
                                ? 'Nothing matches these filters.'
                                : 'Nothing here yet.')}
                    </div>
                )}
                {viewMode === 'cards' && <CardGrid items={filtered} />}
                {viewMode === 'table' && <TableView items={filtered} />}
                {isList && <ListRows items={filtered} />}
            </div>
        </div>
    );
}
