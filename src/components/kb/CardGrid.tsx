// The Cards layout: a responsive grid of preview tiles. Each card leads with
// its banner — the real image once it loads, the hashed placeholder before
// that — and closes with the collection it lives in.

import type { Item } from '../../store/types';

import { hasBanner } from '../../lib/banner';
import { formatRelative } from '../../lib/format';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { collectionFor } from '../../store/views';
import { Icon } from '../common/Icon';
import { ItemBanner } from './ItemBanner';
import { subtitle } from './itemText';

const AC = 'var(--ac, #5b5bd6)';

export function CardGrid({ items }: { items: Item[] }) {
    const collections = useStore((s) => s.collections);
    const selectedId = useStore((s) => s.selectedId);
    const selectItem = useStore((s) => s.selectItem);

    return (
        <div
            style={{
                alignContent: 'start',
                display: 'grid',
                gap: 14,
                gridTemplateColumns: 'repeat(auto-fill, minmax(216px, 1fr))',
                padding: 16,
            }}
        >
            {items.map((item) => {
                const meta = typeMeta(item.type);
                const coll = collectionFor(item, collections);
                const selected = item.id === selectedId;
                return (
                    <div
                        key={item.id}
                        onClick={() => selectItem(item.id)}
                        style={{
                            background: 'var(--surface, #fff)',
                            border: `1px solid ${selected ? AC : 'var(--border, #ececef)'}`,
                            borderRadius: 12,
                            boxShadow: selected ? `0 0 0 2px var(--ac-tint, #eeeef2)` : undefined,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                background: 'var(--surface3, #f1f1f3)',
                                flex: 'none',
                                height: 118,
                                overflow: 'hidden',
                                position: 'relative',
                            }}
                        >
                            {hasBanner(item) ? (
                                <ItemBanner chip item={item} />
                            ) : (
                                <div
                                    style={{
                                        alignItems: 'center',
                                        background: meta.bg,
                                        color: meta.fg,
                                        display: 'flex',
                                        height: '100%',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Icon name={item.type} size={26} strokeWidth={1.5} />
                                </div>
                            )}
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                flex: 1,
                                flexDirection: 'column',
                                gap: 5,
                                padding: '11px 12px 12px',
                            }}
                        >
                            <div
                                style={{
                                    alignItems: 'center',
                                    color: meta.fg,
                                    display: 'flex',
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    gap: 6,
                                    letterSpacing: '.04em',
                                    textTransform: 'uppercase',
                                }}
                            >
                                <Icon name={item.type} size={12} strokeWidth={2} />
                                {meta.label}
                            </div>
                            <div
                                style={{
                                    color: 'var(--text, #1a1a1f)',
                                    display: '-webkit-box',
                                    fontSize: 13.5,
                                    fontWeight: 620,
                                    lineHeight: 1.35,
                                    overflow: 'hidden',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 2,
                                }}
                            >
                                {item.title}
                            </div>
                            <div
                                style={{
                                    color: 'var(--text3, #9a9aa5)',
                                    fontSize: 11.5,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {subtitle(item)}
                            </div>
                            <div
                                style={{
                                    alignItems: 'center',
                                    display: 'flex',
                                    gap: 6,
                                    marginTop: 'auto',
                                    paddingTop: 8,
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
                                        color: 'var(--text3, #9a9aa5)',
                                        fontSize: 11.5,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {coll?.name ?? 'Unfiled'}
                                </span>
                                <span
                                    style={{
                                        color: 'var(--faint, #a8a8b0)',
                                        fontSize: 11,
                                        marginLeft: 'auto',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {formatRelative(item.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
