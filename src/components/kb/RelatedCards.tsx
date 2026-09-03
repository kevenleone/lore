// "Related" section in the detail pane — AI-surfaced item cards.

import type { Item } from '../../store/types';

import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { hoverCard } from '../../theme/util.css';
import { ChevronRight, Sparkle } from '../common/glyphs';
import { Icon } from '../common/Icon';

const AC = 'var(--ac, #5b5bd6)';

export function RelatedCards({ related }: { related: Item[] }) {
    const selectItem = useStore((s) => s.selectItem);

    return (
        <div style={{ marginTop: 22 }}>
            <div style={{ alignItems: 'center', display: 'flex', gap: 8, marginBottom: 11 }}>
                <span
                    style={{
                        color: 'var(--faint, #a8a8b0)',
                        fontSize: 11,
                        fontWeight: 680,
                        letterSpacing: '.06em',
                        textTransform: 'uppercase',
                    }}
                >
                    Related
                </span>
                <span
                    style={{
                        alignItems: 'center',
                        color: AC,
                        display: 'inline-flex',
                        fontSize: 11,
                        gap: 4,
                    }}
                >
                    <Sparkle size={12} />
                    surfaced by AI
                </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {related.map((r) => {
                    const meta = typeMeta(r.type);
                    return (
                        <div
                            className={hoverCard}
                            key={r.id}
                            onClick={() => selectItem(r.id)}
                            style={{
                                alignItems: 'center',
                                border: '1px solid var(--border, #ececef)',
                                borderRadius: 11,
                                cursor: 'pointer',
                                display: 'flex',
                                gap: 11,
                                padding: '11px 13px',
                            }}
                        >
                            <span
                                style={{
                                    alignItems: 'center',
                                    background: meta.bg,
                                    borderRadius: 8,
                                    color: meta.fg,
                                    display: 'flex',
                                    flex: 'none',
                                    height: 30,
                                    justifyContent: 'center',
                                    width: 30,
                                }}
                            >
                                <Icon name={r.type} />
                            </span>
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
                                    {r.title}
                                </div>
                                <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12 }}>
                                    {r.domain || meta.label}
                                </div>
                            </div>
                            <span
                                style={{
                                    color: 'var(--faint, #a8a8b0)',
                                    display: 'flex',
                                    flex: 'none',
                                }}
                            >
                                <ChevronRight />
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
