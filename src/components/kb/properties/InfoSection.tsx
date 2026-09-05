// Read-only facts about the file behind the item. `itemMeta` is the vault's
// answer; outside Tauri there is no vault to ask, so each row falls back to
// something the item itself can tell us rather than disappearing.

import type { Item, ItemMeta } from '../../../store/types';

import { formatBytes, formatSavedDate } from '../../../lib/format';
import { Info } from '../../common/glyphs';
import { ReadOnly, Row, Section } from './controls';

export function InfoSection({ item, meta }: { item: Item; meta: ItemMeta | null }) {
    const body = item.body?.trim() ?? '';
    const words = meta ? meta.words : body ? body.split(/\s+/).length : 0;

    return (
        <Section icon={<Info size={12} />} title="Info">
            <Row label="Modified">
                <ReadOnly>{formatSavedDate(meta?.modifiedAt ?? item.updatedAt)}</ReadOnly>
            </Row>
            <Row label="Created">
                <ReadOnly>{formatSavedDate(item.createdAt)}</ReadOnly>
            </Row>
            <Row label="Words">
                <ReadOnly>{words.toLocaleString()}</ReadOnly>
            </Row>
            <Row label="Size">
                <ReadOnly>{meta ? formatBytes(meta.size) : null}</ReadOnly>
            </Row>
            <Row label="File">
                <span
                    style={{
                        fontFamily: 'ui-monospace,Menlo,monospace',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                    title={meta?.path ?? item.path}
                >
                    <ReadOnly>{meta?.path ?? item.path}</ReadOnly>
                </span>
            </Row>
        </Section>
    );
}
