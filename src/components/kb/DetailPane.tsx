// Right pane: full detail for the selected item — type badge, editable title,
// saved metadata, an (image) preview, the link description, editable body
// (note/task/code), the AI summary, editable tags, and related items.
// Supports star (flag), delete-with-confirmation, edit, and add/remove tags.

import { useEffect, useRef, useState } from 'react';

import { formatSavedDate } from '../../lib/format';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { collectionFor, detailFlags, relatedItems, viewTitle } from '../../store/views';
import { Back, Close, External, Globe, StarOutline, Trash } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { AiSummaryCard } from './AiSummaryCard';
import { RelatedCards } from './RelatedCards';

const AC = 'var(--ac, #5b5bd6)';

export function DetailPane() {
    const items = useStore((s) => s.items);
    const collections = useStore((s) => s.collections);
    const view = useStore((s) => s.view);
    // Set only by Cards and Table; List shows the pane permanently and has
    // nothing to close.
    const openId = useStore((s) => s.openId);
    const openMode = useStore((s) => s.prefs.openMode);
    const closeOpenItem = useStore((s) => s.closeOpenItem);
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
        return <div style={{ background: 'var(--surface, #fff)', flex: 1 }} />;
    }

    const opened = openId !== null;
    const asPage = opened && openMode === 'page';

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

    const bodyTextareaStyle = (mono: boolean): React.CSSProperties => ({
        border: `1px solid ${AC}`,
        borderRadius: 11,
        margin: '18px 0 4px',
        minHeight: 120,
        outline: 'none',
        padding: 14,
        resize: 'vertical',
        width: '100%',
        ...(mono
            ? {
                  background: 'var(--surface3, #f1f1f3)',
                  color: 'var(--text2, #6b6b76)',
                  fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
                  fontSize: 13,
                  lineHeight: 1.7,
              }
            : { color: 'var(--text2, #6b6b76)', font: 'inherit', fontSize: 15, lineHeight: 1.65 }),
    });

    return (
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            {opened && (
                <div
                    style={{
                        alignItems: 'center',
                        background: 'var(--surface2, #fafafa)',
                        borderBottom: '1px solid var(--border, #ececef)',
                        display: 'flex',
                        flex: 'none',
                        gap: 8,
                        padding: '9px 12px',
                    }}
                >
                    <button
                        onClick={closeOpenItem}
                        style={{
                            alignItems: 'center',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 7,
                            color: 'var(--text2, #6b6b76)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            fontFamily: 'inherit',
                            fontSize: 12.5,
                            fontWeight: 560,
                            gap: 7,
                            padding: '5px 9px',
                        }}
                        type="button"
                    >
                        {asPage ? <Back /> : <Close size={15} sw={2} />}
                        {asPage ? `Back to ${viewTitle(view, collections)}` : 'Close'}
                    </button>
                </div>
            )}
            <div
                style={{
                    flex: 1,
                    overflow: 'auto',
                    // A page fills the window, so its column is centred and capped
                    // rather than run out to a 1200px measure.
                    padding: asPage ? '34px max(48px, calc((100% - 700px) / 2))' : '28px 34px',
                }}
            >
                {/* header row */}
                <div
                    style={{ alignItems: 'center', display: 'flex', gap: 12, position: 'relative' }}
                >
                    <span
                        style={{
                            alignItems: 'center',
                            background: meta.bg,
                            borderRadius: 6,
                            color: meta.fg,
                            display: 'inline-flex',
                            fontSize: 11.5,
                            fontWeight: 600,
                            gap: 6,
                            padding: '3px 9px',
                        }}
                    >
                        <Icon name={sel.type} size={13} /> {meta.label}
                    </span>
                    {sel.domain && (
                        <span
                            style={{
                                alignItems: 'center',
                                color: 'var(--text3, #9a9aa5)',
                                display: 'inline-flex',
                                fontSize: 12.5,
                                gap: 5,
                            }}
                        >
                            <Globe />
                            {sel.domain}
                        </span>
                    )}
                    <span
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            gap: 8,
                            marginLeft: 'auto',
                        }}
                    >
                        {linkUrl && (
                            <span
                                onClick={() => void openExternal(linkUrl)}
                                style={{
                                    alignItems: 'center',
                                    border: '1px solid var(--border, #e4e4ea)',
                                    borderRadius: 8,
                                    color: 'var(--text2, #6b6b76)',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    fontSize: 12.5,
                                    gap: 6,
                                    padding: '5px 11px',
                                }}
                            >
                                <External />
                                Open
                            </span>
                        )}
                        <button
                            onClick={() => void toggleStar(sel.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: sel.flags.starred ? AC : '#c4c4cc',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                padding: 4,
                            }}
                            title={sel.flags.starred ? 'Remove flag' : 'Flag'}
                            type="button"
                        >
                            <StarOutline style={sel.flags.starred ? { fill: AC } : undefined} />
                        </button>
                        <button
                            onClick={() => setConfirmDelete(true)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--faint, #a8a8b0)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                padding: 4,
                            }}
                            title="Delete"
                            type="button"
                        >
                            <Trash />
                        </button>
                    </span>

                    {confirmDelete && (
                        <div
                            style={{
                                background: 'var(--surface, #fff)',
                                border: '1px solid var(--border, #ececef)',
                                borderRadius: 12,
                                boxShadow: '0 16px 40px -12px rgba(24,24,48,.35)',
                                padding: 16,
                                position: 'absolute',
                                right: 0,
                                top: 36,
                                width: 260,
                                zIndex: 30,
                            }}
                        >
                            <div
                                style={{
                                    color: 'var(--text, #1a1a1f)',
                                    fontSize: 14,
                                    fontWeight: 600,
                                }}
                            >
                                Delete this item?
                            </div>
                            <div
                                style={{
                                    color: 'var(--text3, #9a9aa5)',
                                    fontSize: 12.5,
                                    marginTop: 4,
                                }}
                            >
                                This removes “{sel.title}” from your knowledge base.
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 8,
                                    justifyContent: 'flex-end',
                                    marginTop: 14,
                                }}
                            >
                                <span
                                    onClick={() => setConfirmDelete(false)}
                                    style={{
                                        borderRadius: 8,
                                        color: 'var(--text2, #6b6b76)',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        padding: '6px 12px',
                                    }}
                                >
                                    Cancel
                                </span>
                                <span
                                    onClick={() => {
                                        setConfirmDelete(false);
                                        void deleteItem(sel.id);
                                    }}
                                    style={{
                                        background: '#c0392b',
                                        borderRadius: 8,
                                        color: '#fff',
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        padding: '6px 14px',
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
                        onBlur={commitTitle}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') commitTitle();
                            if (e.key === 'Escape') setEditingTitle(false);
                        }}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${AC}`,
                            color: 'var(--text, #1a1a1f)',
                            font: 'inherit',
                            fontFamily: 'inherit',
                            fontSize: 23,
                            fontWeight: 700,
                            letterSpacing: '-.015em',
                            lineHeight: 1.25,
                            margin: '14px 0 0',
                            outline: 'none',
                            width: '100%',
                        }}
                        value={titleDraft}
                    />
                ) : (
                    <h1
                        onClick={() => {
                            setTitleDraft(sel.title);
                            setEditingTitle(true);
                        }}
                        style={{
                            color: 'var(--text, #1a1a1f)',
                            cursor: 'text',
                            fontSize: 23,
                            fontWeight: 700,
                            letterSpacing: '-.015em',
                            lineHeight: 1.25,
                            margin: '14px 0 0',
                        }}
                        title="Click to edit"
                    >
                        {sel.title}
                    </h1>
                )}

                <div
                    style={{
                        alignItems: 'center',
                        color: 'var(--text3, #9a9aa5)',
                        display: 'flex',
                        fontSize: 12.5,
                        gap: 7,
                        marginTop: 9,
                    }}
                >
                    <span
                        style={{
                            background: coll?.color ?? '#c4c4cc',
                            borderRadius: '50%',
                            height: 9,
                            width: 9,
                        }}
                    />
                    {coll?.name ?? 'Unfiled'}
                    <span style={{ opacity: 0.5 }}>·</span>
                    Saved {formatSavedDate(sel.createdAt)}
                    {sel.path && (
                        <>
                            <span style={{ opacity: 0.5 }}>·</span>
                            {editingFilename ? (
                                <input
                                    autoFocus
                                    onBlur={commitFilename}
                                    onChange={(e) => setFilenameDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitFilename();
                                        if (e.key === 'Escape') setEditingFilename(false);
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: `1.5px solid ${AC}`,
                                        color: 'var(--text, #1a1a1f)',
                                        font: 'inherit',
                                        fontFamily: 'ui-monospace,Menlo,monospace',
                                        fontSize: 12,
                                        minWidth: 120,
                                        outline: 'none',
                                    }}
                                    value={filenameDraft}
                                />
                            ) : (
                                <span
                                    onClick={() => {
                                        setFilenameDraft(fileStem);
                                        setEditingFilename(true);
                                    }}
                                    style={{
                                        cursor: 'text',
                                        fontFamily: 'ui-monospace,Menlo,monospace',
                                        fontSize: 12,
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
                        src={sel.image}
                        style={{
                            border: '1px solid var(--border, #ececef)',
                            borderRadius: 13,
                            display: 'block',
                            height: 204,
                            margin: '20px 0 4px',
                            objectFit: 'cover',
                            width: '100%',
                        }}
                    />
                )}

                {/* body: code / note-task content / link description — editable */}
                {bodyField && editingBody ? (
                    <textarea
                        autoFocus
                        onBlur={commitBody}
                        onChange={(e) => setBodyDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditingBody(false);
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commitBody();
                        }}
                        placeholder={
                            bodyField === 'description' ? 'Add a description…' : 'Add content…'
                        }
                        style={bodyTextareaStyle(flags.detIsCode)}
                        value={bodyDraft}
                    />
                ) : flags.detIsCode ? (
                    <pre
                        onClick={startBody}
                        style={{
                            background: 'var(--surface3, #f1f1f3)',
                            border: '1px solid var(--border, #ececef)',
                            borderRadius: 11,
                            color: 'var(--text2, #6b6b76)',
                            cursor: 'text',
                            fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
                            fontSize: 13,
                            lineHeight: 1.7,
                            margin: '20px 0 4px',
                            overflow: 'auto',
                            padding: 16,
                            whiteSpace: 'pre',
                        }}
                        title="Click to edit"
                    >
                        {sel.body}
                    </pre>
                ) : flags.detIsText ? (
                    <p
                        onClick={startBody}
                        style={{
                            color: 'var(--text2, #6b6b76)',
                            cursor: 'text',
                            fontSize: 15,
                            lineHeight: 1.65,
                            margin: '18px 0 4px',
                        }}
                        title="Click to edit"
                    >
                        {sel.body}
                    </p>
                ) : sel.type === 'link' ? (
                    <p
                        onClick={startBody}
                        style={{
                            color: sel.description
                                ? 'var(--text2, #3b3b44)'
                                : 'var(--faint, #b3b3bd)',
                            cursor: 'text',
                            fontSize: 14.5,
                            lineHeight: 1.6,
                            margin: '18px 0 4px',
                        }}
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
                <div style={{ marginTop: 20 }}>
                    <div
                        style={{
                            color: 'var(--faint, #a8a8b0)',
                            fontSize: 11,
                            fontWeight: 680,
                            letterSpacing: '.06em',
                            marginBottom: 9,
                            textTransform: 'uppercase',
                        }}
                    >
                        Tags
                    </div>
                    <div
                        style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 7 }}
                    >
                        {sel.tags.map((tag) => (
                            <span
                                key={tag}
                                style={{
                                    alignItems: 'center',
                                    background: 'var(--ac-tint, #eeeef2)',
                                    borderRadius: 7,
                                    color: AC,
                                    display: 'inline-flex',
                                    fontFamily: 'ui-monospace,Menlo,monospace',
                                    fontSize: 12,
                                    gap: 5,
                                    padding: '4px 9px',
                                }}
                            >
                                #{tag}
                                <span
                                    onClick={() => void removeTag(sel.id, tag)}
                                    style={{
                                        cursor: 'pointer',
                                        fontSize: 13,
                                        lineHeight: 1,
                                        opacity: 0.55,
                                    }}
                                    title="Remove tag"
                                >
                                    ×
                                </span>
                            </span>
                        ))}
                        {addingTag ? (
                            <input
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
                                style={{
                                    background: 'transparent',
                                    border: `1px solid ${AC}`,
                                    borderRadius: 7,
                                    color: AC,
                                    fontFamily: 'ui-monospace,Menlo,monospace',
                                    fontSize: 12,
                                    outline: 'none',
                                    padding: '3px 8px',
                                    width: 80,
                                }}
                                value={tagDraft}
                            />
                        ) : (
                            <span
                                onClick={() => setAddingTag(true)}
                                style={{
                                    border: '1px dashed var(--dash, #d2d2dc)',
                                    borderRadius: 7,
                                    color: 'var(--faint, #a8a8b0)',
                                    cursor: 'pointer',
                                    fontFamily: 'ui-monospace,Menlo,monospace',
                                    fontSize: 12,
                                    padding: '3px 9px',
                                }}
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
