// Facts about the file behind the item. `itemMeta` is the vault's answer;
// outside Tauri there is no vault to ask, so each row falls back to something
// the item itself can tell us rather than disappearing.

import { useState } from 'react';

import type { Item, ItemMeta } from '../../../store/types';

import { formatBytes, formatSavedDate } from '../../../lib/format';
import { useStore } from '../../../store/useStore';
import { Info } from '../../common/glyphs';
import { ReadOnly, Row, Section } from './controls';

export function InfoSection({ item, meta }: { item: Item; meta: ItemMeta | null }) {
    const renameItemFile = useStore((s) => s.renameItemFile);
    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState('');

    const body = item.body?.trim() ?? '';
    const words = meta ? meta.words : body ? body.split(/\s+/).length : 0;

    const path = meta?.path ?? item.path;
    const stem = (path ?? '').split('/').pop()?.replace(/\.md$/, '') ?? '';

    const commitName = () => {
        const next = nameDraft.trim();
        setEditingName(false);
        // Renaming moves the file and rewrites every inbound link, so it only
        // runs when the name actually changed.
        if (next && next !== stem) void renameItemFile(item.id, next);
    };

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
                {editingName ? (
                    <input
                        autoFocus
                        className="w-full min-w-0 border-b-[1.5px] border-none border-b-accent bg-transparent text-right font-mono text-body text-text outline-none"
                        onBlur={commitName}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commitName();
                            if (e.key === 'Escape') setEditingName(false);
                        }}
                        value={nameDraft}
                    />
                ) : (
                    <span
                        className="min-w-0 cursor-text truncate font-mono select-text"
                        onClick={() => {
                            if (!path) return;
                            setNameDraft(stem);
                            setEditingName(true);
                        }}
                        title={path ? `${path} — click to rename` : undefined}
                    >
                        <ReadOnly>{path ? `${stem}.md` : null}</ReadOnly>
                    </span>
                )}
            </Row>
        </Section>
    );
}
