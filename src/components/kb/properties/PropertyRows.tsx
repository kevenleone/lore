// The panel's top block: the item's own editable fields, one per row.
//
// `createdAt` is read-only on purpose — `ItemPatch` excludes it, because the
// capture time is the one thing about a note that should not be rewritable from
// a dropdown.

import { useState } from 'react';

import type { Item, ItemFlags, ItemType } from '../../../store/types';

import { formatSavedDate } from '../../../lib/format';
import { TYPE_META, typeMeta } from '../../../store/typeMeta';
import { useStore } from '../../../store/useStore';
import { Calendar, Globe, Link } from '../../common/glyphs';
import { Icon } from '../../common/Icon';
import { MenuItem, Picker, ReadOnly, Row } from './controls';

const AC = 'var(--ac, #5b5bd6)';

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
        <div style={{ padding: '14px 16px 16px' }}>
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
                                style={{
                                    background: collection?.color ?? '#c4c4cc',
                                    borderRadius: '50%',
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
                                {collection?.name ?? 'Unfiled'}
                            </span>
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
                                        style={{
                                            background: c.color,
                                            borderRadius: '50%',
                                            flex: 'none',
                                            height: 8,
                                            width: 8,
                                        }}
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
                <span
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 5,
                        justifyContent: 'flex-end',
                    }}
                >
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
                        onBlur={commitUrl}
                        onChange={(e) => setUrlDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commitUrl();
                            if (e.key === 'Escape') setEditingUrl(false);
                        }}
                        placeholder="https://…"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `1.5px solid ${AC}`,
                            color: 'var(--text, #1a1a1f)',
                            font: 'inherit',
                            fontSize: 12.5,
                            minWidth: 0,
                            outline: 'none',
                            textAlign: 'right',
                            width: '100%',
                        }}
                        value={urlDraft}
                    />
                ) : (
                    <span
                        onClick={() => {
                            setUrlDraft(item.url ?? '');
                            setEditingUrl(true);
                        }}
                        style={{ cursor: 'text', minWidth: 0, overflow: 'hidden' }}
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
            onClick={onClick}
            style={{
                borderRadius: 6,
                cursor: 'pointer',
                font: 'inherit',
                fontSize: 11.5,
                fontWeight: on ? 600 : 500,
                padding: '2.5px 7px',
                ...(on
                    ? {
                          background: 'var(--ac-tint, #eeeef2)',
                          border: '1px solid transparent',
                          color: AC,
                      }
                    : {
                          background: 'transparent',
                          border: '1px dashed var(--dash, #d2d2dc)',
                          color: 'var(--faint, #a8a8b0)',
                      }),
            }}
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
            style={{
                alignItems: 'center',
                background: meta.bg,
                borderRadius: 6,
                color: meta.fg,
                display: 'inline-flex',
                fontSize: 11.5,
                fontWeight: 600,
                gap: 5,
                padding: '2.5px 7px',
            }}
        >
            <Icon name={type} size={12} /> {meta.label}
        </span>
    );
}
