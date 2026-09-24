// A note, read without leaving the graph.
//
// Exploring a graph means opening a dozen things in a row, and a click that
// throws you back into the library ends the exploration every time. This panel
// answers "what is this one?" in place; opening it properly is a deliberate
// second step.

import { useEffect, useState } from 'react';

import type { Item } from '../../store/types';

import { getRepository } from '../../data';
import { cn } from '../../lib/cn';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { Close } from '../common/glyphs';

export function GraphPreview({ id, onClose }: { id: string; onClose: () => void }) {
    const [item, setItem] = useState<Item | null>(null);
    const selectItem = useStore((state) => state.selectItem);
    const setMainView = useStore((state) => state.setMainView);

    useEffect(() => {
        let cancelled = false;

        setItem(null);
        void getRepository()
            .getItem(id)
            .then((found) => {
                if (!cancelled) {
                    setItem(found);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setItem(null);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [id]);

    const meta = item ? typeMeta(item.type) : null;

    return (
        <aside className="absolute top-3 right-3 bottom-3 flex w-[320px] flex-col overflow-hidden rounded-11 border border-border bg-surface shadow-float">
            <div className="flex flex-none items-start gap-2 border-b border-border px-4 py-3">
                <div className="min-w-0 flex-1">
                    {meta && (
                        <span
                            className={cn(
                                'inline-flex rounded-5 px-[6px] py-px text-caption',
                                meta.chip,
                            )}
                        >
                            {meta.label}
                        </span>
                    )}
                    <div className="mt-[6px] text-subhead leading-[1.35] font-semibold">
                        {item?.title ?? '…'}
                    </div>
                </div>
                <button
                    aria-label="Close preview"
                    className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-7 border-none bg-transparent p-0 text-text3"
                    onClick={onClose}
                    type="button"
                >
                    <Close size={14} sw={2} />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {item?.tags.length ? (
                    <div className="mb-[10px] flex flex-wrap gap-[5px]">
                        {item.tags.map((tag) => (
                            <span
                                className="rounded-5 bg-surface3 px-[6px] py-px text-caption text-text3"
                                key={tag}
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                ) : null}
                <div className="text-body leading-[1.6] whitespace-pre-wrap text-text2">
                    {excerpt(item)}
                </div>
            </div>

            <div className="flex flex-none items-center gap-2 border-t border-border px-4 py-[10px]">
                <button
                    className="rounded-7 border border-border bg-surface2 px-[10px] py-[5px] text-body text-text"
                    onClick={() => {
                        selectItem(id);
                        setMainView('library');
                    }}
                    type="button"
                >
                    Open in library
                </button>
            </div>
        </aside>
    );
}

/** The first of the body, or whatever stands in for it on a link or an image. */
function excerpt(item: Item | null): string {
    if (!item) {
        return 'Loading…';
    }

    const body = (item.body ?? '').trim();

    if (body) {
        return body.length > 900 ? `${body.slice(0, 900)}…` : body;
    }

    return item.description?.trim() || item.url || 'This note has no body yet.';
}
