// The List layout: one dense row per item, with the thumbnail on the left and
// the tag row under the subtitle. This is the layout the middle pane has always
// had — Cards and Table are the alternatives.

import type { SurfaceProps } from './surface';

import { hasBanner } from '../../lib/banner';
import { cn } from '../../lib/cn';
import { formatRelative } from '../../lib/format';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { Icon } from '../common/Icon';
import { ItemBanner } from './ItemBanner';
import { subtitle } from './itemText';
import { RowCheckbox } from './RowCheckbox';
import { useRowSelection } from './useRowSelection';

/** Compact hides the tag row until its own row is hovered — hence `group`. */
const TAG_ROW = 'mt-[6px] flex flex-wrap gap-[5px]';

export function ListRows({ items, onContextMenu }: SurfaceProps) {
    const selectedId = useStore((state) => state.selectedId);
    const density = useStore((state) => state.prefs.density);
    const selection = useRowSelection(items);

    // "List density" (Settings → Look & Feel): Compact also hides the tag row
    // until the row is hovered, exactly as the setting's description promises.
    const rowPadding = {
        Compact: 'px-[14px] py-[7px]',
        Cozy: 'px-[14px] py-[11px]',
        Roomy: 'px-[14px] py-[16px]',
    }[density];

    return (
        <>
            {items.map((item) => {
                const meta = typeMeta(item.type);
                const selected = item.id === selectedId;

                return (
                    <div
                        className={cn(
                            'group flex items-start gap-3 border-b border-border',
                            rowPadding,
                            selected && 'bg-accent-tint shadow-[inset_2px_0_0_var(--ac)]',
                        )}
                        key={item.id}
                        onClick={(event) => selection.onRowClick(event, item.id)}
                        onContextMenu={(event) => onContextMenu(event, item.id)}
                    >
                        <span className="mt-[3px] flex">
                            <RowCheckbox
                                checked={selection.isChecked(item.id)}
                                label={item.title}
                                onToggle={(event) => selection.onToggle(event, item.id)}
                                shown={selection.active}
                            />
                        </span>
                        {hasBanner(item) ? (
                            <span className="relative mt-px h-[38px] w-[56px] flex-none overflow-hidden rounded-7 bg-surface3">
                                <ItemBanner item={item} />
                            </span>
                        ) : (
                            <span
                                className={cn(
                                    'mt-px flex h-8 w-8 flex-none items-center justify-center rounded-lg',
                                    meta.chip,
                                )}
                            >
                                <Icon name={item.type} />
                            </span>
                        )}
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-subhead font-semibold text-text">
                                {item.title}
                            </div>
                            <div className="mt-px truncate text-body-sm text-text3">
                                {subtitle(item)}
                            </div>
                            <div
                                className={cn(
                                    TAG_ROW,
                                    density === 'Compact' && 'hidden group-hover:flex',
                                )}
                            >
                                {item.tags.map((tag) => (
                                    <span
                                        className="rounded-5 bg-surface3 px-[5px] py-px font-mono text-[10px] text-text3"
                                        key={tag}
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <span className="mt-px flex-none text-caption whitespace-nowrap text-faint">
                            {formatRelative(item.createdAt)}
                        </span>
                    </div>
                );
            })}
        </>
    );
}
