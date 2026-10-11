// A model's proposal for an item with no summary: what it would write, shown
// first and written to the file only when accepted. Mounted per item, so moving
// to another note drops whatever was proposed for the last one.

import { useEffect, useMemo, useRef, useState } from 'react';

import type { AiEnrichment, Item } from '../../store/types';

import { getAi } from '../../ai';
import { aiSelection } from '../../ai/selection';
import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { Sparkle } from '../common/glyphs';

type Phase =
    | { kind: 'failed'; message: string }
    | { kind: 'idle' }
    | { kind: 'proposed'; proposal: AiEnrichment }
    | { kind: 'working' };

const ACTION =
    'rounded-lg border border-border bg-surface px-[10px] py-[5px] font-[inherit] text-body font-semibold text-text2 hover:bg-surface2';

export function SummarySuggestion({ item }: { item: Item }) {
    const prefs = useStore((state) => state.prefs);
    const selection = useMemo(() => aiSelection(prefs), [prefs]);
    const updateItem = useStore((state) => state.updateItem);
    const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
    const [droppedTags, setDroppedTags] = useState<string[]>([]);
    const abort = useRef<AbortController | null>(null);

    useEffect(() => () => abort.current?.abort(), []);

    if (!selection) {
        return null;
    }

    const ask = () => {
        const controller = new AbortController();

        abort.current = controller;
        setDroppedTags([]);
        setPhase({ kind: 'working' });

        getAi()
            .enrich({ itemId: item.id, want: ['summary', 'tags'] }, selection, controller.signal)
            .then((proposal) => {
                if (controller.signal.aborted) {
                    return;
                }

                setPhase(
                    proposal.summary
                        ? { kind: 'proposed', proposal }
                        : { kind: 'failed', message: 'The model had nothing to say about this.' },
                );
            })
            .catch((error: unknown) => {
                if (!controller.signal.aborted) {
                    setPhase({
                        kind: 'failed',
                        message: error instanceof Error ? error.message : 'The model failed.',
                    });
                }
            });
    };

    const cancel = () => {
        abort.current?.abort();
        setPhase({ kind: 'idle' });
    };

    if (phase.kind === 'idle' || phase.kind === 'failed') {
        return (
            <div className="mt-5 flex items-center gap-3">
                <button
                    className={cn(ACTION, 'inline-flex items-center gap-[6px]')}
                    onClick={ask}
                    type="button"
                >
                    <span className="flex text-accent">
                        <Sparkle size={13} />
                    </span>
                    Summarize
                </button>
                {phase.kind === 'failed' && (
                    <span className="text-body-sm text-text3" role="alert">
                        {phase.message}
                    </span>
                )}
            </div>
        );
    }

    if (phase.kind === 'working') {
        return (
            <div aria-live="polite" className="mt-5 flex items-center gap-3 text-body text-text3">
                <span className="h-[6px] w-[6px] flex-none animate-pulse rounded-full bg-accent" />
                Summarizing…
                <button className={ACTION} onClick={cancel} type="button">
                    Cancel
                </button>
            </div>
        );
    }

    const { points = [], summary = '', tags = [] } = phase.proposal;
    const keptTags = tags.filter((tag) => !droppedTags.includes(tag));

    const accept = () => {
        void updateItem(item.id, {
            points,
            summary,
            ...(keptTags.length > 0 ? { tags: [...item.tags, ...keptTags] } : {}),
        });
        setPhase({ kind: 'idle' });
    };

    return (
        <div className="mt-5 rounded-[13px] border border-dashed border-accent-border bg-surface px-[18px] py-[17px]">
            <div className="flex items-center gap-2">
                <span className="flex text-accent">
                    <Sparkle size={15} />
                </span>
                <span className="text-body-lg font-[680] text-text">Suggested summary</span>
                <span className="ml-[2px] rounded-5 border border-accent-border bg-surface px-[6px] py-px text-micro text-faint">
                    not saved yet
                </span>
            </div>
            <p className="mt-[10px] mb-0 text-title leading-[1.6] text-text2 select-text">
                {summary}
            </p>
            {points.length > 0 && (
                <div className="mt-[13px] flex flex-col gap-[7px]">
                    {points.map((point) => (
                        <div
                            className="flex items-start gap-[9px] text-subhead leading-[1.5] text-text2"
                            key={point}
                        >
                            <span className="mt-[7px] h-[5px] w-[5px] flex-none rounded-full bg-accent" />
                            <span>{point}</span>
                        </div>
                    ))}
                </div>
            )}
            {tags.length > 0 && (
                <div className="mt-[13px] flex flex-wrap items-center gap-[7px]">
                    {tags.map((tag) => {
                        const kept = !droppedTags.includes(tag);

                        return (
                            <button
                                aria-pressed={kept}
                                className={cn(
                                    'rounded-md border-none px-[7px] py-[2px] font-mono text-caption',
                                    kept
                                        ? 'bg-accent-tint text-accent'
                                        : 'bg-surface3 text-faint line-through',
                                )}
                                key={tag}
                                onClick={() =>
                                    setDroppedTags((current) =>
                                        kept
                                            ? [...current, tag]
                                            : current.filter((dropped) => dropped !== tag),
                                    )
                                }
                                type="button"
                            >
                                #{tag}
                            </button>
                        );
                    })}
                </div>
            )}
            <div className="mt-4 flex items-center gap-2">
                <button
                    className="rounded-lg border-none bg-accent px-3 py-[6px] font-[inherit] text-body font-semibold text-white"
                    onClick={accept}
                    type="button"
                >
                    Save to note
                </button>
                <button className={ACTION} onClick={() => setPhase({ kind: 'idle' })} type="button">
                    Discard
                </button>
            </div>
        </div>
    );
}
