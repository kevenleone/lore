// The saved conversations, as a menu under the chat's header.

import { useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import { formatRelative } from '../../lib/format';
import { useStore } from '../../store/useStore';
import { Pencil, Trash } from '../common/glyphs';

const ROW_ACTION =
    'flex h-7 w-7 flex-none items-center justify-center rounded-7 border-none bg-transparent p-0 text-faint opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:text-text2';

export function ChatHistory({ onClose }: { onClose: () => void }) {
    const threads = useStore((state) => state.chatThreads);
    const current = useStore((state) => state.chatThreadId);
    const openChatThread = useStore((state) => state.openChatThread);
    const deleteChatThread = useStore((state) => state.deleteChatThread);
    const renameChatThread = useStore((state) => state.renameChatThread);
    const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
    const panel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onDown = (event: MouseEvent) => {
            if (panel.current && !panel.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    return (
        <div
            aria-label="Conversations"
            className="absolute top-[58px] right-4 z-40 flex max-h-[min(420px,70%)] w-[320px] max-w-[calc(100%-32px)] animate-pop-in-fast flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-float"
            ref={panel}
            role="dialog"
        >
            <div className="flex-none border-b border-border-soft px-[14px] py-[10px] text-caption font-[680] tracking-[.06em] text-faint uppercase">
                Conversations
            </div>
            {threads.length === 0 ? (
                <p className="m-0 px-[14px] py-5 text-body leading-[1.5] text-text3">
                    Nothing saved yet. A conversation is kept from its first answer on.
                </p>
            ) : (
                <div className="flex flex-col overflow-y-auto p-[5px]">
                    {threads.map((thread) =>
                        renaming?.id === thread.id ? (
                            <input
                                aria-label="Conversation name"
                                autoFocus
                                className="m-[3px] rounded-7 border border-accent bg-surface px-2 py-[7px] font-[inherit] text-body font-semibold text-text outline-none"
                                key={thread.id}
                                onBlur={() => setRenaming(null)}
                                onChange={(event) =>
                                    setRenaming({ id: thread.id, title: event.target.value })
                                }
                                onFocus={(event) => event.target.select()}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        void renameChatThread(thread.id, renaming.title);
                                        setRenaming(null);
                                    }

                                    // Leaves the name alone, and the menu open.
                                    if (event.key === 'Escape') {
                                        event.stopPropagation();
                                        setRenaming(null);
                                    }
                                }}
                                value={renaming.title}
                            />
                        ) : (
                            <div
                                className={cn(
                                    'group flex items-center rounded-lg hover:bg-hover',
                                    thread.id === current && 'bg-sel',
                                )}
                                key={thread.id}
                            >
                                <button
                                    aria-current={thread.id === current}
                                    className="flex min-w-0 flex-1 flex-col gap-[2px] border-none bg-transparent px-[10px] py-2 text-left font-[inherit]"
                                    onClick={() => {
                                        void openChatThread(thread.id);
                                        onClose();
                                    }}
                                    type="button"
                                >
                                    <span className="truncate text-body font-semibold text-text">
                                        {thread.title}
                                    </span>
                                    <span className="text-body-sm text-text3">
                                        {formatRelative(thread.updatedAt)}
                                    </span>
                                </button>
                                <button
                                    aria-label={`Rename “${thread.title}”`}
                                    className={ROW_ACTION}
                                    onClick={() =>
                                        setRenaming({ id: thread.id, title: thread.title })
                                    }
                                    title="Rename"
                                    type="button"
                                >
                                    <Pencil />
                                </button>
                                <button
                                    aria-label={`Delete “${thread.title}”`}
                                    className={cn(ROW_ACTION, 'mr-[6px]')}
                                    onClick={() => void deleteChatThread(thread.id)}
                                    title="Delete"
                                    type="button"
                                >
                                    <Trash />
                                </button>
                            </div>
                        ),
                    )}
                </div>
            )}
        </div>
    );
}
