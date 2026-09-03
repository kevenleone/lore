// Detail-pane chat: "Ask Lore" — answers grounded in the knowledge base,
// citing Sources chips that jump to the referenced item.

import { useState } from 'react';

import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { hoverChip } from '../../theme/util.css';
import { Close, Send, Sparkle } from '../common/glyphs';
import { Icon } from '../common/Icon';

const AC = 'var(--ac, #5b5bd6)';

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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* header */}
            <div
                style={{
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border, #ececef)',
                    display: 'flex',
                    flex: 'none',
                    gap: 11,
                    padding: '15px 20px',
                }}
            >
                <span
                    style={{
                        alignItems: 'center',
                        background: 'var(--ac-tint, #eeeef2)',
                        borderRadius: 8,
                        color: AC,
                        display: 'flex',
                        height: 28,
                        justifyContent: 'center',
                        width: 28,
                    }}
                >
                    <Sparkle />
                </span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 680 }}>Ask Lore</div>
                    <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12 }}>
                        Answers grounded in your knowledge base
                    </div>
                </div>
                <span
                    onClick={toggleChat}
                    style={{ color: 'var(--faint, #a8a8b0)', cursor: 'pointer', display: 'flex' }}
                >
                    <Close />
                </span>
            </div>

            {/* messages */}
            <div
                style={{
                    display: 'flex',
                    flex: 1,
                    flexDirection: 'column',
                    gap: 16,
                    overflow: 'auto',
                    padding: '22px 24px',
                }}
            >
                {messages.map((m) =>
                    m.role === 'user' ? (
                        <div
                            key={m.id}
                            style={{
                                alignSelf: 'flex-end',
                                background: AC,
                                borderRadius: '15px 15px 4px 15px',
                                color: '#fff',
                                fontSize: 14,
                                lineHeight: 1.5,
                                maxWidth: '78%',
                                padding: '10px 15px',
                            }}
                        >
                            {m.text}
                        </div>
                    ) : (
                        <div key={m.id} style={{ alignSelf: 'flex-start', maxWidth: '88%' }}>
                            <div
                                style={{
                                    background: 'var(--sel, #f4f4f6)',
                                    borderRadius: '15px 15px 15px 4px',
                                    color: 'var(--text, #1a1a1f)',
                                    fontSize: 14,
                                    lineHeight: 1.55,
                                    padding: '12px 16px',
                                }}
                            >
                                {m.text}
                            </div>
                            {m.sources && m.sources.length > 0 && (
                                <div
                                    style={{
                                        alignItems: 'center',
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 7,
                                        marginTop: 9,
                                    }}
                                >
                                    <span
                                        style={{
                                            color: 'var(--faint, #a8a8b0)',
                                            fontSize: 10.5,
                                            fontWeight: 600,
                                            letterSpacing: '.05em',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        Sources
                                    </span>
                                    {m.sources.map((src) => {
                                        const item = items.find((i) => i.id === src.itemId);
                                        if (!item) return null;
                                        const meta = typeMeta(item.type);
                                        return (
                                            <span
                                                className={hoverChip}
                                                key={src.itemId}
                                                onClick={() => selectItem(src.itemId)}
                                                style={{
                                                    alignItems: 'center',
                                                    background: 'var(--surface, #fff)',
                                                    border: '1px solid var(--border, #e4e4ea)',
                                                    borderRadius: 8,
                                                    color: 'var(--text2, #6b6b76)',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    fontSize: 12,
                                                    gap: 6,
                                                    padding: '4px 9px',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        alignItems: 'center',
                                                        background: meta.bg,
                                                        borderRadius: 5,
                                                        color: meta.fg,
                                                        display: 'flex',
                                                        flex: 'none',
                                                        height: 18,
                                                        justifyContent: 'center',
                                                        width: 18,
                                                    }}
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
            <div
                style={{
                    alignItems: 'center',
                    borderTop: '1px solid var(--border, #ececef)',
                    display: 'flex',
                    flex: 'none',
                    gap: 10,
                    padding: '14px 20px',
                }}
            >
                <input
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submit();
                    }}
                    placeholder="Ask about anything you've saved…"
                    style={{
                        background: 'var(--surface3, #f1f1f3)',
                        border: 'none',
                        borderRadius: 11,
                        color: 'var(--text, #1a1a1f)',
                        flex: 1,
                        fontSize: 13.5,
                        outline: 'none',
                        padding: '11px 14px',
                    }}
                    value={draft}
                />
                <span
                    onClick={submit}
                    style={{
                        alignItems: 'center',
                        background: AC,
                        borderRadius: 11,
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        flex: 'none',
                        height: 38,
                        justifyContent: 'center',
                        width: 38,
                    }}
                >
                    <Send />
                </span>
            </div>
        </div>
    );
}
