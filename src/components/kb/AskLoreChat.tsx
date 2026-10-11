// Detail-pane chat: "Ask Lore" — answers a question from the vault, citing the
// items it relied on as links and as Sources chips that jump to them.
//
// It opens empty. It used to open on a seeded exchange, which read as a
// conversation the user had already had, in a vault where its cited items did
// not exist.

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ChatMessage, Item } from '../../store/types';

import { getAi } from '../../ai';
import { cn } from '../../lib/cn';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { Close, FileGlyph, History, Pencil, Plus, Restart, Send, Sparkle } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { MarkdownView } from '../common/MarkdownView';
import { ChatAction, ChatActions, CopyAction } from './ChatActions';
import { ChatHistory } from './ChatHistory';
import { ItemHoverCard } from './ItemHoverCard';

const WIKILINK = /\[\[([^[\]\n]+)\]\]/g;

const HEADER_BUTTON =
    'flex h-7 w-7 flex-none items-center justify-center rounded-7 border-none bg-transparent p-0 text-faint hover:bg-hover hover:text-text2 disabled:opacity-40 disabled:hover:bg-transparent';

export function AskLoreChat() {
    const messages = useStore((state) => state.chat);
    const busy = useStore((state) => state.chatBusy);
    const items = useStore((state) => state.items);
    const configured = useStore((state) => !!state.prefs.aiBackend);
    const toggleChat = useStore((state) => state.toggleChat);
    const sendChat = useStore((state) => state.sendChat);
    const stopChat = useStore((state) => state.stopChat);
    const openChatItem = useStore((state) => state.openChatItem);
    const openSettings = useStore((state) => state.openSettings);
    const newChat = useStore((state) => state.newChat);
    const resendChat = useStore((state) => state.resendChat);
    const saveAnswerAsNote = useStore((state) => state.saveAnswerAsNote);
    const [draft, setDraft] = useState('');
    const [historyOpen, setHistoryOpen] = useState(false);
    const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
    const closeHistory = useCallback(() => setHistoryOpen(false), []);
    const end = useRef<HTMLDivElement>(null);
    const needsSetup = getAi().needsSetup && !configured;
    const byStem = useMemo(() => new Map(items.map((item) => [stemOf(item), item])), [items]);

    useEffect(() => {
        end.current?.scrollIntoView?.({ block: 'end' });
    }, [messages]);

    const submit = () => {
        const text = draft.trim();

        if (!text || busy) {
            return;
        }

        setDraft('');
        void sendChat(text);
    };

    return (
        <div className="relative flex h-full flex-col" data-hover-bounds="">
            {/* header */}
            <div className="flex flex-none items-center gap-[11px] border-b border-border px-5 py-[15px]">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-tint text-accent">
                    <Sparkle />
                </span>
                <div className="flex-1">
                    <div className="text-title font-[680]">Ask Lore</div>
                    <div className="text-body-sm text-text3">
                        Answers grounded in your knowledge base
                    </div>
                </div>
                <button
                    aria-label="New conversation"
                    className={HEADER_BUTTON}
                    disabled={messages.length === 0}
                    onClick={newChat}
                    title="New conversation"
                    type="button"
                >
                    <Plus size={15} />
                </button>
                <button
                    aria-expanded={historyOpen}
                    aria-label="Conversations"
                    className={cn(HEADER_BUTTON, historyOpen && 'bg-hover text-text2')}
                    // The menu closes on any press outside it, this button
                    // included, so the press must not also reopen it.
                    onClick={() => setHistoryOpen((open) => !open)}
                    onMouseDown={(event) => event.stopPropagation()}
                    title="Conversations"
                    type="button"
                >
                    <History size={15} />
                </button>
                <button
                    aria-label="Close Ask Lore"
                    className={HEADER_BUTTON}
                    onClick={toggleChat}
                    type="button"
                >
                    <Close />
                </button>
            </div>
            {historyOpen && <ChatHistory onClose={closeHistory} />}

            {/* messages */}
            <div className="flex flex-1 flex-col gap-4 overflow-auto px-6 py-[22px]">
                {messages.length === 0 && needsSetup && (
                    <div className="m-auto flex max-w-[300px] flex-col items-center gap-3 text-center">
                        <p className="m-0 text-body leading-[1.6] text-text3">
                            Ask Lore needs a model to answer with: an agent already installed on
                            this Mac, or an API key. Nothing is sent anywhere until you choose one.
                        </p>
                        <button
                            className="rounded-lg border border-border bg-surface px-3 py-[6px] font-[inherit] text-body font-semibold text-text hover:bg-surface2"
                            onClick={() => openSettings('capture')}
                            type="button"
                        >
                            Choose a model
                        </button>
                    </div>
                )}
                {messages.length === 0 && !needsSetup && (
                    <p className="m-auto max-w-[280px] text-center text-body leading-[1.6] text-text3">
                        Ask a question and Lore answers from the notes you have already saved,
                        citing the ones it used.
                    </p>
                )}
                {messages.map((message, index) => {
                    const latest = index >= messages.length - 2;

                    if (message.role === 'ai') {
                        return (
                            <Answer
                                byStem={byStem}
                                items={items}
                                key={message.id}
                                message={message}
                                onOpen={openChatItem}
                                onRegenerate={
                                    index === messages.length - 1 && !busy
                                        ? () => void resendChat(messages[index - 1]?.id ?? '')
                                        : undefined
                                }
                                onSave={() => void saveAnswerAsNote(message.id)}
                                pinned={latest}
                            />
                        );
                    }

                    if (editing?.id === message.id) {
                        const resend = () => {
                            const text = editing.text.trim();

                            if (text) {
                                setEditing(null);
                                void resendChat(message.id, text);
                            }
                        };

                        return (
                            <div className="flex w-[78%] flex-col gap-2 self-end" key={message.id}>
                                <textarea
                                    aria-label="Edit your question"
                                    autoFocus
                                    className="min-h-[72px] w-full resize-y rounded-[15px] border border-accent bg-surface px-[15px] py-[10px] font-[inherit] text-title leading-[1.5] text-text outline-none"
                                    onChange={(event) =>
                                        setEditing({ id: message.id, text: event.target.value })
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            resend();
                                        }

                                        if (event.key === 'Escape') {
                                            event.stopPropagation();
                                            setEditing(null);
                                        }
                                    }}
                                    value={editing.text}
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        className="rounded-lg border border-border bg-surface px-[10px] py-[5px] font-[inherit] text-body font-semibold text-text2 hover:bg-surface2"
                                        onClick={() => setEditing(null)}
                                        type="button"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="rounded-lg border-none bg-accent px-3 py-[5px] font-[inherit] text-body font-semibold text-white"
                                        onClick={resend}
                                        type="button"
                                    >
                                        Ask again
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div className="group flex max-w-[78%] flex-col self-end" key={message.id}>
                            <div className="self-end rounded-[15px_15px_4px_15px] bg-accent px-[15px] py-[10px] text-title leading-[1.5] whitespace-pre-wrap text-white select-text">
                                {message.text}
                            </div>
                            <ChatActions align="end" pinned={latest}>
                                <CopyAction text={message.text} />
                                {!busy && (
                                    <ChatAction
                                        label="Edit and ask again"
                                        onClick={() =>
                                            setEditing({ id: message.id, text: message.text })
                                        }
                                    >
                                        <Pencil size={15} />
                                    </ChatAction>
                                )}
                            </ChatActions>
                        </div>
                    );
                })}
                <div ref={end} />
            </div>

            {/* input */}
            <div className="flex flex-none items-center gap-[10px] border-t border-border px-5 py-[14px]">
                <input
                    className="flex-1 rounded-11 border-none bg-surface3 px-[14px] py-[11px] text-subhead text-text disabled:opacity-60"
                    disabled={needsSetup}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            submit();
                        }
                    }}
                    placeholder="Ask about anything you've saved…"
                    value={draft}
                />
                {busy ? (
                    <button
                        aria-label="Stop"
                        className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-11 border border-border bg-surface text-text2 hover:bg-surface2"
                        onClick={stopChat}
                        type="button"
                    >
                        <span className="h-[11px] w-[11px] rounded-[2px] bg-current" />
                    </button>
                ) : (
                    <button
                        aria-label="Send"
                        className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-11 border-none bg-accent text-white disabled:opacity-50"
                        disabled={needsSetup}
                        onClick={submit}
                        type="button"
                    >
                        <Send />
                    </button>
                )}
            </div>
        </div>
    );
}

function Answer({
    byStem,
    items,
    message,
    onOpen,
    onRegenerate,
    onSave,
    pinned,
}: {
    byStem: Map<string, Item>;
    items: Item[];
    message: ChatMessage;
    onOpen: (id: string) => void;
    /** Absent for any answer but the last, and while one is being written. */
    onRegenerate?: () => void;
    onSave: () => void;
    pinned: boolean;
}) {
    const sources = sourcesOf(message, items, byStem);

    return (
        <div className="group max-w-[88%] self-start">
            {message.text && (
                <MarkdownView
                    className="rounded-[15px_15px_15px_4px] bg-sel p-4 py-3 text-title leading-[1.55] text-text"
                    markdown={message.text}
                    renderText={(text) => withCitations(text, byStem, onOpen)}
                />
            )}
            {message.pending && (
                <div
                    aria-live="polite"
                    className={cn(
                        'flex items-center gap-2 text-body-sm text-text3',
                        message.text && 'mt-2',
                    )}
                >
                    <span className="h-[6px] w-[6px] flex-none animate-pulse rounded-full bg-accent" />
                    {message.activity ?? 'Thinking…'}
                </div>
            )}
            {message.error && (
                <div
                    className={cn('text-body-sm leading-[1.5] text-text3', message.text && 'mt-2')}
                    role="alert"
                >
                    {message.error}
                </div>
            )}
            {sources.length > 0 && (
                <div className="mt-[9px] flex flex-wrap items-center gap-[7px]">
                    <span className="text-micro font-semibold tracking-[.05em] text-faint uppercase">
                        Sources
                    </span>
                    {sources.map((item) => (
                        <ItemHoverCard item={item} key={item.id}>
                            <button
                                className="inline-flex items-center gap-[6px] rounded-lg border border-border bg-surface px-[9px] py-1 font-[inherit] text-body-sm text-text2 hover:bg-surface2"
                                onClick={() => onOpen(item.id)}
                                type="button"
                            >
                                <span
                                    className={cn(
                                        'flex h-[18px] w-[18px] flex-none items-center justify-center rounded-5',
                                        typeMeta(item.type).chip,
                                    )}
                                >
                                    <Icon name={item.type} size={13} />
                                </span>
                                {item.title}
                            </button>
                        </ItemHoverCard>
                    ))}
                </div>
            )}
            {!message.pending && message.text && (
                <ChatActions align="start" pinned={pinned}>
                    <CopyAction text={message.text} />
                    <ChatAction label="Save as a note" onClick={onSave}>
                        <FileGlyph size={15} />
                    </ChatAction>
                    {onRegenerate && (
                        <ChatAction label="Answer again" onClick={onRegenerate}>
                            <Restart size={14} />
                        </ChatAction>
                    )}
                </ChatActions>
            )}
        </div>
    );
}

/**
 * The items an answer rests on. The ids it was saved with come first; where
 * none of them is in the vault any more, the answer's own citations are read
 * instead, since an item written by hand has no id that survives a reindex.
 */
function sourcesOf(message: ChatMessage, items: Item[], byStem: Map<string, Item>): Item[] {
    const stored = (message.sources ?? [])
        .map((source) => items.find((item) => item.id === source.itemId))
        .filter((item): item is Item => !!item);

    if (stored.length > 0) {
        return stored;
    }

    const cited: Item[] = [];

    for (const match of message.text.matchAll(WIKILINK)) {
        const item = byStem.get(match[1].split('|')[0].trim().toLowerCase());

        if (item && !cited.includes(item)) {
            cited.push(item);
        }
    }

    return cited;
}

function stemOf(item: Item): string {
    const name = item.path?.slice(item.path.lastIndexOf('/') + 1) ?? '';

    return name.replace(/\.md$/, '').toLowerCase();
}

/** A run of the answer's text, with each `[[stem]]` it cites turned into the item it names. */
function withCitations(
    text: string,
    byStem: Map<string, Item>,
    onOpen: (id: string) => void,
): ReactNode[] {
    const parts: ReactNode[] = [];
    let cursor = 0;

    for (const match of text.matchAll(WIKILINK)) {
        const target = match[1].split('|')[0].trim().toLowerCase();
        const item = byStem.get(target);

        parts.push(text.slice(cursor, match.index));
        cursor = match.index + match[0].length;

        if (!item) {
            parts.push(match[0]);

            continue;
        }

        parts.push(
            <ItemHoverCard item={item} key={match.index}>
                <button
                    className="inline border-none bg-transparent p-0 text-left font-[inherit] text-accent underline decoration-accent-border underline-offset-2 hover:decoration-accent"
                    onClick={() => onOpen(item.id)}
                    type="button"
                >
                    {item.title}
                </button>
            </ItemHoverCard>,
        );
    }

    parts.push(text.slice(cursor));

    return parts;
}
