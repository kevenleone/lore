// Sidebar "Collections" section with full management: add, edit (name + color),
// and remove (with confirmation). Removing a collection unfiles its items.

import { useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { collectionCount, isViewActive } from '../../store/views';
import { Check, ChevronRight, Close, Pencil, Plus, Trash } from '../common/glyphs';
import { collectionRows, renamedTo, toggleCollapsed } from './collectionTree';

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
 *
 * They are taken out of the row's flow because they must stay focusable while
 * hidden — `display: none` would drop them out of the tab order, and anything
 * that merely hides them still occupies the space, which pushed every
 * collection's count inboard of the shortcuts it lines up with.
 */
const ROW_ACTIONS =
    'absolute inset-y-0 right-[9px] flex items-center gap-2 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100';

/** How far each level of nesting steps in, in pixels. */
const INDENT = 11;

export function CollectionsSection() {
    const items = useStore((state) => state.items);
    const collections = useStore((state) => state.collections);
    const view = useStore((state) => state.view);
    const selectView = useStore((state) => state.selectView);
    const createCollection = useStore((state) => state.createCollection);
    const updateCollection = useStore((state) => state.updateCollection);
    const deleteCollection = useStore((state) => state.deleteCollection);

    const setPref = useStore((state) => state.setPref);
    const collapsed = useStore((state) => state.prefs.collapsedCollections);
    const rails = useStore((state) => state.prefs.switches.sidebarRails);

    const [editingId, setEditingId] = useState<null | string>(null);
    /** The collection a new one is being created inside, or '' for the root. */
    const [addingUnder, setAddingUnder] = useState('');
    const [confirmId, setConfirmId] = useState<null | string>(null);
    const [draftName, setDraftName] = useState('');
    const [draftColor, setDraftColor] = useState(COLLECTION_COLORS[0]);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingId) {
            nameRef.current?.focus();
        }
    }, [editingId]);

    const rows = collectionRows(collections, collapsed);
    /*
     * A disclosure column only where something discloses. With nothing nested
     * every row would otherwise reserve room for a chevron none of them has,
     * which is what put the collections one notch right of the boards.
     */
    const anyChildren = rows.some((row) => row.hasChildren);

    const startAdd = (under = '') => {
        setConfirmId(null);
        setAddingUnder(under);
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

        if (!name) {
            return cancel();
        }

        if (editingId === NEW) {
            // A name typed with a slash is taken at its word, so a path can be
            // written out in one go; otherwise it lands inside whichever row's
            // plus was pressed.
            const path = name.includes('/') || !addingUnder ? name : `${addingUnder}/${name}`;

            await createCollection({ color: draftColor, name: path });
            // The new child would be invisible inside a folded parent.
            setPref(
                'collapsedCollections',
                collapsed.filter((entry) => entry !== addingUnder),
            );
        } else if (editingId) {
            await updateCollection(editingId, {
                color: draftColor,
                name: renamedTo(editingId, name),
            });
        }

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
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        void save();
                    }

                    if (event.key === 'Escape') {
                        cancel();
                    }
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
        <nav aria-label="Collections">
            <div className="flex items-center px-[9px] pt-[15px] pb-[5px]">
                <span className="text-caption font-[680] tracking-[.06em] text-faint uppercase">
                    Collections
                </span>
                <button
                    aria-label="New collection"
                    className={cn(BARE_BUTTON, 'ml-auto flex text-faint hover:text-text2')}
                    onClick={() => startAdd()}
                    type="button"
                >
                    <Plus size={13} sw={2} />
                </button>
            </div>

            {/*
             * The same wrapper the boards under Tasks use, down to the numbers:
             * the outermost rail is the container's own left border, so a root
             * collection and a root board are indented by one construction
             * rather than by two that have to be kept agreeing.
             */}
            <div
                className={cn(
                    'ml-[9px] flex flex-col pl-[10px]',
                    rails && 'border-l border-border',
                )}
            >
                {rows.map(({ collection, depth, hasChildren, name }) => {
                    if (editingId === collection.id) {
                        return renderEditor(collection.id);
                    }

                    if (confirmId === collection.id) {
                        return (
                            <div className={cn(ROW_BASE, 'bg-danger-tint')} key={collection.id}>
                                <span className="flex-1 text-body text-danger">
                                    Delete “{collection.name}”?
                                </span>
                                <button
                                    aria-label={`Keep ${collection.name}`}
                                    className={cn(BARE_BUTTON, 'flex text-text3')}
                                    onClick={() => setConfirmId(null)}
                                    type="button"
                                >
                                    <Close size={14} />
                                </button>
                                <button
                                    aria-label={`Delete ${collection.name}`}
                                    className={cn(BARE_BUTTON, 'flex text-danger')}
                                    onClick={() => {
                                        setConfirmId(null);
                                        void deleteCollection(collection.id);
                                    }}
                                    type="button"
                                >
                                    <Check size={14} sw={2.4} />
                                </button>
                            </div>
                        );
                    }

                    const active = isViewActive(view, 'collection', collection.id);

                    return (
                        // The row is a group rather than a button: it holds the
                        // collection's own button plus two more, and a button
                        // cannot contain buttons.
                        <div
                            className={cn(
                                ROW_BASE,
                                'group relative',
                                active
                                    ? 'bg-accent-tint font-[590] text-accent'
                                    : 'text-text2 hover:bg-hover',
                            )}
                            key={collection.id}
                        >
                            {/*
                             * One spacer per level of nesting, carrying the indent
                             * and — when the preference is on — the rail that says
                             * where that branch began. The outermost rail is the
                             * wrapper's border, so a root row has none of these.
                             *
                             * In the flow rather than absolutely placed, so it
                             * cannot end up under the row's own contents. The
                             * negative margin cancels the row's vertical padding,
                             * which `self-stretch` alone stops short of — that gap
                             * is what left the line dashed between rows.
                             */}
                            {Array.from({ length: depth }, (_unused, level) => (
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        '-my-[6px] -mr-[9px] flex-none self-stretch',
                                        rails && 'border-l border-border',
                                    )}
                                    key={level}
                                    style={{ width: INDENT }}
                                />
                            ))}
                            {hasChildren ? (
                                <button
                                    aria-expanded={!collapsed.includes(collection.id)}
                                    aria-label={`${collapsed.includes(collection.id) ? 'Expand' : 'Collapse'} ${name}`}
                                    className={cn(BARE_BUTTON, 'flex flex-none text-faint')}
                                    onClick={() =>
                                        setPref(
                                            'collapsedCollections',
                                            toggleCollapsed(collection.id, collapsed),
                                        )
                                    }
                                    type="button"
                                >
                                    <ChevronRight
                                        className={cn(
                                            !collapsed.includes(collection.id) && 'rotate-90',
                                        )}
                                        size={12}
                                    />
                                </button>
                            ) : (
                                // Keeps a childless row's swatch in line with
                                // the ones that carry a chevron — but only while
                                // some row actually carries one.
                                anyChildren && <span className="w-[12px] flex-none" />
                            )}
                            <span
                                className="h-[10px] w-[10px] flex-none rounded-[3px]"
                                // The collection's own colour, which the user picks.
                                style={{ background: collection.color }}
                            />
                            <button
                                aria-current={active ? 'page' : undefined}
                                className={cn(BARE_BUTTON, 'min-w-0 flex-1 truncate text-left')}
                                onClick={() => selectView('collection', collection.id)}
                                type="button"
                            >
                                {name}
                            </button>
                            <span className="text-body-sm tabular-nums opacity-50 group-focus-within:invisible group-hover:invisible">
                                {collectionCount(items, collection.id)}
                            </span>
                            <span className={ROW_ACTIONS}>
                                <button
                                    aria-label={`Rename ${name}`}
                                    className={cn(BARE_BUTTON, 'flex text-text3')}
                                    onClick={() => startEdit(collection.id, name, collection.color)}
                                    type="button"
                                >
                                    <Pencil size={13} />
                                </button>
                                <button
                                    aria-label={`New collection inside ${name}`}
                                    className={cn(BARE_BUTTON, 'flex text-text3')}
                                    onClick={() => startAdd(collection.id)}
                                    type="button"
                                >
                                    <Plus size={13} sw={2} />
                                </button>
                                <button
                                    aria-label={`Delete ${name}`}
                                    className={cn(BARE_BUTTON, 'flex text-danger')}
                                    onClick={() => setConfirmId(collection.id)}
                                    type="button"
                                >
                                    <Trash size={13} />
                                </button>
                            </span>
                        </div>
                    );
                })}
            </div>

            {editingId === NEW && renderEditor(NEW)}
        </nav>
    );
}
