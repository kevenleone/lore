// The Cards layout: a responsive grid of preview tiles. Each card leads with
// its banner — the real image once it loads, the hashed placeholder before
// that — and closes with the collection it lives in.

import type { SurfaceProps } from './surface';

import { hasBanner } from '../../lib/banner';
import { cn } from '../../lib/cn';
import { formatRelative } from '../../lib/format';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { collectionFor } from '../../store/views';
import { Icon } from '../common/Icon';
import { ItemBanner } from './ItemBanner';
import { subtitle } from './itemText';
import { Checkbox } from './RowCheckbox';
import { useRowSelection } from './useRowSelection';

export function CardGrid({ items, onContextMenu }: SurfaceProps) {
    const collections = useStore((state) => state.collections);
    const selectedId = useStore((state) => state.selectedId);
    const reduceMotion = useStore((state) => state.prefs.switches.motion);
    const selection = useRowSelection(items);

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(216px,1fr))] content-start gap-[14px] p-4">
            {items.map((item) => {
                const meta = typeMeta(item.type);
                const coll = collectionFor(item, collections);
                const selected = item.id === selectedId;
                const checked = selection.isChecked(item.id);

                return (
                    <div
                        className={cn(
                            'flex flex-col overflow-hidden rounded-xl border bg-surface',
                            selected || checked
                                ? 'border-accent shadow-[0_0_0_2px_var(--ac-tint)]'
                                : 'border-border',
                        )}
                        key={item.id}
                        onClick={(event) => selection.onRowClick(event, item.id)}
                        onContextMenu={(event) => onContextMenu(event, item.id)}
                    >
                        <div className="relative h-[118px] flex-none overflow-hidden bg-surface3">
                            {/* Over the banner rather than beside it: a card has
                                somewhere to put this that costs no layout, so
                                opening the mode moves nothing at all. */}
                            <span
                                className={cn(
                                    'absolute top-[9px] left-[9px] z-1 rounded-[5px] bg-surface p-[3px] shadow-float',
                                    !reduceMotion && 'transition-opacity duration-200 ease-out',
                                    selection.active
                                        ? 'opacity-100'
                                        : 'pointer-events-none opacity-0',
                                )}
                            >
                                <Checkbox
                                    checked={checked}
                                    label={item.title}
                                    onToggle={(event) => selection.onToggle(event, item.id)}
                                    tabbable={selection.active}
                                />
                            </span>
                            {hasBanner(item) ? (
                                <ItemBanner chip item={item} />
                            ) : (
                                <div
                                    className={cn(
                                        'flex h-full items-center justify-center',
                                        meta.chip,
                                    )}
                                >
                                    <Icon name={item.type} size={26} strokeWidth={1.5} />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-1 flex-col gap-[5px] px-3 pt-[11px] pb-3">
                            <div
                                className={cn(
                                    'flex items-center gap-[6px] text-micro font-semibold tracking-[.04em] uppercase',
                                    meta.chipFg,
                                )}
                            >
                                <Icon name={item.type} size={12} strokeWidth={2} />
                                {meta.label}
                            </div>
                            <div className="line-clamp-2 text-subhead leading-[1.35] font-[620] text-text">
                                {item.title}
                            </div>
                            <div className="truncate text-label text-text3">{subtitle(item)}</div>
                            <div className="mt-auto flex items-center gap-[6px] pt-2">
                                <span
                                    className="h-2 w-2 flex-none rounded-xs"
                                    // The collection's own colour, which the user picks.
                                    style={{ background: coll?.color ?? 'var(--faint)' }}
                                />
                                <span className="truncate text-label text-text3">
                                    {coll?.name ?? 'Unfiled'}
                                </span>
                                <span className="ml-auto text-caption whitespace-nowrap text-faint">
                                    {formatRelative(item.createdAt)}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
