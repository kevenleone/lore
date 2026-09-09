// The common per-item actions, on right-click. Everything here already exists
// in the detail header or the Properties panel; this is the short way to it.

import { useState } from 'react';

import type { ContextMenuTarget } from '../common/ContextMenu';

import { copyText } from '../../lib/clipboard';
import { useStore } from '../../store/useStore';
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from '../common/ContextMenu';
import { Check, Copy, Link, OpenPage, StarOutline, Timer, Trash } from '../common/glyphs';
import { Icon } from '../common/Icon';

export function ItemContextMenu({
    onClose,
    target,
}: {
    onClose: () => void;
    target: ContextMenuTarget;
}) {
    const item = useStore((s) => s.items.find((i) => i.id === target.id));
    const deleteItem = useStore((s) => s.deleteItem);
    const expandOpenItem = useStore((s) => s.expandOpenItem);
    const selectItem = useStore((s) => s.selectItem);
    const toggleStar = useStore((s) => s.toggleStar);
    const pushToast = useStore((s) => s.pushToast);
    const updateItem = useStore((s) => s.updateItem);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    if (!item) return null;

    const run = (action: () => void) => {
        action();
        onClose();
    };

    const toggleFlag = (key: 'done' | 'inbox' | 'today', on: string, off: string) => {
        void updateItem(item.id, { flags: { ...item.flags, [key]: !item.flags[key] } });
        pushToast(item.flags[key] ? off : on);
    };

    const copy = (text: string, what: string) => {
        void copyText(text).then((ok) =>
            pushToast(ok ? `${what} copied` : `Couldn't copy the ${what.toLowerCase()}`),
        );
    };

    return (
        <ContextMenu onClose={onClose} x={target.x} y={target.y}>
            {confirmingDelete ? (
                <>
                    <div className="px-2 py-[6px] text-body text-text2">Delete this item?</div>
                    <ContextMenuItem onClick={() => setConfirmingDelete(false)}>
                        Cancel
                    </ContextMenuItem>
                    <ContextMenuItem
                        danger
                        onClick={() =>
                            run(() => {
                                void deleteItem(item.id);
                                pushToast('Deleted');
                            })
                        }
                    >
                        <Trash size={14} />
                        Delete
                    </ContextMenuItem>
                </>
            ) : (
                <>
                    <ContextMenuItem onClick={() => run(() => selectItem(item.id))}>
                        Open
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={() =>
                            run(() => {
                                selectItem(item.id);
                                expandOpenItem();
                            })
                        }
                    >
                        <OpenPage size={13} />
                        Open in a page
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        onClick={() =>
                            run(() => {
                                void toggleStar(item.id);
                                pushToast(item.flags.starred ? 'Unstarred' : 'Starred');
                            })
                        }
                    >
                        <StarOutline size={14} />
                        {item.flags.starred ? 'Unstar' : 'Star'}
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={() =>
                            run(() => toggleFlag('done', 'Marked done', 'Marked not done'))
                        }
                    >
                        <Check size={13} />
                        {item.flags.done ? 'Mark not done' : 'Mark done'}
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={() =>
                            run(() => toggleFlag('today', 'Added to Today', 'Removed from Today'))
                        }
                    >
                        <Timer size={14} />
                        {item.flags.today ? 'Remove from Today' : 'Add to Today'}
                    </ContextMenuItem>
                    <ContextMenuItem
                        onClick={() =>
                            run(() => toggleFlag('inbox', 'Moved to Inbox', 'Removed from Inbox'))
                        }
                    >
                        <Icon name="inbox" size={14} />
                        {item.flags.inbox ? 'Remove from Inbox' : 'Move to Inbox'}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => run(() => copy(item.title, 'Title'))}>
                        <Copy size={14} />
                        Copy title
                    </ContextMenuItem>
                    {item.url && (
                        <ContextMenuItem onClick={() => run(() => copy(item.url ?? '', 'Link'))}>
                            <Link size={14} />
                            Copy link
                        </ContextMenuItem>
                    )}
                    <ContextMenuSeparator />
                    <ContextMenuItem danger onClick={() => setConfirmingDelete(true)}>
                        <Trash size={14} />
                        Delete
                    </ContextMenuItem>
                </>
            )}
        </ContextMenu>
    );
}
