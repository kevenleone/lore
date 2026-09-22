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
    const items = useStore((state) => state.items);
    const itemMeta = useStore((state) => state.itemMeta);
    const updateItem = useStore((state) => state.updateItem);
    const [adding, setAdding] = useState(false);
    const [query, setQuery] = useState('');

    const related = useMemo(() => {
        const byId = new Map(items.map((item) => [item.id, item]));

        return (item.related ?? []).map((id) => byId.get(id)).filter((item): item is Item => !!item);
    }, [item.related, items]);

    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        const taken = new Set([item.id, ...(item.related ?? [])]);

        return items
            .filter((item) => !taken.has(item.id))
            .filter((item) => !q || item.title.toLowerCase().includes(q))
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
                {related.map((item) => (
                    <RelationCard item={item} key={item.id} onRemove={() => remove(item.id)} />
                ))}
                {adding ? (
                    <div className="overflow-hidden rounded-9 border border-accent">
                        <label className="flex items-center gap-[7px] px-[9px] py-[6px] text-text3">
                            <Search size={13} />
                            <input
                                autoFocus
                                className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-body text-text outline-none"
                                onChange={(event) => setQuery(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Escape') {
                                        setAdding(false);
                                        setQuery('');
                                    }

                                    if (event.key === 'Enter' && suggestions[0]) {
                                        add(suggestions[0].id);
                                    }
                                }}
                                placeholder="Link to…"
                                value={query}
                            />
                        </label>
                        <div className="border-t border-border p-1">
                            {suggestions.length === 0 ? (
                                <Empty>No matches</Empty>
                            ) : (
                                suggestions.map((suggestion) => (
                                    <button
                                        className="flex w-full items-center gap-[7px] rounded-7 border border-transparent bg-transparent px-[7px] py-[5px] text-left font-[inherit] text-body text-text2 hover:border-border hover:bg-surface2"
                                        key={suggestion.id}
                                        onClick={() => add(suggestion.id)}
                                        type="button"
                                    >
                                        <Icon name={suggestion.type} size={12} />
                                        <span className="truncate">{suggestion.title}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    <button
                        className="flex items-center justify-center gap-[6px] rounded-9 border border-dashed border-dash bg-transparent px-[9px] py-[7px] font-[inherit] text-body text-faint"
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
                    {backlinks.map((backlink) => (
                        <RelationCard item={backlink} key={backlink.id} />
                    ))}
                </div>
            )}
        </Section>
    );
}

function RelationCard({ item, onRemove }: { item: Item; onRemove?: () => void }) {
    const openLinkedItem = useStore((state) => state.openLinkedItem);
    const meta = typeMeta(item.type);

    return (
        // The card holds two controls — open it, unlink it — so the whole card
        // is a button laid under the row, and the unlink sits above it.
        <div className="relative flex items-center gap-2 rounded-9 border border-border px-[9px] py-[7px] hover:bg-surface2">
            <button
                aria-label={`Open ${item.title}`}
                className="absolute inset-0 rounded-9 border-none bg-transparent"
                onClick={() => openLinkedItem(item.id)}
                type="button"
            />
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
                <button
                    aria-label={`Unlink ${item.title}`}
                    className="relative flex-none border-none bg-transparent p-0 font-[inherit] text-title leading-none text-faint"
                    onClick={onRemove}
                    type="button"
                >
                    ×
                </button>
            )}
        </div>
    );
}

function SubLabel({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('mb-[7px] text-body-sm text-text3', className)}>{children}</div>;
}
