// Sidebar "Collections" section with full management: add, edit (name + color),
// and remove (with confirmation). Removing a collection unfiles its items.

import { useEffect, useRef, useState } from 'react';

import { useStore } from '../../store/useStore';
import { collectionCount, isViewActive } from '../../store/views';
import { hoverable } from '../../theme/util.css';
import { Check, Close, Pencil, Plus, Trash } from '../common/glyphs';

const AC = 'var(--ac, #5b5bd6)';
const NEW = '__new__';

/** Swatches offered when picking a collection color. */
const COLLECTION_COLORS = [
    '#8a92b8',
    '#a88f6e',
    '#82a896',
    '#b88a98',
    '#5b5bd6',
    '#c2622d',
    '#4d855f',
    '#9e7b46',
];

const ROW_BASE: React.CSSProperties = {
    alignItems: 'center',
    borderRadius: 7,
    cursor: 'pointer',
    display: 'flex',
    fontSize: 13.5,
    gap: 9,
    padding: '6px 9px',
};

export function CollectionsSection() {
    const items = useStore((s) => s.items);
    const collections = useStore((s) => s.collections);
    const view = useStore((s) => s.view);
    const selectView = useStore((s) => s.selectView);
    const createCollection = useStore((s) => s.createCollection);
    const updateCollection = useStore((s) => s.updateCollection);
    const deleteCollection = useStore((s) => s.deleteCollection);

    const [editingId, setEditingId] = useState<null | string>(null);
    const [confirmId, setConfirmId] = useState<null | string>(null);
    const [hoveredId, setHoveredId] = useState<null | string>(null);
    const [draftName, setDraftName] = useState('');
    const [draftColor, setDraftColor] = useState(COLLECTION_COLORS[0]);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId) nameRef.current?.focus();
    }, [editingId]);

    const startAdd = () => {
        setConfirmId(null);
        setDraftName('');
        setDraftColor(COLLECTION_COLORS[0]);
        setEditingId(NEW);
    };
    const startEdit = (id: string, name: string, color: string) => {
        setConfirmId(null);
        setDraftName(name);
        setDraftColor(color);
        setEditingId(id);
    };
    const cancel = () => setEditingId(null);

    const save = async () => {
        const name = draftName.trim();
        if (!name) return cancel();
        if (editingId === NEW) await createCollection({ color: draftColor, name });
        else if (editingId) await updateCollection(editingId, { color: draftColor, name });
        setEditingId(null);
    };

    // A plain render function (not a nested component) so the input keeps focus
    // across keystrokes.
    const renderEditor = (key: string) => (
        <div
            key={key}
            style={{
                ...ROW_BASE,
                alignItems: 'stretch',
                background: 'var(--sel, #f4f4f6)',
                cursor: 'default',
                flexDirection: 'column',
                gap: 8,
                padding: '8px 9px',
            }}
        >
            <input
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') void save();
                    if (e.key === 'Escape') cancel();
                }}
                placeholder="Collection name"
                ref={nameRef}
                style={{
                    background: 'var(--surface, #fff)',
                    border: '1px solid var(--border, #e4e4ea)',
                    borderRadius: 7,
                    font: 'inherit',
                    fontSize: 13.5,
                    outline: 'none',
                    padding: '6px 9px',
                }}
                value={draftName}
            />
            <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {COLLECTION_COLORS.map((c) => (
                    <span
                        key={c}
                        onClick={() => setDraftColor(c)}
                        style={{
                            background: c,
                            borderRadius: '50%',
                            boxShadow: draftColor === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
                            cursor: 'pointer',
                            height: 18,
                            width: 18,
                        }}
                    />
                ))}
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <span
                    onClick={cancel}
                    style={{
                        borderRadius: 7,
                        color: 'var(--text2, #6b6b76)',
                        cursor: 'pointer',
                        fontSize: 12.5,
                        padding: '4px 10px',
                    }}
                >
                    Cancel
                </span>
                <span
                    onClick={() => void save()}
                    style={{
                        background: AC,
                        borderRadius: 7,
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 12.5,
                        fontWeight: 600,
                        padding: '4px 12px',
                    }}
                >
                    Save
                </span>
            </div>
        </div>
    );

    return (
        <>
            <div style={{ alignItems: 'center', display: 'flex', padding: '15px 9px 5px' }}>
                <span
                    style={{
                        color: 'var(--faint, #a8a8b0)',
                        fontSize: 11,
                        fontWeight: 680,
                        letterSpacing: '.06em',
                        textTransform: 'uppercase',
                    }}
                >
                    Collections
                </span>
                <span
                    onClick={startAdd}
                    style={{
                        color: 'var(--faint, #a8a8b0)',
                        cursor: 'pointer',
                        display: 'flex',
                        marginLeft: 'auto',
                    }}
                    title="New collection"
                >
                    <Plus size={13} sw={2} />
                </span>
            </div>

            {collections.map((c) => {
                if (editingId === c.id) return renderEditor(c.id);

                if (confirmId === c.id) {
                    return (
                        <div
                            key={c.id}
                            style={{ ...ROW_BASE, background: '#fbecec', cursor: 'default' }}
                        >
                            <span style={{ color: '#a23b30', flex: 1, fontSize: 12.5 }}>
                                Delete “{c.name}”?
                            </span>
                            <span
                                onClick={() => setConfirmId(null)}
                                style={{
                                    color: 'var(--text3, #9a9aa5)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                }}
                                title="Cancel"
                            >
                                <Close size={14} />
                            </span>
                            <span
                                onClick={() => {
                                    setConfirmId(null);
                                    void deleteCollection(c.id);
                                }}
                                style={{ color: '#c0392b', cursor: 'pointer', display: 'flex' }}
                                title="Delete"
                            >
                                <Check size={14} sw={2.4} />
                            </span>
                        </div>
                    );
                }

                const active = isViewActive(view, 'collection', c.id);
                const hovered = hoveredId === c.id;
                return (
                    <div
                        className={active ? undefined : hoverable}
                        key={c.id}
                        onClick={() => selectView('collection', c.id)}
                        onMouseEnter={() => setHoveredId(c.id)}
                        onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
                        style={{
                            ...ROW_BASE,
                            ...(active
                                ? {
                                      background: 'var(--ac-tint, #eeeef2)',
                                      color: AC,
                                      fontWeight: 590,
                                  }
                                : { color: 'var(--text2, #6b6b76)' }),
                        }}
                    >
                        <span
                            style={{
                                background: c.color,
                                borderRadius: 3,
                                flex: 'none',
                                height: 10,
                                width: 10,
                            }}
                        />
                        <span
                            style={{
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {c.name}
                        </span>
                        {hovered ? (
                            <span style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startEdit(c.id, c.name, c.color);
                                    }}
                                    style={{
                                        color: 'var(--text3, #9a9aa5)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                    }}
                                    title="Edit"
                                >
                                    <Pencil size={13} />
                                </span>
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmId(c.id);
                                    }}
                                    style={{ color: '#b0807c', cursor: 'pointer', display: 'flex' }}
                                    title="Delete"
                                >
                                    <Trash size={13} />
                                </span>
                            </span>
                        ) : (
                            <span
                                style={{
                                    fontSize: 12,
                                    fontVariantNumeric: 'tabular-nums',
                                    opacity: 0.5,
                                }}
                            >
                                {collectionCount(items, c.id)}
                            </span>
                        )}
                    </div>
                );
            })}

            {editingId === NEW && renderEditor(NEW)}
        </>
    );
}
