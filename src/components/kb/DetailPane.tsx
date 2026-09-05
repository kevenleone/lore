// Right pane: full detail for the selected item — type badge, editable title,
// saved metadata, an (image) preview, the link description, editable body
// (note/task/code), the AI summary, editable tags, and related items.
// Supports star (flag), delete-with-confirmation, edit, and add/remove tags.

import { useEffect, useRef, useState } from 'react';

import type { OpenMode } from '../../store/types';

import { cn } from '../../lib/cn';
import { formatSavedDate } from '../../lib/format';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { collectionFor, detailFlags, relatedItems, viewTitle } from '../../store/views';
import { Back, Close, Expand, External, Globe, StarOutline, Trash } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { AiSummaryCard } from './AiSummaryCard';
import { RelatedCards } from './RelatedCards';

/** The pane's own section headings (Tags, Related). */
const SECTION_LABEL = 'text-caption font-[680] tracking-[.06em] text-faint uppercase';

interface DetailPaneProps {
    /**
     * The bar above the body, when the pane was opened from Cards or Table.
     * Passed down rather than read from the store so it survives the drawer's
     * exit animation, which outlives the state that started it.
     */
    chrome?: OpenMode;
}

export function DetailPane({ chrome }: DetailPaneProps) {
    const items = useStore((s) => s.items);
    const collections = useStore((s) => s.collections);
    const view = useStore((s) => s.view);
    const closeOpenItem = useStore((s) => s.closeOpenItem);
    const expandOpenItem = useStore((s) => s.expandOpenItem);
    const selectedId = useStore((s) => s.selectedId);
    const detail = useStore((s) => s.detail);
    const renameItemFile = useStore((s) => s.renameItemFile);
    // The AI sections need both the pane toggle and the Capture & AI setting.
    const aiAssist = useStore((s) => s.aiAssist && s.prefs.switches.autoSum);
    const toggleStar = useStore((s) => s.toggleStar);
    const deleteItem = useStore((s) => s.deleteItem);
    const updateItem = useStore((s) => s.updateItem);
    const addTag = useStore((s) => s.addTag);
    const removeTag = useStore((s) => s.removeTag);

    // The list row paints everything but the body instantly; `detail` carries the
    // body and lands a tick later, so prefer it once it matches the selection.
    const listItem = items.find((i) => i.id === selectedId) ?? items[0];
    const sel = detail && detail.id === listItem?.id ? detail : listItem;

    const [editingTitle, setEditingTitle] = useState(false);
    const [editingFilename, setEditingFilename] = useState(false);
    const [filenameDraft, setFilenameDraft] = useState('');
    const [titleDraft, setTitleDraft] = useState('');
    const [editingBody, setEditingBody] = useState(false);
    const [bodyDraft, setBodyDraft] = useState('');
    const [addingTag, setAddingTag] = useState(false);
    const [tagDraft, setTagDraft] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const tagInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditingTitle(false);
        setEditingBody(false);
        setAddingTag(false);
        setTagDraft('');
        setConfirmDelete(false);
    }, [sel?.id]);

    useEffect(() => {
        if (addingTag) tagInputRef.current?.focus();
    }, [addingTag]);

    if (!sel) {
        return <div className="flex-1 bg-surface" />;
    }

    const asPage = chrome === 'page';

    const meta = typeMeta(sel.type);
    const coll = collectionFor(sel, collections);
    const related = relatedItems(sel, items);
    const flags = detailFlags(sel, aiAssist, related.length);
    const fileStem = (sel.path ?? '').split('/').pop()?.replace(/\.md$/, '') ?? '';
    const linkUrl =
        sel.type === 'link' ? sel.url || (sel.domain ? `https://${sel.domain}` : '') : '';

    // note/task/code edit the item's own content; a link's editable text stays its
    // `description`. Links do get a real `body` in the vault, but exposing an
    // editor for it is a separate change — this keeps today's behaviour exactly.
    const bodyField: 'body' | 'description' | null =
        flags.detIsCode || flags.detIsText ? 'body' : sel.type === 'link' ? 'description' : null;
    const bodyValue =
        bodyField === 'body' ? sel.body : bodyField === 'description' ? sel.description : undefined;

    const commitTitle = () => {
        const next = titleDraft.trim();
        setEditingTitle(false);
        if (next && next !== sel.title) void updateItem(sel.id, { title: next });
    };

    const startBody = () => {
        setBodyDraft(bodyValue ?? '');
        setEditingBody(true);
    };
    const commitBody = () => {
        setEditingBody(false);
        if (bodyDraft === (bodyValue ?? '')) return;
        if (bodyField === 'body') void updateItem(sel.id, { body: bodyDraft });
        else if (bodyField === 'description') void updateItem(sel.id, { description: bodyDraft });
    };

    const commitFilename = () => {
        const next = filenameDraft.trim();
        setEditingFilename(false);
        // Unlike a retitle, this moves the file and rewrites every inbound link,
        // so it only runs when the name actually changed.
        if (next && next !== fileStem) void renameItemFile(sel.id, next);
    };

    const commitTag = () => {
        const next = tagDraft.trim();
        setAddingTag(false);
        setTagDraft('');
        if (next) void addTag(sel.id, next);
    };

    const bodyTextareaClass = (mono: boolean): string =>
        cn(
            'mt-[18px] mb-1 min-h-[120px] w-full resize-y rounded-11 border border-accent p-[14px] outline-none',
            mono
                ? 'bg-surface3 font-mono text-body-lg leading-[1.7] text-text2'
                : 'font-[inherit] text-title-lg leading-[1.65] text-text2',
        );

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {chrome && (
                <div className="flex flex-none items-center gap-2 border-b border-border bg-surface2 px-3 py-[9px]">
                    <button
                        className="inline-flex cursor-pointer items-center gap-[7px] rounded-7 border-none bg-transparent px-[9px] py-[5px] font-[inherit] text-body font-[560] text-text2"
                        onClick={closeOpenItem}
                        type="button"
                    >
                        {asPage ? <Back /> : <Close size={15} sw={2} />}
                        {asPage ? `Back to ${viewTitle(view, collections)}` : 'Close'}
                    </button>
                    {chrome === 'drawer' && (
                        <button
                            aria-label="Open full screen"
                            className="ml-auto inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-7 border-none bg-transparent p-0 text-text3"
                            onClick={expandOpenItem}
                            title="Open full screen"
                            type="button"
                        >
                            <Expand size={15} />
                        </button>
                    )}
                </div>
            )}
            <div
                className={cn(
                    'flex-1 overflow-auto',
                    // A page fills the window, so its column is centred and capped
                    // rather than run out to a 1200px measure.
                    asPage ? 'px-[max(48px,calc((100%-700px)/2))] py-[34px]' : 'px-[34px] py-7',
                )}
            >
                {/* header row */}
                <div className="relative flex items-center gap-3">
                    <span
                        className={cn(
                            'inline-flex items-center gap-[6px] rounded-md px-[9px] py-[3px] text-label font-semibold',
                            meta.chip,
                        )}
                    >
                        <Icon name={sel.type} size={13} /> {meta.label}
                    </span>
                    {sel.domain && (
                        <span className="inline-flex items-center gap-[5px] text-body text-text3">
                            <Globe />
                            {sel.domain}
                        </span>
                    )}
                    <span className="ml-auto flex items-center gap-2">
                        {linkUrl && (
                            <span
                                className="inline-flex cursor-pointer items-center gap-[6px] rounded-lg border border-border px-[11px] py-[5px] text-body text-text2"
                                onClick={() => void openExternal(linkUrl)}
                            >
                                <External />
                                Open
                            </span>
                        )}
                        <button
                            className={cn(
                                'inline-flex cursor-pointer border-none bg-none p-1',
                                sel.flags.starred ? 'text-accent' : 'text-[#c4c4cc]',
                            )}
                            onClick={() => void toggleStar(sel.id)}
                            title={sel.flags.starred ? 'Remove flag' : 'Flag'}
                            type="button"
                        >
                            <StarOutline
                                style={sel.flags.starred ? { fill: 'var(--ac)' } : undefined}
                            />
                        </button>
                        <button
                            className="inline-flex cursor-pointer border-none bg-none p-1 text-faint"
                            onClick={() => setConfirmDelete(true)}
                            title="Delete"
                            type="button"
                        >
                            <Trash />
                        </button>
                    </span>

                    {confirmDelete && (
                        <div className="absolute top-9 right-0 z-30 w-[260px] rounded-xl border border-border bg-surface p-4 shadow-[0_16px_40px_-12px_rgba(24,24,48,.35)]">
                            <div className="text-title font-semibold text-text">
                                Delete this item?
                            </div>
                            <div className="mt-1 text-body text-text3">
                                This removes “{sel.title}” from your knowledge base.
                            </div>
                            <div className="mt-[14px] flex justify-end gap-2">
                                <span
                                    className="cursor-pointer rounded-lg px-3 py-[6px] text-body-lg text-text2"
                                    onClick={() => setConfirmDelete(false)}
                                >
                                    Cancel
                                </span>
                                <span
                                    className="cursor-pointer rounded-lg bg-[#c0392b] px-[14px] py-[6px] text-body-lg font-semibold text-white"
                                    onClick={() => {
                                        setConfirmDelete(false);
                                        void deleteItem(sel.id);
                                    }}
                                >
                                    Delete
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* editable title */}
                {editingTitle ? (
                    <input
                        autoFocus
                        className="mt-[14px] w-full border-b-2 border-none border-b-accent bg-transparent text-[23px] leading-[1.25] font-bold tracking-[-.015em] text-text outline-none"
                        onBlur={commitTitle}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commitTitle();
                            if (e.key === 'Escape') setEditingTitle(false);
                        }}
                        value={titleDraft}
                    />
                ) : (
                    <h1
                        className="mt-[14px] mb-0 cursor-text text-[23px] leading-[1.25] font-bold tracking-[-.015em] text-text"
                        onClick={() => {
                            setTitleDraft(sel.title);
                            setEditingTitle(true);
                        }}
                        title="Click to edit"
                    >
                        {sel.title}
                    </h1>
                )}

                <div className="mt-[9px] flex items-center gap-[7px] text-body text-text3">
                    <span
                        className="h-[9px] w-[9px] rounded-full"
                        // The collection's own colour, which the user picks.
                        style={{ background: coll?.color ?? '#c4c4cc' }}
                    />
                    {coll?.name ?? 'Unfiled'}
                    <span className="opacity-50">·</span>
                    Saved {formatSavedDate(sel.createdAt)}
                    {sel.path && (
                        <>
                            <span className="opacity-50">·</span>
                            {editingFilename ? (
                                <input
                                    autoFocus
                                    className="min-w-[120px] border-b-[1.5px] border-none border-b-accent bg-transparent font-mono text-body-sm text-text outline-none"
                                    onBlur={commitFilename}
                                    onChange={(e) => setFilenameDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitFilename();
                                        if (e.key === 'Escape') setEditingFilename(false);
                                    }}
                                    value={filenameDraft}
                                />
                            ) : (
                                <span
                                    className="cursor-text font-mono text-body-sm"
                                    onClick={() => {
                                        setFilenameDraft(fileStem);
                                        setEditingFilename(true);
                                    }}
                                    title="Click to rename the file. Renaming rewrites links that point here."
                                >
                                    {fileStem}.md
                                </span>
                            )}
                        </>
                    )}
                </div>

                {/* image preview — only when there is an image */}
                {flags.showPreview && sel.image && (
                    <img
                        alt={sel.title}
                        className="mt-5 mb-1 block h-[204px] w-full rounded-[13px] border border-border object-cover"
                        draggable={false}
                        src={sel.image}
                    />
                )}

                {/* body: code / note-task content / link description — editable */}
                {bodyField && editingBody ? (
                    <textarea
                        autoFocus
                        className={bodyTextareaClass(flags.detIsCode)}
                        onBlur={commitBody}
                        onChange={(e) => setBodyDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditingBody(false);
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commitBody();
                        }}
                        placeholder={
                            bodyField === 'description' ? 'Add a description…' : 'Add content…'
                        }
                        value={bodyDraft}
                    />
                ) : flags.detIsCode ? (
                    <pre
                        className="mt-5 mb-1 cursor-text overflow-auto rounded-11 border border-border bg-surface3 p-4 font-mono text-body-lg leading-[1.7] whitespace-pre text-text2"
                        onClick={startBody}
                        title="Click to edit"
                    >
                        {sel.body}
                    </pre>
                ) : flags.detIsText ? (
                    <p
                        className="mt-[18px] mb-1 cursor-text text-title-lg leading-[1.65] text-text2"
                        onClick={startBody}
                        title="Click to edit"
                    >
                        {sel.body}
                    </p>
                ) : sel.type === 'link' ? (
                    <p
                        className={cn(
                            'mt-[18px] mb-1 cursor-text text-[14.5px] leading-[1.6]',
                            sel.description ? 'text-text2' : 'text-faint',
                        )}
                        onClick={startBody}
                        title="Click to edit"
                    >
                        {sel.description || 'Add a description…'}
                    </p>
                ) : null}

                {flags.showSummary && sel.summary && (
                    <AiSummaryCard
                        points={sel.points ?? []}
                        showPoints={flags.showPoints}
                        summary={sel.summary}
                    />
                )}

                {/* tags */}
                <div className="mt-5">
                    <div className={cn(SECTION_LABEL, 'mb-[9px]')}>Tags</div>
                    <div className="flex flex-wrap items-center gap-[7px]">
                        {sel.tags.map((tag) => (
                            <span
                                className="inline-flex items-center gap-[5px] rounded-7 bg-accent-tint px-[9px] py-1 font-mono text-body-sm text-accent"
                                key={tag}
                            >
                                #{tag}
                                <span
                                    className="cursor-pointer text-body-lg leading-none opacity-55"
                                    onClick={() => void removeTag(sel.id, tag)}
                                    title="Remove tag"
                                >
                                    ×
                                </span>
                            </span>
                        ))}
                        {addingTag ? (
                            <input
                                className="w-20 rounded-7 border border-accent bg-transparent px-2 py-[3px] font-mono text-body-sm text-accent outline-none"
                                onBlur={commitTag}
                                onChange={(e) => setTagDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitTag();
                                    if (e.key === 'Escape') {
                                        setAddingTag(false);
                                        setTagDraft('');
                                    }
                                }}
                                placeholder="tag"
                                ref={tagInputRef}
                                value={tagDraft}
                            />
                        ) : (
                            <span
                                className="cursor-pointer rounded-7 border border-dashed border-dash px-[9px] py-[3px] font-mono text-body-sm text-faint"
                                onClick={() => setAddingTag(true)}
                            >
                                + add
                            </span>
                        )}
                    </div>
                </div>

                {flags.showRelated && <RelatedCards related={related} />}
            </div>
        </div>
    );
}

async function openExternal(url: string) {
    try {
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(url);
    } catch {
        window.open(url, '_blank');
    }
}
