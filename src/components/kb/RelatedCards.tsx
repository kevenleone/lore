// "Related" section in the detail pane.
//
// These are the file's own `related` wikilinks — the Properties panel adds and
// removes them by hand — so the section names the link, not a discovery.

import type { Item } from '../../store/types';

import { cn } from '../../lib/cn';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { ChevronRight } from '../common/glyphs';
import { Icon } from '../common/Icon';

export function RelatedCards({ related }: { related: Item[] }) {
    const selectItem = useStore((s) => s.selectItem);

    return (
        <div className="mt-[22px]">
            <div className="mb-[11px] flex items-center gap-2">
                <span className="text-caption font-[680] tracking-[.06em] text-faint uppercase">
                    Related
                </span>
                <span className="text-caption text-faint">linked in this note</span>
            </div>
            <div className="flex flex-col gap-2">
                {related.map((r) => {
                    const meta = typeMeta(r.type);
                    return (
                        <button
                            className="flex w-full items-center gap-[11px] rounded-11 border border-border bg-transparent px-[13px] py-[11px] text-left font-[inherit] hover:bg-surface2"
                            key={r.id}
                            onClick={() => selectItem(r.id)}
                            type="button"
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
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
