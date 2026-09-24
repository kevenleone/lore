// A note, read without leaving the graph.
//
// Exploring a graph means opening a dozen things in a row, and a click that
// throws you back into the library ends the exploration every time. This answers
// "what is this one?" in place; opening it properly is a deliberate second step.
//
// The chrome is the capture drawer's, and the body goes through `DocumentView`
// rather than being printed as source — a preview showing `## Heading` is not a
// preview of the note, it is a preview of the file.

import { useEffect, useState } from 'react';

import type { Item } from '../../store/types';

import { getRepository } from '../../data';
import { cn } from '../../lib/cn';
import { DRAWER_MS } from '../../lib/motion';
import { useMountTransition } from '../../lib/useMountTransition';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { Close } from '../common/glyphs';
import { DocumentView } from '../editor/DocumentView';

export function GraphPreview({ id, onClose }: { id: null | string; onClose: () => void }) {
    const [item, setItem] = useState<Item | null>(null);
    const selectItem = useStore((state) => state.selectItem);
    const setMainView = useStore((state) => state.setMainView);
    const reduceMotion = useStore((state) => state.prefs.switches.motion);
    const { mounted, open } = useMountTransition(id !== null, DRAWER_MS, reduceMotion);

    useEffect(() => {
        if (!id) {
            return;
        }

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

    if (!mounted) {
        return null;
    }

    const meta = item ? typeMeta(item.type) : null;

    return (
        <aside
            className={cn(
                'absolute top-0 right-0 bottom-0 z-10 flex min-h-0 w-[420px] flex-col border-l border-border bg-surface shadow-float',
                !reduceMotion && (open ? 'animate-drawer-in' : 'animate-drawer-out'),
            )}
        >
            <div className="flex flex-none items-start gap-2 border-b border-border bg-surface2 px-4 py-3">
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
                    className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-7 border-none bg-transparent p-0 text-text3"
                    onClick={onClose}
                    type="button"
                >
                    <Close size={15} sw={2} />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {item?.tags.length ? (
                    <div className="mb-3 flex flex-wrap gap-[5px]">
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
                {item ? (
                    <DocumentView className="text-body" markdown={body(item)} />
                ) : (
                    <div className="text-body text-text3">Loading…</div>
                )}
            </div>

            <div className="flex flex-none items-center border-t border-border px-4 py-[10px]">
                <button
                    className="rounded-7 border border-border bg-surface2 px-[10px] py-[5px] text-body text-text"
                    onClick={() => {
                        if (id) {
                            selectItem(id);
                            setMainView('library');
                        }
                    }}
                    type="button"
                >
                    Open in library
                </button>
            </div>
        </aside>
    );
}

/** The note's own Markdown, or whatever stands in for it on a link or an image. */
function body(item: Item): string {
    const text = (item.body ?? '').trim();

    if (text) {
        return text;
    }

    return item.description?.trim() || item.url || '*This note has no body yet.*';
}
