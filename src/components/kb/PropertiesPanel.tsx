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
            className="flex h-full flex-col bg-surface2"
            // Shared with App.tsx's layout, so it stays a constant.
            style={{ width: PROPERTIES_WIDTH }}
        >
            <div className="flex h-11 flex-none items-center gap-2 border-b border-border pr-[10px] pl-4">
                <Settings className="text-faint" size={14} />
                <span className="flex-1 text-body-lg font-[620] text-text">Properties</span>
                <button
                    aria-label="Close properties"
                    className="flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-7 border-none bg-transparent p-0 text-text3"
                    onClick={toggleProperties}
                    type="button"
                >
                    <Close size={16} sw={2} />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                {item ? (
                    <>
                        <PropertyRows item={item} />
                        <RelationshipsSection item={item} />
                        <CommentsSection item={item} />
                        <InfoSection item={item} meta={itemMeta} />
                        <Section icon={<History size={12} />} title="History">
                            <div className="text-body text-text3">No version history yet</div>
                        </Section>
                    </>
                ) : (
                    <div className="px-4 py-7 text-center text-body text-text3">
                        Select an item to see its properties.
                    </div>
                )}
            </div>
        </div>
    );
}
