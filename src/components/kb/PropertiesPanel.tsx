// The right-hand Properties panel: everything Lore knows about the selected
// item that the reading column deliberately does not show — its editable
// fields, both directions of its links, comments, and the file's own stats.
//
// Docked rather than floating. It pushes the detail column aside the way the
// sidebar does on the other edge, so it can stay open while you read.

import { useStore } from '../../store/useStore';
import { Close, History, Settings } from '../common/glyphs';
import { CommentsSection } from './properties/CommentsSection';
import { Section } from './properties/controls';
import { InfoSection } from './properties/InfoSection';
import { PropertyRows } from './properties/PropertyRows';
import { RelationshipsSection } from './properties/RelationshipsSection';

/** Matches `SIDEBAR_WIDTH`'s role: the panel's width when it is showing. */
export const PROPERTIES_WIDTH = 316;

export function PropertiesPanel() {
    const items = useStore((s) => s.items);
    const selectedId = useStore((s) => s.selectedId);
    const detail = useStore((s) => s.detail);
    const itemMeta = useStore((s) => s.itemMeta);
    const toggleProperties = useStore((s) => s.toggleProperties);

    // Same rule as the detail pane: the list row paints immediately, `detail`
    // lands a tick later carrying the body.
    const listItem = items.find((i) => i.id === selectedId);
    const item = detail && detail.id === listItem?.id ? detail : listItem;

    return (
        <div
            style={{
                background: 'var(--surface2, #fafafa)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: PROPERTIES_WIDTH,
            }}
        >
            <div
                style={{
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border, #ececef)',
                    display: 'flex',
                    flex: 'none',
                    gap: 8,
                    height: 44,
                    padding: '0 10px 0 16px',
                }}
            >
                <Settings size={14} style={{ color: 'var(--faint, #a8a8b0)' }} />
                <span
                    style={{
                        color: 'var(--text, #1a1a1f)',
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 620,
                    }}
                >
                    Properties
                </span>
                <button
                    aria-label="Close properties"
                    onClick={toggleProperties}
                    style={{
                        alignItems: 'center',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 7,
                        color: 'var(--text3, #9a9aa5)',
                        cursor: 'pointer',
                        display: 'flex',
                        height: 26,
                        justifyContent: 'center',
                        padding: 0,
                        width: 26,
                    }}
                    type="button"
                >
                    <Close size={16} sw={2} />
                </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {item ? (
                    <>
                        <PropertyRows item={item} />
                        <RelationshipsSection item={item} />
                        <CommentsSection item={item} />
                        <InfoSection item={item} meta={itemMeta} />
                        <Section icon={<History size={12} />} title="History">
                            <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12.5 }}>
                                No version history yet
                            </div>
                        </Section>
                    </>
                ) : (
                    <div
                        style={{
                            color: 'var(--text3, #9a9aa5)',
                            fontSize: 12.5,
                            padding: '28px 16px',
                            textAlign: 'center',
                        }}
                    >
                        Select an item to see its properties.
                    </div>
                )}
            </div>
        </div>
    );
}
