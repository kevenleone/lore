// The library pane: the filtered item list for the current view (further
// narrowed by the ⌘K search box and the filter row), in whichever of the three
// layouts is selected — List, Cards or Table.
//
// List keeps a permanent detail column beside it, so the pane is a fixed 438px
// column. Cards and Table need the room, so they take the whole area and the
// detail pane arrives over (drawer) or instead of (page) them; see App.tsx.

import { useEffect, useRef, useState } from 'react';

import type { IconName, SortOrder, View } from '../../store/types';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { activeFilterCount, SORT_LABELS, viewTitle, visibleItems } from '../../store/views';
import { useContextMenu } from '../common/ContextMenu';
import { EmptyState } from '../common/EmptyState';
import { Filter, Sort } from '../common/glyphs';
import { CardGrid } from './CardGrid';
import { FilterBar } from './FilterBar';
import { ItemContextMenu } from './ItemContextMenu';
import { ListRows } from './ListRows';
import { SelectionBar } from './SelectionBar';
import { TableView } from './TableView';
import { OpenModePicker, ViewModePicker } from './ViewModeControls';

/** Width of the List layout's column, which sits beside the detail pane. */
export const LIST_PANE_WIDTH = 438;

export function ListPane() {
    const items = useStore((state) => state.items);
    const collections = useStore((state) => state.collections);
    const view = useStore((state) => state.view);
    const viewMode = useStore((state) => state.prefs.viewMode);
    const search = useStore((state) => state.search)
        .trim()
        .toLowerCase();
    const searchResults = useStore((state) => state.searchResults);
    const searching = useStore((state) => state.searching);
    const sort = useStore((state) => state.sort);
    const setSort = useStore((state) => state.setSort);
    const filters = useStore((state) => state.filters);
    const [sortOpen, setSortOpen] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);
    const selectItem = useStore((state) => state.selectItem);
    const clearFilters = useStore((state) => state.clearFilters);
    const openCapture = useStore((state) => state.openCapture);
    const checkedIds = useStore((state) => state.checkedIds);
    const contextMenu = useContextMenu();

    useEffect(() => {
        if (!sortOpen) {
            return;
        }

        const onDown = (event: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setSortOpen(false);
            }
        };

        window.addEventListener('mousedown', onDown);

        return () => window.removeEventListener('mousedown', onDown);
    }, [sortOpen]);

    const filtered = visibleItems({ filters, items, search, searchResults, sort, view });

    const isList = viewMode === 'list';

    const openMenu = (event: React.MouseEvent, id: string) => {
        // Only in List: there, selecting merely moves the highlight, so the menu
        // and the detail column agree. In Cards and Table selecting is what opens
        // the item, and a right-click must not do that.
        if (isList) {
            selectItem(id);
        }

        contextMenu.openAt(event, id);
    };

    // Ticks on rows the list is no longer showing are not in the set a bulk
    // action would touch, so they are not in the count either.
    const checkedCount = filtered.filter((item) => checkedIds.includes(item.id)).length;
    const filterCount = activeFilterCount(filters);
    // A filter that is on must stay visible, or it silently shortens the list.
    const showFilters = filtersOpen || filterCount > 0;
    let filterColor = 'text-faint';

    if (showFilters) {
        filterColor = 'text-text';
    }

    if (filterCount > 0) {
        filterColor = 'text-accent';
    }

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
                    <button
                        aria-label="Filter"
                        aria-pressed={showFilters}
                        className={cn(
                            'flex items-center gap-[3px] border-none bg-transparent p-0 font-[inherit]',
                            filterColor,
                        )}
                        onClick={() => setFiltersOpen((o) => !o)}
                        type="button"
                    >
                        <Filter />
                        {filterCount > 0 && (
                            <span className="text-caption font-[650]">{filterCount}</span>
                        )}
                    </button>
                    <ViewModePicker />
                    <div className="relative" ref={sortRef}>
                        <button
                            aria-expanded={sortOpen}
                            aria-haspopup="listbox"
                            aria-label={`Sort: ${SORT_LABELS[sort]}`}
                            className={cn(
                                'flex border-none bg-transparent p-0',
                                sortOpen ? 'text-text' : 'text-faint',
                            )}
                            onClick={() => setSortOpen((o) => !o)}
                            type="button"
                        >
                            <Sort />
                        </button>
                        {sortOpen && (
                            <div className="absolute top-[26px] right-0 z-20 min-w-[150px] rounded-10 border border-border bg-surface p-[5px] shadow-[0_12px_30px_-10px_rgba(24,24,48,.3)]">
                                {(Object.keys(SORT_LABELS) as SortOrder[]).map((key) => (
                                    <button
                                        aria-selected={key === sort}
                                        className={cn(
                                            'w-full rounded-7 border-none px-[10px] py-[7px] text-left font-[inherit] text-body-lg',
                                            key === sort
                                                ? 'bg-accent-tint font-semibold text-accent'
                                                : 'bg-transparent font-normal text-text2',
                                        )}
                                        key={key}
                                        onClick={() => {
                                            setSort(key);
                                            setSortOpen(false);
                                        }}
                                        role="option"
                                        type="button"
                                    >
                                        {SORT_LABELS[key]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </span>
            </div>

            {showFilters && <FilterBar />}
            {checkedCount > 0 && <SelectionBar count={checkedCount} />}

            <div className="flex-1 overflow-auto">
                {/* Either the empty state or a layout — never both. Table drew its
                    header rule under the message, which read as a broken list. */}
                {filtered.length === 0 ? (
                    <LibraryEmpty
                        filterCount={filterCount}
                        onCapture={openCapture}
                        onClearFilters={clearFilters}
                        search={search}
                        searching={searching}
                        view={view}
                    />
                ) : (
                    <>
                        {viewMode === 'cards' && (
                            <CardGrid items={filtered} onContextMenu={openMenu} />
                        )}
                        {viewMode === 'table' && (
                            <TableView items={filtered} onContextMenu={openMenu} />
                        )}
                        {isList && <ListRows items={filtered} onContextMenu={openMenu} />}
                    </>
                )}
            </div>

            {contextMenu.target && (
                <ItemContextMenu onClose={contextMenu.close} target={contextMenu.target} />
            )}
        </div>
    );
}

/** The glyph the sidebar already uses for this view, so the two agree. */
const VIEW_ICON: Record<View['kind'], IconName> = {
    all: 'layers',
    collection: 'layers',
    files: 'file',
    inbox: 'inbox',
    links: 'globe',
    notes: 'note',
    starred: 'tag',
    tag: 'tag',
    today: 'calendar',
};

function LibraryEmpty({
    filterCount,
    onCapture,
    onClearFilters,
    search,
    searching,
    view,
}: {
    filterCount: number;
    onCapture: () => void;
    onClearFilters: () => void;
    search: string;
    searching: boolean;
    view: View;
}) {
    if (search) {
        return (
            <EmptyState
                hint={
                    searching
                        ? 'Still looking through the vault…'
                        : 'Try fewer words, or search from Everything instead of this view.'
                }
                icon="globe"
                title={
                    <>
                        Nothing matches <span className="text-text">{search}</span>
                    </>
                }
            />
        );
    }

    if (filterCount > 0) {
        return (
            <EmptyState
                action={{ label: 'Clear filters', onClick: onClearFilters }}
                hint="Everything here is hidden by the filters above."
                icon="tag"
                title="No items match these filters"
            />
        );
    }

    return (
        <EmptyState
            action={{ label: 'Quick Capture', onClick: onCapture }}
            hint="Anything you capture — a link, a note, a task — lands here."
            icon={VIEW_ICON[view.kind]}
            title="Nothing here yet"
        />
    );
}
