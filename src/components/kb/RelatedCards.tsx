// "Related" section in the detail pane — AI-surfaced item cards.

import type { Item } from '../../store/types';

import { cn } from '../../lib/cn';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { ChevronRight, Sparkle } from '../common/glyphs';
import { Icon } from '../common/Icon';

export function RelatedCards({ related }: { related: Item[] }) {
    const selectItem = useStore((s) => s.selectItem);

    return (
        <div className="mt-[22px]">
            <div className="mb-[11px] flex items-center gap-2">
                <span className="text-caption font-[680] tracking-[.06em] text-faint uppercase">
                    Related
                </span>
                <span className="inline-flex items-center gap-1 text-caption text-accent">
                    <Sparkle size={12} />
                    surfaced by AI
                </span>
            </div>
            <div className="flex flex-col gap-2">
                {related.map((r) => {
                    const meta = typeMeta(r.type);
                    return (
                        <div
                            className="flex cursor-pointer items-center gap-[11px] rounded-11 border border-border px-[13px] py-[11px] hover:border-border hover:bg-surface2"
                            key={r.id}
                            onClick={() => selectItem(r.id)}
                        >
                            <span
                                className={cn(
                                    'flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg',
                                    meta.chip,
                                )}
                            >
                                <Icon name={r.type} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-subhead font-semibold text-text">
                                    {r.title}
                                </div>
                                <div className="text-body-sm text-text3">
                                    {r.domain || meta.label}
                                </div>
                            </div>
                            <span className="flex flex-none text-faint">
                                <ChevronRight />
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
