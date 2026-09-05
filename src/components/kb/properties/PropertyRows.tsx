// The panel's top block: the item's own editable fields, one per row.
//
// `createdAt` is read-only on purpose — `ItemPatch` excludes it, because the
// capture time is the one thing about a note that should not be rewritable from
// a dropdown.

import { useState } from 'react';

import type { Item, ItemFlags, ItemType } from '../../../store/types';

import { cn } from '../../../lib/cn';
import { formatSavedDate } from '../../../lib/format';
import { TYPE_META, typeMeta } from '../../../store/typeMeta';
import { useStore } from '../../../store/useStore';
import { Calendar, Globe, Link } from '../../common/glyphs';
import { Icon } from '../../common/Icon';
import { MenuItem, Picker, ReadOnly, Row } from './controls';

const TYPES = Object.keys(TYPE_META) as ItemType[];

const FLAGS: { key: keyof ItemFlags; label: string }[] = [
    { key: 'inbox', label: 'Inbox' },
    { key: 'today', label: 'Today' },
    { key: 'starred', label: 'Flagged' },
    { key: 'done', label: 'Done' },
];

export function PropertyRows({ item }: { item: Item }) {
    const collections = useStore((s) => s.collections);
    const updateItem = useStore((s) => s.updateItem);
    const [editingUrl, setEditingUrl] = useState(false);
    const [urlDraft, setUrlDraft] = useState('');

    const collection = collections.find((c) => c.id === item.collectionId);

    const commitUrl = () => {
        const next = urlDraft.trim();
        setEditingUrl(false);
        if (next !== (item.url ?? '')) void updateItem(item.id, { url: next || undefined });
    };

    return (
        <div className="px-4 pt-[14px] pb-4">
            <Row icon={<Icon name="file" size={13} />} label="Type">
                <Picker trigger={<TypeBadge type={item.type} />} width={160}>
                    {(close) =>
                        TYPES.map((type) => (
                            <MenuItem
                                key={type}
                                onClick={() => {
                                    close();
                                    if (type !== item.type) void updateItem(item.id, { type });
                                }}
                                selected={type === item.type}
                            >
                                <Icon name={type} size={13} />
                                {typeMeta(type).label}
                            </MenuItem>
                        ))
                    }
                </Picker>
            </Row>

            <Row icon={<Icon name="layers" size={13} />} label="Collection">
                <Picker
                    trigger={
                        <>
                            <span
                                className="h-2 w-2 flex-none rounded-full"
                                // The collection's own colour, which the user picks.
                                style={{ background: collection?.color ?? '#c4c4cc' }}
                            />
                            <span className="truncate">{collection?.name ?? 'Unfiled'}</span>
                        </>
                    }
                >
                    {(close) => (
                        <>
                            <MenuItem
                                onClick={() => {
                                    close();
                                    if (item.collectionId)
                                        void updateItem(item.id, { collectionId: undefined });
                                }}
                                selected={!item.collectionId}
                            >
                                Unfiled
                            </MenuItem>
                            {collections.map((c) => (
                                <MenuItem
                                    key={c.id}
                                    onClick={() => {
                                        close();
                                        if (c.id !== item.collectionId)
                                            void updateItem(item.id, { collectionId: c.id });
                                    }}
                                    selected={c.id === item.collectionId}
                                >
                                    <span
                                        className="h-2 w-2 flex-none rounded-full"
                                        style={{ background: c.color }}
                                    />
                                    {c.name}
                                </MenuItem>
                            ))}
                        </>
                    )}
                </Picker>
            </Row>

            <Row icon={<Calendar />} label="Created">
                <ReadOnly>{formatSavedDate(item.createdAt)}</ReadOnly>
            </Row>

            <Row icon={<Globe />} label="Status">
                <span className="flex flex-wrap justify-end gap-[5px]">
                    {FLAGS.map(({ key, label }) => (
                        <FlagChip
                            key={key}
                            label={label}
                            on={!!item.flags[key]}
                            onClick={() =>
                                void updateItem(item.id, {
                                    flags: { ...item.flags, [key]: !item.flags[key] },
                                })
                            }
                        />
                    ))}
                </span>
            </Row>

            <Row icon={<Link />} label="URL">
                {editingUrl ? (
                    <input
                        autoFocus
                        className="w-full min-w-0 border-b-[1.5px] border-none border-b-accent bg-transparent text-right font-[inherit] text-body text-text outline-none"
                        onBlur={commitUrl}
                        onChange={(e) => setUrlDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commitUrl();
                            if (e.key === 'Escape') setEditingUrl(false);
                        }}
                        placeholder="https://…"
                        value={urlDraft}
                    />
                ) : (
                    <span
                        className="min-w-0 cursor-text overflow-hidden"
                        onClick={() => {
                            setUrlDraft(item.url ?? '');
                            setEditingUrl(true);
                        }}
                        title={item.url ?? 'Click to edit'}
                    >
                        <ReadOnly>{item.url}</ReadOnly>
                    </span>
                )}
            </Row>
        </div>
    );
}

function FlagChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
    return (
        <button
            aria-pressed={on}
            className={cn(
                'cursor-pointer rounded-md border px-[7px] py-[2.5px] font-[inherit] text-label',
                on
                    ? 'border-solid border-transparent bg-accent-tint font-semibold text-accent'
                    : 'border-dashed border-dash bg-transparent font-medium text-faint',
            )}
            onClick={onClick}
            type="button"
        >
            {label}
        </button>
    );
}

function TypeBadge({ type }: { type: ItemType }) {
    const meta = typeMeta(type);
    return (
        <span
            className={cn(
                'inline-flex items-center gap-[5px] rounded-md px-[7px] py-[2.5px] text-label font-semibold',
                meta.chip,
            )}
        >
            <Icon name={type} size={12} /> {meta.label}
        </span>
    );
}
