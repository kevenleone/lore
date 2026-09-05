// Detail-pane chat: "Ask Lore" — answers grounded in the knowledge base,
// citing Sources chips that jump to the referenced item.

import { useState } from 'react';

import { cn } from '../../lib/cn';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { Close, Send, Sparkle } from '../common/glyphs';
import { Icon } from '../common/Icon';

export function AskLoreChat() {
    const messages = useStore((s) => s.chat);
    const items = useStore((s) => s.items);
    const toggleChat = useStore((s) => s.toggleChat);
    const sendChat = useStore((s) => s.sendChat);
    const selectItem = useStore((s) => s.selectItem);
    const [draft, setDraft] = useState('');

    const submit = () => {
        const text = draft.trim();
        if (!text) return;
        setDraft('');
        void sendChat(text);
    };

    return (
        <div className="flex h-full flex-col">
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
                <span className="flex cursor-pointer text-faint" onClick={toggleChat}>
                    <Close />
                </span>
            </div>

            {/* messages */}
            <div className="flex flex-1 flex-col gap-4 overflow-auto px-6 py-[22px]">
                {messages.map((m) =>
                    m.role === 'user' ? (
                        <div
                            className="max-w-[78%] self-end rounded-[15px_15px_4px_15px] bg-accent px-[15px] py-[10px] text-title leading-[1.5] text-white"
                            key={m.id}
                        >
                            {m.text}
                        </div>
                    ) : (
                        <div className="max-w-[88%] self-start" key={m.id}>
                            <div className="rounded-[15px_15px_15px_4px] bg-sel p-4 py-3 text-title leading-[1.55] text-text">
                                {m.text}
                            </div>
                            {m.sources && m.sources.length > 0 && (
                                <div className="mt-[9px] flex flex-wrap items-center gap-[7px]">
                                    <span className="text-micro font-semibold tracking-[.05em] text-faint uppercase">
                                        Sources
                                    </span>
                                    {m.sources.map((src) => {
                                        const item = items.find((i) => i.id === src.itemId);
                                        if (!item) return null;
                                        const meta = typeMeta(item.type);
                                        return (
                                            <span
                                                className="inline-flex cursor-pointer items-center gap-[6px] rounded-lg border border-border bg-surface px-[9px] py-1 text-body-sm text-text2 hover:border-border hover:bg-surface2"
                                                key={src.itemId}
                                                onClick={() => selectItem(src.itemId)}
                                            >
                                                <span
                                                    className={cn(
                                                        'flex h-[18px] w-[18px] flex-none items-center justify-center rounded-5',
                                                        meta.chip,
                                                    )}
                                                >
                                                    <Icon name={item.type} size={13} />
                                                </span>
                                                {item.title}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ),
                )}
            </div>

            {/* input */}
            <div className="flex flex-none items-center gap-[10px] border-t border-border px-5 py-[14px]">
                <input
                    className="flex-1 rounded-11 border-none bg-surface3 px-[14px] py-[11px] text-subhead text-text outline-none"
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submit();
                    }}
                    placeholder="Ask about anything you've saved…"
                    value={draft}
                />
                <span
                    className="flex h-[38px] w-[38px] flex-none cursor-pointer items-center justify-center rounded-11 bg-accent text-white"
                    onClick={submit}
                >
                    <Send />
                </span>
            </div>
        </div>
    );
}
