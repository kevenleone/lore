// The List layout: one dense row per item, with the thumbnail on the left and
// the tag row under the subtitle. This is the layout the middle pane has always
// had — Cards and Table are the alternatives.

import type { Item } from '../../store/types';

import { hasBanner } from '../../lib/banner';
import { formatRelative } from '../../lib/format';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { Icon } from '../common/Icon';
import { ItemBanner } from './ItemBanner';
import { subtitle } from './itemText';
import { listRow, tagRow, tagRowCompact } from './ListPane.css';

const AC = 'var(--ac, #5b5bd6)';

export function ListRows({ items }: { items: Item[] }) {
    const selectedId = useStore((s) => s.selectedId);
    const selectItem = useStore((s) => s.selectItem);
    const density = useStore((s) => s.prefs.density);

    // "List density" (Settings → Look & Feel): Compact also hides the tag row
    // until the row is hovered, exactly as the setting's description promises.
    const rowPadding = { Compact: '7px 14px', Cozy: '11px 14px', Roomy: '16px 14px' }[density];

    return (
        <>
            {items.map((item) => {
                const meta = typeMeta(item.type);
                const selected = item.id === selectedId;
                return (
                    <div
                        className={listRow}
                        key={item.id}
                        onClick={() => selectItem(item.id)}
                        style={{
                            alignItems: 'flex-start',
                            borderBottom: '1px solid var(--border, #ececef)',
                            cursor: 'pointer',
                            display: 'flex',
                            gap: 12,
                            padding: rowPadding,
                            ...(selected
                                ? {
                                      background: 'var(--ac-tint, #eeeef2)',
                                      boxShadow: `inset 2px 0 0 ${AC}`,
                                  }
                                : {}),
                        }}
                    >
                        {hasBanner(item) ? (
                            <span
                                style={{
                                    background: 'var(--surface3, #f1f1f3)',
                                    borderRadius: 7,
                                    flex: 'none',
                                    height: 38,
                                    marginTop: 1,
                                    overflow: 'hidden',
                                    position: 'relative',
                                    width: 56,
                                }}
                            >
                                <ItemBanner item={item} />
                            </span>
                        ) : (
                            <span
                                style={{
                                    alignItems: 'center',
                                    background: meta.bg,
                                    borderRadius: 8,
                                    color: meta.fg,
                                    display: 'flex',
                                    flex: 'none',
                                    height: 32,
                                    justifyContent: 'center',
                                    marginTop: 1,
                                    width: 32,
                                }}
                            >
                                <Icon name={item.type} />
                            </span>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    color: 'var(--text, #1a1a1f)',
                                    fontSize: 13.5,
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {item.title}
                            </div>
                            <div
                                style={{
                                    color: 'var(--text3, #9a9aa5)',
                                    fontSize: 12,
                                    marginTop: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {subtitle(item)}
                            </div>
                            <div className={density === 'Compact' ? tagRowCompact : tagRow}>
                                {item.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        style={{
                                            background: 'var(--surface3, #f1f1f3)',
                                            borderRadius: 5,
                                            color: 'var(--text3, #9a9aa5)',
                                            fontFamily: 'ui-monospace,Menlo,monospace',
                                            fontSize: 10,
                                            padding: '1px 5px',
                                        }}
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <span
                            style={{
                                color: 'var(--faint, #a8a8b0)',
                                flex: 'none',
                                fontSize: 11,
                                marginTop: 1,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {formatRelative(item.createdAt)}
                        </span>
                    </div>
                );
            })}
        </>
    );
}
