// "Related to" — the item's own frontmatter links, editable — and "Linked from",
// the inbound side, which the sidecar answers from its links table.
//
// Writing `related` back is safe even for a vault edited elsewhere: the sidecar
// serialises resolved ids to `[[stem]]` and appends every link it could not
// resolve untouched (see sidecar/src/links.ts).

import { useMemo, useState } from 'react';

import type { Item } from '../../../store/types';

import { typeMeta } from '../../../store/typeMeta';
import { useStore } from '../../../store/useStore';
import { hoverCard } from '../../../theme/util.css';
import { Plus, Search } from '../../common/glyphs';
import { Icon } from '../../common/Icon';
import { Empty, Section } from './controls';

const AC = 'var(--ac, #5b5bd6)';

/** Enough to pick from without turning the panel into a second list pane. */
const MAX_SUGGESTIONS = 8;

export function RelationshipsSection({ item }: { item: Item }) {
    const items = useStore((s) => s.items);
    const itemMeta = useStore((s) => s.itemMeta);
    const updateItem = useStore((s) => s.updateItem);
    const [adding, setAdding] = useState(false);
    const [query, setQuery] = useState('');

    const related = useMemo(() => {
        const byId = new Map(items.map((i) => [i.id, i]));
        return (item.related ?? []).map((id) => byId.get(id)).filter((x): x is Item => !!x);
    }, [item.related, items]);

    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        const taken = new Set([item.id, ...(item.related ?? [])]);
        return items
            .filter((i) => !taken.has(i.id))
            .filter((i) => !q || i.title.toLowerCase().includes(q))
            .slice(0, MAX_SUGGESTIONS);
    }, [item.id, item.related, items, query]);

    const backlinks = itemMeta?.backlinks ?? [];

    const add = (id: string) => {
        setAdding(false);
        setQuery('');
        void updateItem(item.id, { related: [...(item.related ?? []), id] });
    };

    const remove = (id: string) => {
        void updateItem(item.id, {
            related: (item.related ?? []).filter((r) => r !== id),
        });
    };

    return (
        <Section icon={<Icon name="layers" size={12} />} title="Relationships">
            <SubLabel>Related to</SubLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {related.map((r) => (
                    <RelationCard item={r} key={r.id} onRemove={() => remove(r.id)} />
                ))}
                {adding ? (
                    <div
                        style={{
                            border: `1px solid ${AC}`,
                            borderRadius: 9,
                            overflow: 'hidden',
                        }}
                    >
                        <label
                            style={{
                                alignItems: 'center',
                                color: 'var(--text3, #9a9aa5)',
                                display: 'flex',
                                gap: 7,
                                padding: '6px 9px',
                            }}
                        >
                            <Search size={13} />
                            <input
                                autoFocus
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setAdding(false);
                                        setQuery('');
                                    }
                                    if (e.key === 'Enter' && suggestions[0]) add(suggestions[0].id);
                                }}
                                placeholder="Link to…"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text, #1a1a1f)',
                                    flex: 1,
                                    font: 'inherit',
                                    fontSize: 12.5,
                                    minWidth: 0,
                                    outline: 'none',
                                }}
                                value={query}
                            />
                        </label>
                        <div style={{ borderTop: '1px solid var(--border, #ececef)', padding: 4 }}>
                            {suggestions.length === 0 ? (
                                <Empty>No matches</Empty>
                            ) : (
                                suggestions.map((s) => (
                                    <div
                                        className={hoverCard}
                                        key={s.id}
                                        onClick={() => add(s.id)}
                                        style={{
                                            alignItems: 'center',
                                            border: '1px solid transparent',
                                            borderRadius: 7,
                                            color: 'var(--text2, #6b6b76)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            fontSize: 12.5,
                                            gap: 7,
                                            padding: '5px 7px',
                                        }}
                                    >
                                        <Icon name={s.type} size={12} />
                                        <span
                                            style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {s.title}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setAdding(true)}
                        style={{
                            alignItems: 'center',
                            background: 'transparent',
                            border: '1px dashed var(--dash, #d2d2dc)',
                            borderRadius: 9,
                            color: 'var(--faint, #a8a8b0)',
                            cursor: 'pointer',
                            display: 'flex',
                            font: 'inherit',
                            fontSize: 12.5,
                            gap: 6,
                            justifyContent: 'center',
                            padding: '7px 9px',
                        }}
                        type="button"
                    >
                        <Plus size={12} />
                        Add
                    </button>
                )}
            </div>

            <SubLabel style={{ marginTop: 14 }}>Linked from</SubLabel>
            {backlinks.length === 0 ? (
                <Empty>Nothing links here yet</Empty>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {backlinks.map((b) => (
                        <RelationCard item={b} key={b.id} />
                    ))}
                </div>
            )}
        </Section>
    );
}

function RelationCard({ item, onRemove }: { item: Item; onRemove?: () => void }) {
    const selectItem = useStore((s) => s.selectItem);
    const meta = typeMeta(item.type);

    return (
        <div
            className={hoverCard}
            onClick={() => selectItem(item.id)}
            style={{
                alignItems: 'center',
                border: '1px solid var(--border, #ececef)',
                borderRadius: 9,
                cursor: 'pointer',
                display: 'flex',
                gap: 8,
                padding: '7px 9px',
            }}
        >
            <span
                style={{
                    alignItems: 'center',
                    background: meta.bg,
                    borderRadius: 6,
                    color: meta.fg,
                    display: 'flex',
                    flex: 'none',
                    height: 22,
                    justifyContent: 'center',
                    width: 22,
                }}
            >
                <Icon name={item.type} size={12} />
            </span>
            <span
                style={{
                    color: 'var(--text, #1a1a1f)',
                    flex: 1,
                    fontSize: 12.5,
                    fontWeight: 560,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {item.title}
            </span>
            {onRemove && (
                <span
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    style={{
                        color: 'var(--faint, #a8a8b0)',
                        cursor: 'pointer',
                        flex: 'none',
                        fontSize: 14,
                        lineHeight: 1,
                    }}
                    title="Remove link"
                >
                    ×
                </span>
            )}
        </div>
    );
}

function SubLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div
            style={{
                color: 'var(--text3, #9a9aa5)',
                fontSize: 12,
                marginBottom: 7,
                ...style,
            }}
        >
            {children}
        </div>
    );
}
