// The Table layout: one grid row per item under a sticky header, for scanning
// a large library by collection, tag or type rather than by title alone.
//
// The header and the rows share GRID_COLUMNS so the columns line up without a
// real <table>, which could not give the rows their own hover and selection
// treatment as cheaply.

import type { Item } from '../../store/types';

import { hasBanner } from '../../lib/banner';
import { cn } from '../../lib/cn';
import { formatRelative } from '../../lib/format';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { collectionFor } from '../../store/views';
import { Icon } from '../common/Icon';
import { ItemBanner } from './ItemBanner';
import { subtitle } from './itemText';

const GRID_COLUMNS = 'minmax(240px, 1fr) 168px 176px 116px 92px';

const COLUMNS = ['Item', 'Collection', 'Tags', 'Type', 'Added'];

export function TableView({ items }: { items: Item[] }) {
    const collections = useStore((s) => s.collections);
    const selectedId = useStore((s) => s.selectedId);
    const selectItem = useStore((s) => s.selectItem);

    return (
        <>
            <div
                className="sticky top-0 z-2 grid items-center gap-4 border-b border-border bg-surface2 px-[18px] py-[9px] text-micro font-[680] tracking-[.07em] text-faint uppercase"
                style={{ gridTemplateColumns: GRID_COLUMNS }}
            >
                {COLUMNS.map((label, i) => (
                    <span
                        className={i === COLUMNS.length - 1 ? 'text-right' : 'text-left'}
                        key={label}
                    >
                        {label}
                    </span>
                ))}
            </div>
            {items.map((item) => {
                const meta = typeMeta(item.type);
                const coll = collectionFor(item, collections);
                const selected = item.id === selectedId;
                return (
                    <div
                        className={cn(
                            // Table rows have no thumbnail column to anchor them, so
                            // they take a hover of their own.
                            'grid cursor-pointer items-center gap-4 border-b border-border-soft px-[18px] py-[9px] hover:bg-hover',
                            selected && 'bg-sel shadow-[inset_2px_0_0_var(--ac)]',
                        )}
                        key={item.id}
                        onClick={() => selectItem(item.id)}
                        style={{ gridTemplateColumns: GRID_COLUMNS }}
                    >
                        <div className="flex min-w-0 items-center gap-[11px]">
                            {hasBanner(item) ? (
                                <span className="relative h-[30px] w-[44px] flex-none overflow-hidden rounded-5 bg-surface3">
                                    <ItemBanner item={item} />
                                </span>
                            ) : (
                                <span
                                    className={cn(
                                        'flex h-[30px] w-[44px] flex-none items-center justify-center rounded-5',
                                        meta.chip,
                                    )}
                                >
                                    <Icon name={item.type} size={15} />
                                </span>
                            )}
                            <span className="min-w-0">
                                <span className="block truncate text-body-lg font-[590] text-text">
                                    {item.title}
                                </span>
                                <span className="block truncate text-label text-text3">
                                    {subtitle(item)}
                                </span>
                            </span>
                        </div>
                        <div className="flex min-w-0 items-center gap-[7px] text-body text-text2">
                            <span
                                className="h-2 w-2 flex-none rounded-xs"
                                // The dot carries the collection's own colour, which
                                // the user picks; there is no token for it.
                                style={{ background: coll?.color ?? 'var(--faint)' }}
                            />
                            <span className="truncate">{coll?.name ?? 'Unfiled'}</span>
                        </div>
                        <div className="flex gap-[5px] overflow-hidden">
                            {item.tags.map((tag) => (
                                <span
                                    className="rounded-5 bg-surface3 px-[6px] py-[2px] font-mono text-micro whitespace-nowrap text-text3"
                                    key={tag}
                                >
                                    #{tag}
                                </span>
                            ))}
                        </div>
                        <div className="text-body-sm text-text2">{meta.label}</div>
                        <div className="text-right text-body-sm text-faint tabular-nums">
                            {formatRelative(item.createdAt)}
                        </div>
                    </div>
                );
            })}
        </>
    );
}
