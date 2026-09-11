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

const ROW_BASE = 'text-subhead flex items-center gap-[9px] rounded-7 px-[9px] py-[6px]';

/** Strips the chrome a `<button>` brings, so it sits in a row like the text did. */
const BARE_BUTTON = 'border-none bg-transparent p-0 font-[inherit] text-[inherit]';

/**
 * Row actions are revealed by hover *and* by focus: on hover alone a keyboard
 * user can tab to a button that is never drawn, or never reach it at all.
 */
const ROW_ACTIONS =
    'flex items-center gap-2 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100';

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
                className="rounded-7 border border-border bg-surface px-[9px] py-[6px] font-[inherit] text-subhead"
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
                    <button
                        aria-label={`Colour ${c}`}
                        aria-pressed={draftColor === c}
                        className="h-[18px] w-[18px] rounded-full border-none p-0"
                        key={c}
                        onClick={() => setDraftColor(c)}
                        // Both the swatch and its selected ring are the swatch's
                        // own colour, so they cannot come from a class.
                        style={{
                            background: c,
                            boxShadow: draftColor === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none',
                        }}
                        type="button"
                    />
                ))}
            </div>
            <div className="flex justify-end gap-[6px]">
                <button
                    className={cn(BARE_BUTTON, 'rounded-7 px-[10px] py-1 text-body text-text2')}
                    onClick={cancel}
                    type="button"
                >
                    Cancel
                </button>
                <button
                    className="rounded-7 border-none bg-accent px-3 py-1 font-[inherit] text-body font-semibold text-white"
                    onClick={() => void save()}
                    type="button"
                >
                    Save
                </button>
            </div>
        </div>
    );

    return (
        <>
            <div className="flex items-center px-[9px] pt-[15px] pb-[5px]">
                <span className="text-caption font-[680] tracking-[.06em] text-faint uppercase">
                    Collections
                </span>
                <button
                    aria-label="New collection"
                    className={cn(BARE_BUTTON, 'ml-auto flex text-faint hover:text-text2')}
                    onClick={startAdd}
                    type="button"
                >
                    <Plus size={13} sw={2} />
                </button>
            </div>

            {collections.map((c) => {
                if (editingId === c.id) return renderEditor(c.id);

                if (confirmId === c.id) {
                    return (
                        <div className={cn(ROW_BASE, 'bg-danger-tint')} key={c.id}>
                            <span className="flex-1 text-body text-danger">Delete “{c.name}”?</span>
                            <button
                                aria-label={`Keep ${c.name}`}
                                className={cn(BARE_BUTTON, 'flex text-text3')}
                                onClick={() => setConfirmId(null)}
                                type="button"
                            >
                                <Close size={14} />
                            </button>
                            <button
                                aria-label={`Delete ${c.name}`}
                                className={cn(BARE_BUTTON, 'flex text-danger')}
                                onClick={() => {
                                    setConfirmId(null);
                                    void deleteCollection(c.id);
                                }}
                                type="button"
                            >
                                <Check size={14} sw={2.4} />
                            </button>
                        </div>
                    );
                }

                const active = isViewActive(view, 'collection', c.id);
                return (
                    // The row is a group rather than a button: it holds the
                    // collection's own button plus two more, and a button
                    // cannot contain buttons.
                    <div
                        className={cn(
                            ROW_BASE,
                            'group',
                            active
                                ? 'bg-accent-tint font-[590] text-accent'
                                : 'text-text2 hover:bg-hover',
                        )}
                        key={c.id}
                    >
                        <span
                            className="h-[10px] w-[10px] flex-none rounded-[3px]"
                            // The collection's own colour, which the user picks.
                            style={{ background: c.color }}
                        />
                        <button
                            aria-current={active ? 'page' : undefined}
                            className={cn(BARE_BUTTON, 'min-w-0 flex-1 truncate text-left')}
                            onClick={() => selectView('collection', c.id)}
                            type="button"
                        >
                            {c.name}
                        </button>
                        <span className="text-body-sm tabular-nums opacity-50 group-focus-within:hidden group-hover:hidden">
                            {collectionCount(items, c.id)}
                        </span>
                        <span className={ROW_ACTIONS}>
                            <button
                                aria-label={`Rename ${c.name}`}
                                className={cn(BARE_BUTTON, 'flex text-text3')}
                                onClick={() => startEdit(c.id, c.name, c.color)}
                                type="button"
                            >
                                <Pencil size={13} />
                            </button>
                            <button
                                aria-label={`Delete ${c.name}`}
                                className={cn(BARE_BUTTON, 'flex text-danger')}
                                onClick={() => setConfirmId(c.id)}
                                type="button"
                            >
                                <Trash size={13} />
                            </button>
                        </span>
                    </div>
                );
            })}

            {editingId === NEW && renderEditor(NEW)}
        </>
    );
}
