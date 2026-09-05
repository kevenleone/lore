// "Related to" — the item's own frontmatter links, editable — and "Linked from",
// the inbound side, which the sidecar answers from its links table.
//
// Writing `related` back is safe even for a vault edited elsewhere: the sidecar
// serialises resolved ids to `[[stem]]` and appends every link it could not
// resolve untouched (see sidecar/src/links.ts).

import { useMemo, useState } from 'react';

import type { Item } from '../../../store/types';

import { cn } from '../../../lib/cn';
import { typeMeta } from '../../../store/typeMeta';
import { useStore } from '../../../store/useStore';
import { Plus, Search } from '../../common/glyphs';
import { Icon } from '../../common/Icon';
import { Empty, Section } from './controls';

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
            <div className="flex flex-col gap-[5px]">
                {related.map((r) => (
                    <RelationCard item={r} key={r.id} onRemove={() => remove(r.id)} />
                ))}
                {adding ? (
                    <div className="overflow-hidden rounded-9 border border-accent">
                        <label className="flex items-center gap-[7px] px-[9px] py-[6px] text-text3">
                            <Search size={13} />
                            <input
                                autoFocus
                                className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-body text-text outline-none"
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setAdding(false);
                                        setQuery('');
                                    }
                                    if (e.key === 'Enter' && suggestions[0]) add(suggestions[0].id);
                                }}
                                placeholder="Link to…"
                                value={query}
                            />
                        </label>
                        <div className="border-t border-border p-1">
                            {suggestions.length === 0 ? (
                                <Empty>No matches</Empty>
                            ) : (
                                suggestions.map((s) => (
                                    <div
                                        className="flex cursor-pointer items-center gap-[7px] rounded-7 border border-transparent px-[7px] py-[5px] text-body text-text2 hover:border-border hover:bg-surface2"
                                        key={s.id}
                                        onClick={() => add(s.id)}
                                    >
                                        <Icon name={s.type} size={12} />
                                        <span className="truncate">{s.title}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <button
                        className="flex cursor-pointer items-center justify-center gap-[6px] rounded-9 border border-dashed border-dash bg-transparent px-[9px] py-[7px] font-[inherit] text-body text-faint"
                        onClick={() => setAdding(true)}
                        type="button"
                    >
                        <Plus size={12} />
                        Add
                    </button>
                )}
            </div>

            <SubLabel className="mt-[14px]">Linked from</SubLabel>
            {backlinks.length === 0 ? (
                <Empty>Nothing links here yet</Empty>
            ) : (
                <div className="flex flex-col gap-[5px]">
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
            className="flex cursor-pointer items-center gap-2 rounded-9 border border-border px-[9px] py-[7px] hover:border-border hover:bg-surface2"
            onClick={() => selectItem(item.id)}
        >
            <span
                className={cn(
                    'flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md',
                    meta.chip,
                )}
            >
                <Icon name={item.type} size={12} />
            </span>
            <span className="min-w-0 flex-1 truncate text-body font-[560] text-text">
                {item.title}
            </span>
            {onRemove && (
                <span
                    className="flex-none cursor-pointer text-title leading-none text-faint"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    title="Remove link"
                >
                    ×
                </span>
            )}
        </div>
    );
}

function SubLabel({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('mb-[7px] text-body-sm text-text3', className)}>{children}</div>;
}
