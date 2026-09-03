// Middle pane: the filtered item list for the current view (further narrowed by
// the ⌘K search box), with the selected row highlighted.

import { useEffect, useRef, useState } from 'react';

import type { Item, SortOrder } from '../../store/types';

import { formatRelative } from '../../lib/format';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { filterByView, SORT_LABELS, viewTitle } from '../../store/views';
import { Sort } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { listRow, tagRow, tagRowCompact } from './ListPane.css';

const AC = 'var(--ac, #5b5bd6)';

export function ListPane() {
    const items = useStore((s) => s.items);
    const collections = useStore((s) => s.collections);
    const view = useStore((s) => s.view);
    const selectedId = useStore((s) => s.selectedId);
    const selectItem = useStore((s) => s.selectItem);
    const density = useStore((s) => s.prefs.density);
    const search = useStore((s) => s.search)
        .trim()
        .toLowerCase();
    const searchResults = useStore((s) => s.searchResults);
    const searching = useStore((s) => s.searching);
    const sort = useStore((s) => s.sort);
    const setSort = useStore((s) => s.setSort);
    const [sortOpen, setSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!sortOpen) return;
        const onDown = (e: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        return () => window.removeEventListener('mousedown', onDown);
    }, [sortOpen]);

    // "List density" (Settings → Look & Feel): Compact also hides the tag row
    // until the row is hovered, exactly as the setting's description promises.
    const rowPadding = { Compact: '7px 14px', Cozy: '11px 14px', Roomy: '16px 14px' }[density];

    let filtered = filterByView(items, view, sort);
    if (search) {
        // The index searches full bodies; the client-side filter is the fallback
        // for queries too short to be worth a round-trip.
        const hits = searchResults && new Set(searchResults);
        filtered = hits
            ? filtered.filter((i) => hits.has(i.id))
            : filtered.filter((i) => matchesSearch(i, search));
    }

    return (
        <div
            style={{
                borderRight: '1px solid var(--border, #ececef)',
                display: 'flex',
                flex: 'none',
                flexDirection: 'column',
                minWidth: 0,
                width: 438,
            }}
        >
            <div
                style={{
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border, #ececef)',
                    display: 'flex',
                    flex: 'none',
                    gap: 10,
                    padding: '14px 16px',
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
                <div ref={sortRef} style={{ marginLeft: 'auto', position: 'relative' }}>
                    <span
                        onClick={() => setSortOpen((o) => !o)}
                        style={{
                            color: sortOpen ? '#1a1a1f' : '#b3b3bd',
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
                                        background: key === sort ? '#f0f0fb' : 'transparent',
                                        borderRadius: 7,
                                        color: key === sort ? 'var(--ac, #5b5bd6)' : '#3b3b44',
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
            </div>

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
                        {search ? (
                            <>
                                Nothing matches{' '}
                                <strong style={{ color: 'var(--text2, #6b6b76)' }}>{search}</strong>
                                {searching && ' yet…'}
                            </>
                        ) : (
                            'Nothing here yet.'
                        )}
                    </div>
                )}
                {filtered.map((item) => {
                    const meta = typeMeta(item.type);
                    const selected = item.id === selectedId;
                    return (
                        <div
                            className={listRow}
                            key={item.id}
                            onClick={() => selectItem(item.id)}
                            style={{
                                alignItems: 'flex-start',
                                borderBottom: '1px solid var(--border, #ececef)',
                                cursor: 'pointer',
                                display: 'flex',
                                gap: 12,
                                padding: rowPadding,
                                ...(selected
                                    ? {
                                          background: 'var(--ac-tint, #eeeef2)',
                                          boxShadow: `inset 2px 0 0 ${AC}`,
                                      }
                                    : {}),
                            }}
                        >
                            <span
                                style={{
                                    alignItems: 'center',
                                    background: meta.bg,
                                    borderRadius: 8,
                                    color: meta.fg,
                                    display: 'flex',
                                    flex: 'none',
                                    height: 32,
                                    justifyContent: 'center',
                                    marginTop: 1,
                                    width: 32,
                                }}
                            >
                                <Icon name={item.type} />
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        color: 'var(--text, #1a1a1f)',
                                        fontSize: 13.5,
                                        fontWeight: 600,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {item.title}
                                </div>
                                <div
                                    style={{
                                        color: 'var(--text3, #9a9aa5)',
                                        fontSize: 12,
                                        marginTop: 1,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {subtitle(item)}
                                </div>
                                <div className={density === 'Compact' ? tagRowCompact : tagRow}>
                                    {item.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            style={{
                                                background: 'var(--surface3, #f1f1f3)',
                                                borderRadius: 5,
                                                color: 'var(--text3, #9a9aa5)',
                                                fontFamily: 'ui-monospace,Menlo,monospace',
                                                fontSize: 10,
                                                padding: '1px 5px',
                                            }}
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <span
                                style={{
                                    color: 'var(--faint, #a8a8b0)',
                                    flex: 'none',
                                    fontSize: 11,
                                    marginTop: 1,
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {formatRelative(item.createdAt)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Fallback for queries too short to send to the index. It can only see what
 * `listItems()` returns — titles, tags and the derived preview — never bodies.
 */
function matchesSearch(item: Item, q: string): boolean {
    const hay =
        `${item.title} ${item.domain ?? ''} ${item.snippet ?? ''} ${item.summary ?? ''} ${item.tags.join(' ')}`.toLowerCase();
    return hay.includes(q);
}

function subtitle(item: Item): string {
    return item.domain || item.snippet || typeMeta(item.type).label;
}
