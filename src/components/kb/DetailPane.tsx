// Right pane: full detail for the selected item — type badge, editable title,
// saved metadata, an (image) preview, the link description, editable body
// (note/task/code), the AI summary, editable tags, and related items.
// Supports star (flag), delete-with-confirmation, edit, and add/remove tags.

import { useEffect, useRef, useState } from 'react';

import type { Subtask } from '../../lib/subtasks';
import type { OpenMode } from '../../store/types';

import { openExternal } from '../../lib/appInfo';
import { useAssetSrc } from '../../lib/assetSrc';
import { cn } from '../../lib/cn';
import { formatRelative, formatSavedDate } from '../../lib/format';
import { joinBody, parseSubtasks, stripSubtasks, toggleSubtask } from '../../lib/subtasks';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import {
    collectionFor,
    detailBodyField,
    detailFlags,
    relatedItems,
    viewTitle,
} from '../../store/views';
import {
    Back,
    Check,
    Close,
    Expand,
    External,
    Globe,
    PanelRight,
    Source,
    StarOutline,
    Trash,
} from '../common/glyphs';
import { Icon } from '../common/Icon';
import { BodyEditor } from '../editor/BodyEditor';
import { DocumentView } from '../editor/DocumentView';
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
    // The AI sections need both the pane toggle and the Capture & AI setting.
    const showSections = useStore((s) => s.prefs.switches.detailSections);
    const blockEditorEnabled = useStore((s) => s.prefs.switches.blockEditor);
    const toggleStar = useStore((s) => s.toggleStar);
    const propertiesOpen = useStore((s) => s.prefs.propertiesOpen);
    const toggleProperties = useStore((s) => s.toggleProperties);
    const rawDefault = useStore((s) => s.prefs.switches.rawMarkdownDefault);
    const deleteItem = useStore((s) => s.deleteItem);
    const refreshSource = useStore((s) => s.refreshSource);
    const updateItem = useStore((s) => s.updateItem);
    const addTag = useStore((s) => s.addTag);
    const removeTag = useStore((s) => s.removeTag);

    // The list row paints everything but the body instantly; `detail` carries the
    // body and lands a tick later, so prefer it once it matches the selection.
    const listItem = items.find((i) => i.id === selectedId) ?? items[0];
    const sel = detail && detail.id === listItem?.id ? detail : listItem;

    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState('');
    const [editingBody, setEditingBody] = useState(false);
    const [bodyDraft, setBodyDraft] = useState('');
    const [addingTag, setAddingTag] = useState(false);
    const [tagDraft, setTagDraft] = useState('');
    const [subtaskDraft, setSubtaskDraft] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [raw, setRaw] = useState(rawDefault);
    const tagInputRef = useRef<HTMLInputElement>(null);
    // Above the `!sel` return: a hook cannot run conditionally.
    const previewSrc = useAssetSrc(sel?.image);

    useEffect(() => {
        setEditingTitle(false);
        setEditingBody(false);
        setAddingTag(false);
        setTagDraft('');
        setSubtaskDraft('');
        setConfirmDelete(false);
        setRaw(rawDefault);
    }, [sel?.id, rawDefault]);

    useEffect(() => {
        if (addingTag) tagInputRef.current?.focus();
    }, [addingTag]);

    // A virtual document checks its origin when it is opened. The engine holds
    // the interval, so this asks every time and is usually answered from the
    // copy already on disk.
    const sourceRaw = sel?.source?.raw;
    useEffect(() => {
        if (sel?.id && sourceRaw) void refreshSource(sel.id);
    }, [sel?.id, sourceRaw, refreshSource]);

    if (!sel) {
        return <div className="flex-1 bg-surface" />;
    }

    const asPage = chrome === 'page';

    const meta = typeMeta(sel.type);
    const coll = collectionFor(sel, collections);
    const related = relatedItems(sel, items);
    const flags = detailFlags(sel, showSections, related.length);
    const linkUrl =
        sel.type === 'link' ? sel.url || (sel.domain ? `https://${sel.domain}` : '') : '';

    // The body is a cached copy of someone else's document until the user takes
    // it over, so nothing here writes to it.
    const virtual = !!sel.source;

    // List rows carry no body, so opening an editor against that stand-in would
    // show an empty note and save it over the real one.
    const bodyLoaded = detail?.id === sel.id;

    const bodyField = detailBodyField(sel);

    // A task's body is prose *plus* a `- [ ]` checklist. The two get separate
    // editors — free text here, checkboxes below — so the prose textarea never
    // shows raw Markdown the checklist UI is already responsible for.
    const isTask = sel.type === 'task';
    const subtasks = isTask ? parseSubtasks(sel.body) : [];
    const prose = isTask ? stripSubtasks(sel.body) : (sel.body ?? '');
    const bodyValue =
        bodyField === 'body'
            ? isTask
                ? prose
                : sel.body
            : bodyField === 'description'
              ? sel.description
              : undefined;

    /** Every checklist edit rewrites the whole body, prose included. */
    const writeSubtasks = (next: readonly Subtask[]) => {
        void updateItem(sel.id, { body: joinBody(prose, next) || undefined });
    };
    const commitSubtask = () => {
        const text = subtaskDraft.trim();
        setSubtaskDraft('');
        if (text) writeSubtasks([...subtasks, { done: false, text }]);
    };

    const commitTitle = () => {
        const next = titleDraft.trim();
        setEditingTitle(false);
        if (next && next !== sel.title) void updateItem(sel.id, { title: next });
    };

    // Code is not prose, and a bookmark's text is a frontmatter scalar.
    const useBlockEditor =
        blockEditorEnabled &&
        bodyLoaded &&
        !virtual &&
        (sel.type === 'note' || sel.type === 'task');

    /** A task's editor holds only the prose; the Subtasks panel owns the rest. */
    const commitBodyMarkdown = (markdown: string) => {
        const body = isTask ? joinBody(markdown, subtasks) : markdown;
        void updateItem(sel.id, { body: body || undefined });
    };

    const startBody = () => {
        setBodyDraft(bodyValue ?? '');
        setEditingBody(true);
    };
    const commitBody = () => {
        setEditingBody(false);
        if (bodyDraft === (bodyValue ?? '')) return;
        if (bodyField === 'body')
            void updateItem(sel.id, {
                body: (isTask ? joinBody(bodyDraft, subtasks) : bodyDraft) || undefined,
            });
        else if (bodyField === 'description') void updateItem(sel.id, { description: bodyDraft });
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
                        className="inline-flex items-center gap-[7px] rounded-7 border-none bg-transparent px-[9px] py-[5px] font-[inherit] text-body font-[560] text-text2"
                        onClick={closeOpenItem}
                        type="button"
                    >
                        {asPage ? <Back /> : <Close size={15} sw={2} />}
                        {asPage ? `Back to ${viewTitle(view, collections)}` : 'Close'}
                    </button>
                    {chrome === 'drawer' && (
                        <button
                            aria-label="Open full screen"
                            className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-7 border-none bg-transparent p-0 text-text3"
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
                                className="inline-flex items-center gap-[6px] rounded-lg border border-border px-[11px] py-[5px] text-body text-text2"
                                onClick={() => void openExternal(linkUrl)}
                            >
                                <External />
                                Open
                            </span>
                        )}
                        {useBlockEditor && (
                            <button
                                aria-pressed={raw}
                                className={cn(
                                    'inline-flex border-none bg-none p-1',
                                    raw ? 'text-accent' : 'text-[#c4c4cc]',
                                )}
                                onClick={() => setRaw((current) => !current)}
                                title={raw ? 'Show the editor' : 'Edit raw Markdown'}
                                type="button"
                            >
                                <Source />
                            </button>
                        )}
                        <button
                            aria-pressed={propertiesOpen}
                            className={cn(
                                'inline-flex border-none bg-none p-1',
                                propertiesOpen ? 'text-accent' : 'text-[#c4c4cc]',
                            )}
                            onClick={toggleProperties}
                            title="Properties (⌘L)"
                            type="button"
                        >
                            <PanelRight />
                        </button>
                        <button
                            className={cn(
                                'inline-flex border-none bg-none p-1',
                                sel.flags.starred ? 'text-accent' : 'text-[#c4c4cc]',
                            )}
                            onClick={() => void toggleStar(sel.id)}
                            title={sel.flags.starred ? 'Unstar' : 'Star'}
                            type="button"
                        >
                            <StarOutline
                                style={sel.flags.starred ? { fill: 'var(--ac)' } : undefined}
                            />
                        </button>
                        <button
                            className="inline-flex border-none bg-none p-1 text-faint"
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
                                    className="rounded-lg px-3 py-[6px] text-body-lg text-text2"
                                    onClick={() => setConfirmDelete(false)}
                                >
                                    Cancel
                                </span>
                                <span
                                    className="rounded-lg bg-[#c0392b] px-[14px] py-[6px] text-body-lg font-semibold text-white"
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
                        className="mt-[14px] mb-0 cursor-text text-[23px] leading-[1.25] font-bold tracking-[-.015em] text-text select-text"
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
                </div>

                {/* where a virtual document comes from, and why it does not edit */}
                {virtual && sel.source && (
                    <div className="mt-5 flex flex-wrap items-center gap-x-[10px] gap-y-2 rounded-11 border border-border bg-surface2 px-[14px] py-[10px] text-body text-text3">
                        <Source size={13} />
                        <span
                            className="rounded-md bg-surface3 px-[7px] py-[2px] text-caption font-semibold tracking-[.03em] text-text3 uppercase"
                            title="Lore keeps this document in step with its origin instead of editing it. Delete the source block from the file to make it your own."
                        >
                            Read-only
                        </span>
                        <span
                            className="truncate text-text2 underline decoration-border underline-offset-2"
                            onClick={() => void openExternal(sel.source!.raw)}
                            title={sel.source.raw}
                        >
                            {sourceLabel(sel.source.raw)}
                        </span>
                        <span className="opacity-50">·</span>
                        <span>Fetched {formatRelative(sel.source.fetched)}</span>
                        <span
                            className="ml-auto rounded-7 px-[9px] py-[4px] text-body-lg text-text2 hover:bg-hover"
                            onClick={() => void refreshSource(sel.id)}
                        >
                            Refresh
                        </span>
                    </div>
                )}

                {/* image preview — only when there is an image */}
                {flags.showPreview && previewSrc && (
                    /* The whole image, never a crop of it. A link preview is
                     * usually a composed 1200×630 card whose text runs to its
                     * edges, and a fixed height cut more of it the wider the pane
                     * got. No width is forced either, so a small preview stays its
                     * own size rather than being blown up to fill the pane. */
                    <div className="mt-5 mb-1 flex justify-center overflow-hidden rounded-[13px] border border-border bg-surface3">
                        <img
                            alt={sel.title}
                            className="block max-h-[420px] max-w-full"
                            draggable={false}
                            src={previewSrc}
                        />
                    </div>
                )}

                {/* body: a virtual document reads, everything else edits */}
                {virtual ? (
                    <DocumentView className="mt-5" markdown={sel.body ?? ''} />
                ) : useBlockEditor ? (
                    <BodyEditor
                        itemId={sel.id}
                        onCommit={commitBodyMarkdown}
                        placeholder="Add content…"
                        raw={raw}
                        value={bodyValue ?? ''}
                    />
                ) : bodyField && editingBody ? (
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
                        className="mt-5 mb-1 cursor-text overflow-auto rounded-11 border border-border bg-surface3 p-4 font-mono text-body-lg leading-[1.7] whitespace-pre text-text2 select-text"
                        onClick={startBody}
                        title="Click to edit"
                    >
                        {sel.body}
                    </pre>
                ) : bodyField === 'body' ? (
                    <p
                        className={cn(
                            'mt-[18px] mb-1 cursor-text text-title-lg leading-[1.65] select-text',
                            bodyValue ? 'text-text2' : 'text-faint',
                        )}
                        onClick={startBody}
                        title="Click to edit"
                    >
                        {bodyValue || 'Add content…'}
                    </p>
                ) : sel.type === 'link' ? (
                    <p
                        className={cn(
                            'mt-[18px] mb-1 cursor-text text-[14.5px] leading-[1.6] select-text',
                            sel.description ? 'text-text2' : 'text-faint',
                        )}
                        onClick={startBody}
                        title="Click to edit"
                    >
                        {sel.description || 'Add a description…'}
                    </p>
                ) : null}

                {/* subtasks — a task's checklist, editable in place */}
                {isTask && (
                    <div className="mt-6">
                        <div className="flex items-center gap-[9px]">
                            <span className={SECTION_LABEL}>Subtasks</span>
                            {subtasks.length > 0 && (
                                <span className="font-mono text-caption text-text3">
                                    {subtasks.filter((t) => t.done).length}/{subtasks.length}
                                </span>
                            )}
                        </div>
                        <div className="mt-[10px] flex flex-col gap-[2px]">
                            {subtasks.map((subtask, index) => (
                                <div
                                    className="group flex items-start gap-[10px] rounded-7 px-2 py-[5px] hover:bg-hover"
                                    key={`${index}-${subtask.text}`}
                                >
                                    <span
                                        className={cn(
                                            'mt-[3px] flex h-[16px] w-[16px] flex-none items-center justify-center rounded-[5px] border',
                                            subtask.done
                                                ? 'border-accent bg-accent text-white'
                                                : 'border-border text-transparent',
                                        )}
                                        onClick={() =>
                                            writeSubtasks(toggleSubtask(subtasks, index))
                                        }
                                    >
                                        <Check size={11} sw={3} />
                                    </span>
                                    <span
                                        className={cn(
                                            'flex-1 text-title leading-[1.5]',
                                            subtask.done ? 'text-text3 line-through' : 'text-text2',
                                        )}
                                        onClick={() =>
                                            writeSubtasks(toggleSubtask(subtasks, index))
                                        }
                                    >
                                        {subtask.text}
                                    </span>
                                    <span
                                        aria-label="Remove subtask"
                                        className="mt-[3px] flex-none text-faint opacity-0 group-hover:opacity-100"
                                        onClick={() =>
                                            writeSubtasks(subtasks.filter((_, j) => j !== index))
                                        }
                                    >
                                        <Close size={13} sw={2} />
                                    </span>
                                </div>
                            ))}
                            <div className="flex items-center gap-[10px] px-2 py-[5px]">
                                <span className="h-[16px] w-[16px] flex-none rounded-[5px] border border-dashed border-dash" />
                                <input
                                    className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-title text-text outline-none placeholder:text-text3"
                                    onBlur={commitSubtask}
                                    onChange={(e) => setSubtaskDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        // Enter adds the subtask and keeps the field
                                        // focused, so a list goes in without reaching
                                        // for the mouse between lines.
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            commitSubtask();
                                        }
                                        if (e.key === 'Escape') setSubtaskDraft('');
                                    }}
                                    placeholder="Add a subtask…"
                                    value={subtaskDraft}
                                />
                            </div>
                        </div>
                    </div>
                )}

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
                                    className="text-body-lg leading-none opacity-55"
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
                                className="rounded-7 border border-dashed border-dash px-[9px] py-[3px] font-mono text-body-sm text-faint"
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

/** `owner/repo · path` — the raw URL itself is noise in a header strip. */
function sourceLabel(raw: string): string {
    const match = /^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/[^/]+\/(.+)$/.exec(
        raw,
    );
    if (!match) return raw;
    return `${match[1]}/${match[2]} · ${decodeURIComponent(match[3])}`;
}
