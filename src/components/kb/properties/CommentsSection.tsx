// Comments on an item. They live in the file's own frontmatter, so they travel
// with the note into Obsidian, git and anything else that reads the vault.

import { lazy, Suspense, useState } from 'react';

import type { Item } from '../../../store/types';

import { cn } from '../../../lib/cn';
import { formatSavedDate } from '../../../lib/format';
import { useStore } from '../../../store/useStore';
import { Message } from '../../common/glyphs';
// The Markdown parser is ~34 kB gzipped and comments live behind a panel
// toggle, so it loads with the panel rather than with the window.
const MarkdownView = lazy(async () => ({
    default: (await import('../../common/MarkdownView')).MarkdownView,
}));
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
                            <div className="text-body leading-[1.55] text-text2">
                                <Suspense
                                    fallback={
                                        <div className="whitespace-pre-wrap">{comment.body}</div>
                                    }
                                >
                                    <MarkdownView markdown={comment.body} />
                                </Suspense>
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
