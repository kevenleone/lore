// The bar that replaces the list header while items are ticked: what is in the
// set, and the handful of things worth doing to a set rather than to one item.

import { useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { Close, Plus, Trash } from '../common/glyphs';
import { StarOutline } from '../common/glyphs';

/** Which popover is open. */
type MenuId = 'move' | 'tag';

const ACTION =
    'flex items-center gap-[5px] rounded-7 border-none bg-transparent px-[7px] py-[4px] font-[inherit] text-body text-text2 hover:bg-hover';

/** The mode opens with nothing ticked, so the actions are there but inert. */
const DISABLED = 'cursor-default opacity-40 hover:bg-transparent';

export function SelectionBar({ count }: { count: number }) {
    const collections = useStore((state) => state.collections);
    const stopSelecting = useStore((state) => state.stopSelecting);
    const bulkAddTag = useStore((state) => state.bulkAddTag);
    const bulkMove = useStore((state) => state.bulkMove);
    const bulkStar = useStore((state) => state.bulkStar);
    const bulkDelete = useStore((state) => state.bulkDelete);

    const [menu, setMenu] = useState<MenuId | null>(null);
    const [draft, setDraft] = useState('');
    const [confirming, setConfirming] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);
    const idle = count === 0;

    useEffect(() => {
        if (!menu && !confirming) {
            return;
        }

        const onDown = (event: MouseEvent) => {
            if (barRef.current && !barRef.current.contains(event.target as Node)) {
                setMenu(null);
                setConfirming(false);
            }
        };

        window.addEventListener('mousedown', onDown);

        return () => window.removeEventListener('mousedown', onDown);
    }, [confirming, menu]);

    const commitTag = () => {
        const tag = draft.trim();

        setMenu(null);
        setDraft('');

        if (tag) {
            void bulkAddTag(tag);
        }
    };

    return (
        <div
            className="flex flex-none items-center gap-[6px] border-b border-border bg-accent-tint px-4 py-[9px]"
            ref={barRef}
        >
            <span className="text-body-lg font-[620] text-accent tabular-nums">
                {count} selected
            </span>

            <span className="ml-3 flex items-center gap-[2px]">
                <div className="relative">
                    <button
                        className={cn(ACTION, idle && DISABLED)}
                        disabled={idle}
                        onClick={() => setMenu((open) => (open === 'tag' ? null : 'tag'))}
                        type="button"
                    >
                        <Plus size={12} />
                        Tag
                    </button>
                    {menu === 'tag' && (
                        <Popover>
                            <input
                                autoFocus
                                className="w-full rounded-7 border border-border bg-surface px-[8px] py-[5px] font-[inherit] text-body text-text outline-none focus:border-accent"
                                onChange={(event) => setDraft(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        commitTag();
                                    }

                                    if (event.key === 'Escape') {
                                        setMenu(null);
                                        setDraft('');
                                    }
                                }}
                                placeholder="Tag to add"
                                value={draft}
                            />
                        </Popover>
                    )}
                </div>

                <div className="relative">
                    <button
                        className={cn(ACTION, idle && DISABLED)}
                        disabled={idle}
                        onClick={() => setMenu((open) => (open === 'move' ? null : 'move'))}
                        type="button"
                    >
                        Move to
                    </button>
                    {menu === 'move' && (
                        <Popover>
                            <MenuRow
                                onClick={() => {
                                    setMenu(null);
                                    void bulkMove(null);
                                }}
                            >
                                No collection
                            </MenuRow>
                            {collections.map((collection) => (
                                <MenuRow
                                    color={collection.color}
                                    key={collection.id}
                                    onClick={() => {
                                        setMenu(null);
                                        void bulkMove(collection.id);
                                    }}
                                >
                                    {collection.name}
                                </MenuRow>
                            ))}
                        </Popover>
                    )}
                </div>

                <button
                    className={cn(ACTION, idle && DISABLED)}
                    disabled={idle}
                    onClick={() => void bulkStar(true)}
                    type="button"
                >
                    <StarOutline size={12} />
                    Star
                </button>

                <button
                    className={cn(ACTION, 'text-danger', idle && DISABLED)}
                    disabled={idle}
                    onClick={() => setConfirming(true)}
                    type="button"
                >
                    <Trash size={12} />
                    Delete
                </button>
            </span>

            {confirming && (
                <span className="flex items-center gap-[6px] text-body text-text2">
                    <span>Delete {count}?</span>
                    <button
                        className={cn(ACTION, 'text-danger')}
                        onClick={() => {
                            setConfirming(false);
                            void bulkDelete();
                        }}
                        type="button"
                    >
                        Yes, delete
                    </button>
                    <button className={ACTION} onClick={() => setConfirming(false)} type="button">
                        Cancel
                    </button>
                </span>
            )}

            <button
                aria-label="Done selecting"
                className={cn(ACTION, 'ml-auto')}
                onClick={stopSelecting}
                type="button"
            >
                <Close size={12} />
            </button>
        </div>
    );
}

function MenuRow({
    children,
    color,
    onClick,
}: {
    children: React.ReactNode;
    color?: string;
    onClick: () => void;
}) {
    return (
        <button
            className="flex w-full items-center gap-2 rounded-7 border-none bg-transparent px-[7px] py-[5px] text-left font-[inherit] text-body text-text2 hover:bg-hover"
            onClick={onClick}
            type="button"
        >
            {color && (
                <span
                    className="h-[9px] w-[9px] flex-none rounded-[2px]"
                    // A collection's own colour, chosen by the user.
                    style={{ background: color }}
                />
            )}
            <span className="truncate">{children}</span>
        </button>
    );
}

function Popover({ children }: { children: React.ReactNode }) {
    return (
        <div className="absolute top-[calc(100%+6px)] left-0 z-30 max-h-[260px] w-[210px] overflow-auto rounded-9 border border-border bg-surface p-1 shadow-float">
            {children}
        </div>
    );
}
