// Sidebar "Collections" section with full management: add, edit (name + color),
// and remove (with confirmation). Removing a collection unfiles its items.

import { useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { collectionCount, isViewActive } from '../../store/views';
import { Check, Close, Pencil, Plus, Trash } from '../common/glyphs';

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

const ROW_BASE =
    'text-subhead flex cursor-pointer items-center gap-[9px] rounded-7 px-[9px] py-[6px]';

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
            className={cn(
                ROW_BASE,
                'cursor-default flex-col items-stretch gap-2 bg-sel px-[9px] py-2',
            )}
            key={key}
        >
            <input
                className="rounded-7 border border-border bg-surface px-[9px] py-[6px] font-[inherit] text-subhead outline-none"
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') void save();
                    if (e.key === 'Escape') cancel();
                }}
                placeholder="Collection name"
                ref={nameRef}
                value={draftName}
            />
            <div className="flex flex-wrap items-center gap-[6px]">
                {COLLECTION_COLORS.map((c) => (
                    <span
                        className="h-[18px] w-[18px] cursor-pointer rounded-full"
                        key={c}
                        onClick={() => setDraftColor(c)}
                        // Both the swatch and its selected ring are the swatch's
                        // own colour, so they cannot come from a class.
                        style={{
                            background: c,
                            boxShadow: draftColor === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
                        }}
                    />
                ))}
            </div>
            <div className="flex justify-end gap-[6px]">
                <span
                    className="cursor-pointer rounded-7 px-[10px] py-1 text-body text-text2"
                    onClick={cancel}
                >
                    Cancel
                </span>
                <span
                    className="cursor-pointer rounded-7 bg-accent px-3 py-1 text-body font-semibold text-white"
                    onClick={() => void save()}
                >
                    Save
                </span>
            </div>
        </div>
    );

    return (
        <>
            <div className="flex items-center px-[9px] pt-[15px] pb-[5px]">
                <span className="text-caption font-[680] tracking-[.06em] text-faint uppercase">
                    Collections
                </span>
                <span
                    className="ml-auto flex cursor-pointer text-faint"
                    onClick={startAdd}
                    title="New collection"
                >
                    <Plus size={13} sw={2} />
                </span>
            </div>

            {collections.map((c) => {
                if (editingId === c.id) return renderEditor(c.id);

                if (confirmId === c.id) {
                    return (
                        <div className={cn(ROW_BASE, 'cursor-default bg-[#fbecec]')} key={c.id}>
                            <span className="flex-1 text-body text-[#a23b30]">
                                Delete “{c.name}”?
                            </span>
                            <span
                                className="flex cursor-pointer text-text3"
                                onClick={() => setConfirmId(null)}
                                title="Cancel"
                            >
                                <Close size={14} />
                            </span>
                            <span
                                className="flex cursor-pointer text-[#c0392b]"
                                onClick={() => {
                                    setConfirmId(null);
                                    void deleteCollection(c.id);
                                }}
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
                        className={cn(
                            ROW_BASE,
                            active
                                ? 'bg-accent-tint font-[590] text-accent'
                                : 'text-text2 hover:bg-hover',
                        )}
                        key={c.id}
                        onClick={() => selectView('collection', c.id)}
                        onMouseEnter={() => setHoveredId(c.id)}
                        onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
                    >
                        <span
                            className="h-[10px] w-[10px] flex-none rounded-[3px]"
                            // The collection's own colour, which the user picks.
                            style={{ background: c.color }}
                        />
                        <span className="flex-1 truncate">{c.name}</span>
                        {hovered ? (
                            <span className="flex items-center gap-2">
                                <span
                                    className="flex cursor-pointer text-text3"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startEdit(c.id, c.name, c.color);
                                    }}
                                    title="Edit"
                                >
                                    <Pencil size={13} />
                                </span>
                                <span
                                    className="flex cursor-pointer text-[#b0807c]"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmId(c.id);
                                    }}
                                    title="Delete"
                                >
                                    <Trash size={13} />
                                </span>
                            </span>
                        ) : (
                            <span className="text-body-sm tabular-nums opacity-50">
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
