// The Table layout: one grid row per item under a sticky header, for scanning
// a large library by collection, tag or type rather than by title alone.
//
// The header and the rows share GRID_COLUMNS so the columns line up without a
// real <table>, which could not give the rows their own hover and selection
// treatment as cheaply.

import type { Item } from '../../store/types';

import { hasBanner } from '../../lib/banner';
import { formatRelative } from '../../lib/format';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { collectionFor } from '../../store/views';
import { Icon } from '../common/Icon';
import { ItemBanner } from './ItemBanner';
import { subtitle } from './itemText';
import { tableRow } from './ListPane.css';

const AC = 'var(--ac, #5b5bd6)';

const GRID_COLUMNS = 'minmax(240px, 1fr) 168px 176px 116px 92px';

const COLUMNS = ['Item', 'Collection', 'Tags', 'Type', 'Added'];

export function TableView({ items }: { items: Item[] }) {
    const collections = useStore((s) => s.collections);
    const selectedId = useStore((s) => s.selectedId);
    const selectItem = useStore((s) => s.selectItem);

    return (
        <>
            <div
                style={{
                    alignItems: 'center',
                    background: 'var(--surface2, #fafafa)',
                    borderBottom: '1px solid var(--border, #ececef)',
                    color: 'var(--faint, #a8a8b0)',
                    display: 'grid',
                    fontSize: 10.5,
                    fontWeight: 680,
                    gap: 16,
                    gridTemplateColumns: GRID_COLUMNS,
                    letterSpacing: '.07em',
                    padding: '9px 18px',
                    position: 'sticky',
                    textTransform: 'uppercase',
                    top: 0,
                    zIndex: 2,
                }}
            >
                {COLUMNS.map((label, i) => (
                    <span
                        key={label}
                        style={{ textAlign: i === COLUMNS.length - 1 ? 'right' : 'left' }}
                    >
                        {label}
                    </span>
                ))}
            </div>
            {items.map((item) => {
                const meta = typeMeta(item.type);
                const coll = collectionFor(item, collections);
                const selected = item.id === selectedId;
                return (
                    <div
                        className={tableRow}
                        key={item.id}
                        onClick={() => selectItem(item.id)}
                        style={{
                            alignItems: 'center',
                            borderBottom: '1px solid var(--border-soft, #f0f0f2)',
                            cursor: 'pointer',
                            display: 'grid',
                            gap: 16,
                            gridTemplateColumns: GRID_COLUMNS,
                            padding: '9px 18px',
                            ...(selected
                                ? {
                                      background: 'var(--sel, #f4f4f6)',
                                      boxShadow: `inset 2px 0 0 ${AC}`,
                                  }
                                : {}),
                        }}
                    >
                        <div
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                gap: 11,
                                minWidth: 0,
                            }}
                        >
                            {hasBanner(item) ? (
                                <span
                                    style={{
                                        background: 'var(--surface3, #f1f1f3)',
                                        borderRadius: 5,
                                        flex: 'none',
                                        height: 30,
                                        overflow: 'hidden',
                                        position: 'relative',
                                        width: 44,
                                    }}
                                >
                                    <ItemBanner item={item} />
                                </span>
                            ) : (
                                <span
                                    style={{
                                        alignItems: 'center',
                                        background: meta.bg,
                                        borderRadius: 5,
                                        color: meta.fg,
                                        display: 'flex',
                                        flex: 'none',
                                        height: 30,
                                        justifyContent: 'center',
                                        width: 44,
                                    }}
                                >
                                    <Icon name={item.type} size={15} />
                                </span>
                            )}
                            <span style={{ minWidth: 0 }}>
                                <span
                                    style={{
                                        color: 'var(--text, #1a1a1f)',
                                        display: 'block',
                                        fontSize: 13,
                                        fontWeight: 590,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {item.title}
                                </span>
                                <span
                                    style={{
                                        color: 'var(--text3, #9a9aa5)',
                                        display: 'block',
                                        fontSize: 11.5,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {subtitle(item)}
                                </span>
                            </span>
                        </div>
                        <div
                            style={{
                                alignItems: 'center',
                                color: 'var(--text2, #6b6b76)',
                                display: 'flex',
                                fontSize: 12.5,
                                gap: 7,
                                minWidth: 0,
                            }}
                        >
                            <span
                                style={{
                                    background: coll?.color ?? 'var(--faint, #a8a8b0)',
                                    borderRadius: 2,
                                    flex: 'none',
                                    height: 8,
                                    width: 8,
                                }}
                            />
                            <span
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {coll?.name ?? 'Unfiled'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 5, overflow: 'hidden' }}>
                            {item.tags.map((tag) => (
                                <span
                                    key={tag}
                                    style={{
                                        background: 'var(--surface3, #f1f1f3)',
                                        borderRadius: 5,
                                        color: 'var(--text3, #9a9aa5)',
                                        fontFamily: 'ui-monospace,Menlo,monospace',
                                        fontSize: 10.5,
                                        padding: '2px 6px',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                        <div style={{ color: 'var(--text2, #6b6b76)', fontSize: 12 }}>
                            {meta.label}
                        </div>
                        <div
                            style={{
                                color: 'var(--faint, #a8a8b0)',
                                fontSize: 12,
                                fontVariantNumeric: 'tabular-nums',
                                textAlign: 'right',
                            }}
                        >
                            {formatRelative(item.createdAt)}
                        </div>
                    </div>
                );
            })}
        </>
    );
}
