// Comments on an item. They live in the file's own frontmatter, so they travel
// with the note into Obsidian, git and anything else that reads the vault.

import { useState } from 'react';

import type { Item } from '../../../store/types';

import { cn } from '../../../lib/cn';
import { formatSavedDate } from '../../../lib/format';
import { useStore } from '../../../store/useStore';
import { Message } from '../../common/glyphs';
import { Empty, Section } from './controls';

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
                <div className="mb-[10px] flex flex-col gap-2">
                    {comments.map((comment) => (
                        <div
                            className="rounded-9 border border-border bg-surface2 px-[10px] py-2"
                            key={comment.id}
                        >
                            <div className="mb-1 flex items-center gap-[6px] text-label text-faint">
                                {comment.author && (
                                    <span className="font-semibold text-text2">
                                        {comment.author}
                                    </span>
                                )}
                                <span>{formatSavedDate(comment.at)}</span>
                                <span
                                    className="ml-auto cursor-pointer text-body-lg leading-none"
                                    onClick={() => void removeComment(item.id, comment.id)}
                                    title="Delete comment"
                                >
                                    ×
                                </span>
                            </div>
                            <div className="text-body leading-[1.55] whitespace-pre-wrap text-text2">
                                {comment.body}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <textarea
                className="min-h-[58px] w-full resize-y rounded-9 border border-border bg-surface px-[10px] py-2 font-[inherit] text-body leading-[1.5] text-text outline-none"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
                }}
                placeholder="Add a comment…"
                value={draft}
            />
            <div className="mt-[7px] flex justify-end">
                <button
                    className={cn(
                        'rounded-lg border-none px-3 py-[5px] font-[inherit] text-body-sm font-semibold',
                        draft.trim()
                            ? 'cursor-pointer bg-accent text-white'
                            : 'cursor-default bg-surface3 text-faint',
                    )}
                    disabled={!draft.trim()}
                    onClick={submit}
                    type="button"
                >
                    Comment
                </button>
            </div>
        </Section>
    );
}
