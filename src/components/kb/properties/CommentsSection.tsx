// Comments on an item. They live in the file's own frontmatter, so they travel
// with the note into Obsidian, git and anything else that reads the vault.

import { useState } from 'react';

import type { Item } from '../../../store/types';

import { formatSavedDate } from '../../../lib/format';
import { useStore } from '../../../store/useStore';
import { Message } from '../../common/glyphs';
import { Empty, Section } from './controls';

const AC = 'var(--ac, #5b5bd6)';

export function CommentsSection({ item }: { item: Item }) {
    const addComment = useStore((s) => s.addComment);
    const removeComment = useStore((s) => s.removeComment);
    const [draft, setDraft] = useState('');

    const comments = item.comments ?? [];

    const submit = () => {
        if (!draft.trim()) return;
        void addComment(item.id, draft);
        setDraft('');
    };

    return (
        <Section icon={<Message size={12} />} title="Comments">
            {comments.length === 0 ? (
                <Empty>No comments yet</Empty>
            ) : (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        marginBottom: 10,
                    }}
                >
                    {comments.map((comment) => (
                        <div
                            key={comment.id}
                            style={{
                                background: 'var(--surface2, #fafafa)',
                                border: '1px solid var(--border, #ececef)',
                                borderRadius: 9,
                                padding: '8px 10px',
                            }}
                        >
                            <div
                                style={{
                                    alignItems: 'center',
                                    color: 'var(--faint, #a8a8b0)',
                                    display: 'flex',
                                    fontSize: 11.5,
                                    gap: 6,
                                    marginBottom: 4,
                                }}
                            >
                                {comment.author && (
                                    <span
                                        style={{ color: 'var(--text2, #6b6b76)', fontWeight: 600 }}
                                    >
                                        {comment.author}
                                    </span>
                                )}
                                <span>{formatSavedDate(comment.at)}</span>
                                <span
                                    onClick={() => void removeComment(item.id, comment.id)}
                                    style={{
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        lineHeight: 1,
                                        marginLeft: 'auto',
                                    }}
                                    title="Delete comment"
                                >
                                    ×
                                </span>
                            </div>
                            <div
                                style={{
                                    color: 'var(--text2, #6b6b76)',
                                    fontSize: 12.5,
                                    lineHeight: 1.55,
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {comment.body}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <textarea
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
                }}
                placeholder="Add a comment…"
                style={{
                    background: 'var(--surface, #fff)',
                    border: '1px solid var(--border, #ececef)',
                    borderRadius: 9,
                    color: 'var(--text, #1a1a1f)',
                    font: 'inherit',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    minHeight: 58,
                    outline: 'none',
                    padding: '8px 10px',
                    resize: 'vertical',
                    width: '100%',
                }}
                value={draft}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 7 }}>
                <button
                    disabled={!draft.trim()}
                    onClick={submit}
                    style={{
                        background: draft.trim() ? AC : 'var(--surface3, #f1f1f3)',
                        border: 'none',
                        borderRadius: 8,
                        color: draft.trim() ? '#fff' : 'var(--faint, #a8a8b0)',
                        cursor: draft.trim() ? 'pointer' : 'default',
                        font: 'inherit',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '5px 12px',
                    }}
                    type="button"
                >
                    Comment
                </button>
            </div>
        </Section>
    );
}
