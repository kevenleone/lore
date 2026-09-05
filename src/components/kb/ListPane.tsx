// The library pane: the filtered item list for the current view (further
// narrowed by the ⌘K search box and the filter row), in whichever of the three
// layouts is selected — List, Cards or Table.
//
// List keeps a permanent detail column beside it, so the pane is a fixed 438px
// column. Cards and Table need the room, so they take the whole area and the
// detail pane arrives over (drawer) or instead of (page) them; see App.tsx.

import { useEffect, useRef, useState } from 'react';

import type { SortOrder } from '../../store/types';

import { cn } from '../../lib/cn';
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
    let filterColor = 'text-faint';
    if (showFilters) filterColor = 'text-text';
    if (filterCount > 0) filterColor = 'text-accent';

    return (
        <div
            className={cn(
                'flex min-w-0 flex-col border-r border-border',
                isList ? 'flex-none' : 'flex-1',
            )}
            // The List column's width is shared with App.tsx's layout, so it
            // stays a constant rather than becoming a class.
            style={isList ? { width: LIST_PANE_WIDTH } : undefined}
        >
            <div className="flex flex-none items-center gap-[10px] border-b border-border px-4 py-[11px]">
                <span className="text-title-lg font-[680]">{viewTitle(view, collections)}</span>
                <span className="rounded-[20px] bg-surface3 px-2 py-px text-body-sm text-faint tabular-nums">
                    {filtered.length}
                </span>
                <span className="ml-auto flex items-center gap-2">
                    {!isList && <OpenModePicker />}
                    <span
                        aria-label="Filter"
                        aria-pressed={showFilters}
                        className={cn('flex cursor-pointer items-center gap-[3px]', filterColor)}
                        onClick={() => setFiltersOpen((o) => !o)}
                        title="Filter"
                    >
                        <Filter />
                        {filterCount > 0 && (
                            <span className="text-caption font-[650]">{filterCount}</span>
                        )}
                    </span>
                    <ViewModePicker />
                    <div className="relative" ref={sortRef}>
                        <span
                            className={cn(
                                'flex cursor-pointer',
                                sortOpen ? 'text-text' : 'text-faint',
                            )}
                            onClick={() => setSortOpen((o) => !o)}
                            title={`Sort: ${SORT_LABELS[sort]}`}
                        >
                            <Sort />
                        </span>
                        {sortOpen && (
                            <div className="absolute top-[26px] right-0 z-20 min-w-[150px] rounded-10 border border-border bg-surface p-[5px] shadow-[0_12px_30px_-10px_rgba(24,24,48,.3)]">
                                {(Object.keys(SORT_LABELS) as SortOrder[]).map((key) => (
                                    <div
                                        className={cn(
                                            'cursor-pointer rounded-7 px-[10px] py-[7px] text-body-lg',
                                            key === sort
                                                ? 'bg-accent-tint font-semibold text-accent'
                                                : 'bg-transparent font-normal text-text2',
                                        )}
                                        key={key}
                                        onClick={() => {
                                            setSort(key);
                                            setSortOpen(false);
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

            <div className="flex-1 overflow-auto">
                {filtered.length === 0 && (
                    <div className="px-5 py-7 text-center text-body-lg leading-[1.6] text-text3">
                        {search && (
                            <>
                                Nothing matches <strong className="text-text2">{search}</strong>
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
