// Direction B — Composer. Pick a type, add structured content, accept/dismiss
// AI tag suggestions, choose a collection, then save.
//
// The same form serves both capture surfaces: the floating quick-capture window
// (`panel`) and the in-window capture drawer (`drawer`). Only the frame around
// it differs — the panel is a card that sizes to its content, the drawer fills
// the height it is given and scrolls between fixed tabs and footer.

import { useEffect, useMemo, useRef, useState } from 'react';

import type { NewItem } from '../../data/repository';
import type { Collection, ItemType } from '../../store/types';

import { getRepository } from '../../data';
import { hideCapture, hostOf, saveCapture } from '../../lib/captureActions';
import { fetchLinkMetadata, type LinkMetadata } from '../../lib/linkMetadata';
import { Check, ChevronDown, FileGlyph, Globe } from '../common/glyphs';
import { Icon } from '../common/Icon';

export type CaptureChrome = 'drawer' | 'panel';

export interface ComposerProps {
    chrome?: CaptureChrome;
    /**
     * Whether the surface has stopped moving and may take focus.
     *
     * The drawer withholds it for the length of its slide. Focusing a field
     * while the panel is still a full width off the right edge makes the engine
     * bring it into view the only way it can — by dragging everything else
     * sideways by exactly that width, which is what the whole window appears to
     * do until the slide lands. The floating panel does not move, so it passes
     * nothing and focuses at once.
     */
    focusReady?: boolean;
    /** Dismisses the surface. Defaults to hiding the quick-capture window. */
    onCancel?: () => void;
    /** Persists the item. Defaults to the window's save-and-dismiss. */
    onSave?: (input: NewItem) => Promise<void>;
}

const AC = 'var(--ac, #5b5bd6)';

const TABS: { label: string; type: ItemType }[] = [
    { label: 'Link', type: 'link' },
    { label: 'Note', type: 'note' },
    { label: 'Task', type: 'task' },
    { label: 'Code', type: 'code' },
    { label: 'Image', type: 'image' },
];

const SECTION_LABEL: React.CSSProperties = {
    color: 'var(--faint, #a8a8b0)',
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: '.05em',
    textTransform: 'uppercase',
};

export function Composer({
    chrome = 'panel',
    focusReady = true,
    onCancel = hideCapture,
    onSave,
}: ComposerProps) {
    const inDrawer = chrome === 'drawer';
    const [tab, setTab] = useState<ItemType>('link');
    const [value, setValue] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [addingTag, setAddingTag] = useState(false);
    const [tagDraft, setTagDraft] = useState('');
    const [collections, setCollections] = useState<Collection[]>([]);
    const [collectionId, setCollectionId] = useState<string>('design');
    const [collOpen, setCollOpen] = useState(false);
    const [error, setError] = useState<null | string>(null);
    const [meta, setMeta] = useState<LinkMetadata | null>(null);
    const [fetching, setFetching] = useState(false);

    // Fetch link metadata as the URL settles (link tab only).
    useEffect(() => {
        if (tab !== 'link' || !value.trim()) {
            setMeta(null);
            return;
        }
        let cancelled = false;
        const id = setTimeout(async () => {
            setFetching(true);
            try {
                const m = await fetchLinkMetadata(value);
                if (!cancelled) setMeta(m);
            } catch {
                if (!cancelled) setMeta(null);
            } finally {
                if (!cancelled) setFetching(false);
            }
        }, 450);
        return () => {
            cancelled = true;
            clearTimeout(id);
        };
    }, [value, tab]);

    useEffect(() => {
        void getRepository()
            .listCollections()
            .then((c) => {
                setCollections(c);
                if (c.length && !c.find((x) => x.id === collectionId)) setCollectionId(c[0].id);
            });
    }, []);

    const addTag = (raw: string) => {
        const t = raw.trim().replace(/^#/, '').toLowerCase();
        setTagDraft('');
        setAddingTag(false);
        if (t && !tags.includes(t)) setTags((a) => [...a, t]);
    };
    const removeTag = (t: string) => setTags((a) => a.filter((x) => x !== t));

    const activeCollection = collections.find((c) => c.id === collectionId) ?? null;
    const collRef = useRef<HTMLDivElement>(null);
    const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    // One ref for all five tabs: each renders its own field, so only ever one of
    // them is mounted, and a plain assignment lets it be typed for both.
    const setFieldRef = (el: HTMLInputElement | HTMLTextAreaElement | null) => {
        fieldRef.current = el;
    };

    // The tab's own field takes focus — on open once the surface is settled, and
    // again whenever a different tab swaps a new field in. `preventScroll` is
    // belt to `focusReady`'s braces: nothing should need scrolling to by then.
    useEffect(() => {
        if (focusReady) fieldRef.current?.focus({ preventScroll: true });
    }, [focusReady, tab]);

    // Close the collection dropdown when clicking elsewhere.
    useEffect(() => {
        if (!collOpen) return;
        const onDown = (e: MouseEvent) => {
            if (collRef.current && !collRef.current.contains(e.target as Node)) setCollOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        return () => window.removeEventListener('mousedown', onDown);
    }, [collOpen]);

    const canSave = useMemo(() => tab === 'image' || value.trim().length > 0, [tab, value]);

    const save = async () => {
        if (!canSave) return;
        try {
            setError(null);
            await doSave();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    // The footer promises ⏎, so the single-line fields honour it. The note and
    // code textareas keep Enter for newlines.
    const onFieldKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        void save();
    };

    const doSave = async () => {
        const text = value.trim();
        let item: NewItem = {
            collectionId,
            flags: { inbox: true },
            related: [],
            tags: [...tags],
            title: text,
            type: tab,
        };
        if (tab === 'link') {
            const host = hostOf(text);
            item = {
                ...item,
                description: meta?.description,
                domain: host || undefined,
                image: meta?.image,
                title: meta?.title || host || text,
                url: text,
            };
        } else if (tab === 'image') {
            item = { ...item, title: text || 'Untitled image' };
        } else {
            item = { ...item, body: text, title: text.split('\n')[0].slice(0, 80) };
        }
        await (onSave ? onSave(item) : saveCapture(item));
    };

    return (
        <div
            style={{
                background: 'var(--surface, #fff)',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
                ...(inDrawer
                    ? { height: '100%' }
                    : {
                          border: '1px solid var(--border, #ececef)',
                          borderRadius: 16,
                          boxShadow: 'var(--float-shadow)',
                      }),
            }}
        >
            {/* type tabs */}
            <div
                style={{
                    borderBottom: '1px solid var(--border-soft, #f0f0f2)',
                    display: 'flex',
                    flex: 'none',
                    gap: 5,
                    overflow: 'hidden',
                    padding: '9px 11px',
                }}
            >
                {TABS.map((t) => {
                    const active = tab === t.type;
                    return (
                        <div
                            key={t.type}
                            onClick={() => setTab(t.type)}
                            style={{
                                alignItems: 'center',
                                borderRadius: 8,
                                cursor: 'pointer',
                                display: 'flex',
                                fontSize: 13,
                                gap: 6,
                                padding: '7px 11px',
                                whiteSpace: 'nowrap',
                                ...(active
                                    ? {
                                          background: 'var(--ac-tint, #eeeef2)',
                                          color: AC,
                                          fontWeight: 590,
                                      }
                                    : { color: 'var(--text2, #6b6b76)' }),
                            }}
                        >
                            <Icon name={t.type} size={15} />
                            <span>{t.label}</span>
                        </div>
                    );
                })}
            </div>

            <div
                style={{
                    flex: inDrawer ? 1 : 'none',
                    minHeight: 0,
                    overflowY: inDrawer ? 'auto' : 'visible',
                    padding: '15px 16px',
                }}
            >
                {/* per-type content */}
                {tab === 'link' && (
                    <>
                        <div
                            style={{
                                alignItems: 'center',
                                border: '1px solid var(--border, #e4e4ea)',
                                borderRadius: 10,
                                color: 'var(--text, #1a1a1f)',
                                display: 'flex',
                                fontSize: 14,
                                gap: 9,
                                padding: '10px 12px',
                            }}
                        >
                            <span
                                style={{
                                    color: 'var(--faint, #a8a8b0)',
                                    display: 'flex',
                                    flex: 'none',
                                }}
                            >
                                <Globe size={16} />
                            </span>
                            <input
                                onChange={(e) => setValue(e.target.value)}
                                onKeyDown={onFieldKeyDown}
                                placeholder="https://…"
                                ref={setFieldRef}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text, #1a1a1f)',
                                    flex: 1,
                                    font: 'inherit',
                                    minWidth: 0,
                                    outline: 'none',
                                }}
                                value={value}
                            />
                            {fetching && (
                                <span
                                    style={{
                                        color: 'var(--text3, #9a9aa5)',
                                        flex: 'none',
                                        fontSize: 11,
                                    }}
                                >
                                    fetching…
                                </span>
                            )}
                            {!fetching && meta && (
                                <span
                                    style={{
                                        alignItems: 'center',
                                        background: '#e8f2ec',
                                        borderRadius: 6,
                                        color: '#4d855f',
                                        display: 'inline-flex',
                                        flex: 'none',
                                        fontSize: 11,
                                        gap: 4,
                                        padding: '2px 7px',
                                    }}
                                >
                                    <Check size={12} sw={2.4} />
                                    fetched
                                </span>
                            )}
                        </div>
                        {meta && (
                            <div
                                style={{
                                    border: '1px solid var(--border, #ececef)',
                                    borderRadius: 12,
                                    marginTop: 12,
                                    overflow: 'hidden',
                                }}
                            >
                                {meta.image && (
                                    <img
                                        alt=""
                                        draggable={false}
                                        src={meta.image}
                                        style={{
                                            display: 'block',
                                            height: 118,
                                            objectFit: 'cover',
                                            width: '100%',
                                        }}
                                    />
                                )}
                                <div style={{ padding: '12px 14px' }}>
                                    <div style={{ fontSize: 14.5, fontWeight: 620 }}>
                                        {meta.title || hostOf(value)}
                                    </div>
                                    <div
                                        style={{
                                            alignItems: 'center',
                                            color: 'var(--text3, #9a9aa5)',
                                            display: 'flex',
                                            fontSize: 12.5,
                                            gap: 5,
                                            marginTop: 3,
                                        }}
                                    >
                                        <Globe size={12} />
                                        {hostOf(value)}
                                    </div>
                                    {meta.description && (
                                        <div
                                            style={{
                                                color: 'var(--text2, #6b6b76)',
                                                display: '-webkit-box',
                                                fontSize: 13,
                                                lineHeight: 1.55,
                                                marginTop: 10,
                                                overflow: 'hidden',
                                                WebkitBoxOrient: 'vertical',
                                                WebkitLineClamp: 3,
                                            }}
                                        >
                                            {meta.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
                {tab === 'note' && (
                    <textarea
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Write a note…"
                        ref={setFieldRef}
                        style={{
                            border: '1px solid var(--border, #e4e4ea)',
                            borderRadius: 12,
                            color: 'var(--text, #1a1a1f)',
                            font: 'inherit',
                            fontSize: 14.5,
                            lineHeight: 1.6,
                            minHeight: 150,
                            outline: 'none',
                            padding: '13px 14px',
                            resize: 'vertical',
                            width: '100%',
                        }}
                        value={value}
                    />
                )}
                {tab === 'task' && (
                    <div
                        style={{
                            alignItems: 'flex-start',
                            border: '1px solid var(--border, #e4e4ea)',
                            borderRadius: 12,
                            display: 'flex',
                            gap: 11,
                            padding: 14,
                        }}
                    >
                        <span
                            style={{
                                border: '2px solid var(--border, #e4e4ea)',
                                borderRadius: 6,
                                flex: 'none',
                                height: 20,
                                marginTop: 1,
                                width: 20,
                            }}
                        />
                        <input
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={onFieldKeyDown}
                            placeholder="What needs doing?"
                            ref={setFieldRef}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text, #1a1a1f)',
                                flex: 1,
                                font: 'inherit',
                                fontSize: 15,
                                outline: 'none',
                            }}
                            value={value}
                        />
                    </div>
                )}
                {tab === 'code' && (
                    <textarea
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Paste a snippet…"
                        ref={setFieldRef}
                        style={{
                            background: 'var(--surface2, #fafafa)',
                            border: '1px solid var(--border, #e4e4ea)',
                            borderRadius: 12,
                            color: 'var(--text2, #6b6b76)',
                            fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
                            fontSize: 12.5,
                            lineHeight: 1.7,
                            minHeight: 150,
                            outline: 'none',
                            padding: 14,
                            resize: 'vertical',
                            width: '100%',
                        }}
                        value={value}
                    />
                )}
                {tab === 'image' && (
                    <div
                        style={{
                            alignItems: 'center',
                            border: '1.5px dashed var(--dash, #d2d2dc)',
                            borderRadius: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 9,
                            padding: 34,
                            textAlign: 'center',
                        }}
                    >
                        <span
                            style={{
                                alignItems: 'center',
                                background: '#f7ecef',
                                borderRadius: 11,
                                color: '#a86b7c',
                                display: 'flex',
                                height: 44,
                                justifyContent: 'center',
                                width: 44,
                            }}
                        >
                            <FileGlyph />
                        </span>
                        <div
                            style={{
                                color: 'var(--text2, #6b6b76)',
                                fontSize: 14,
                                fontWeight: 560,
                            }}
                        >
                            Drag files &amp; images here
                        </div>
                        <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12.5 }}>
                            or click to browse — PNG, PDF, screenshots
                        </div>
                        <input
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={onFieldKeyDown}
                            placeholder="Title (optional)"
                            style={{
                                border: '1px solid var(--border, #ececef)',
                                borderRadius: 8,
                                font: 'inherit',
                                fontSize: 13,
                                marginTop: 8,
                                outline: 'none',
                                padding: '6px 10px',
                                textAlign: 'center',
                                width: '70%',
                            }}
                            value={value}
                        />
                    </div>
                )}

                {/* tags */}
                <div
                    style={{
                        alignItems: 'center',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 7,
                        marginTop: 14,
                    }}
                >
                    <span style={SECTION_LABEL}>Tags</span>
                    {tags.map((t) => (
                        <span
                            key={t}
                            onClick={() => removeTag(t)}
                            style={{
                                alignItems: 'center',
                                background: 'var(--ac-tint, #eeeef2)',
                                borderRadius: 6,
                                color: AC,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                fontFamily: 'ui-monospace,Menlo,monospace',
                                fontSize: 11,
                                gap: 5,
                                padding: '3px 8px',
                            }}
                        >
                            #{t}
                            <span style={{ opacity: 0.55 }}>×</span>
                        </span>
                    ))}
                    {addingTag ? (
                        <input
                            autoFocus
                            onBlur={() => addTag(tagDraft)}
                            onChange={(e) => setTagDraft(e.target.value)}
                            onKeyDown={(e) => {
                                // Both keys mean "the tag", not "the capture" —
                                // the window listener must not also close the
                                // surface out from under it.
                                if (e.key === 'Enter') {
                                    e.stopPropagation();
                                    addTag(tagDraft);
                                }
                                if (e.key === 'Escape') {
                                    e.stopPropagation();
                                    setAddingTag(false);
                                    setTagDraft('');
                                }
                            }}
                            placeholder="tag"
                            style={{
                                background: 'transparent',
                                border: `1px solid ${AC}`,
                                borderRadius: 6,
                                color: AC,
                                fontFamily: 'ui-monospace,Menlo,monospace',
                                fontSize: 11,
                                outline: 'none',
                                padding: '2px 7px',
                                width: 70,
                            }}
                            value={tagDraft}
                        />
                    ) : (
                        <span
                            onClick={() => setAddingTag(true)}
                            style={{
                                alignItems: 'center',
                                background: 'transparent',
                                border: '1px dashed var(--dash, #d2d2dc)',
                                borderRadius: 6,
                                color: 'var(--text3, #9a9aa5)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                fontFamily: 'ui-monospace,Menlo,monospace',
                                fontSize: 11,
                                gap: 4,
                                padding: '2px 7px',
                            }}
                        >
                            + tag
                        </span>
                    )}
                </div>

                {/* collection — custom dropdown (a native <select> would steal focus and
            dismiss the capture window) */}
                <div style={{ alignItems: 'center', display: 'flex', gap: 8, marginTop: 11 }}>
                    <span style={SECTION_LABEL}>Collection</span>
                    <div ref={collRef} style={{ position: 'relative' }}>
                        <span
                            onClick={() => setCollOpen((o) => !o)}
                            style={{
                                alignItems: 'center',
                                background: 'var(--sel, #f4f4f6)',
                                borderRadius: 8,
                                color: 'var(--text2, #6b6b76)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                fontSize: 13,
                                gap: 7,
                                padding: '5px 10px',
                            }}
                        >
                            <span
                                style={{
                                    background: activeCollection?.color ?? '#c4c4cc',
                                    borderRadius: '50%',
                                    height: 9,
                                    width: 9,
                                }}
                            />
                            {activeCollection?.name ?? 'Unfiled'}
                            <span style={{ color: 'var(--faint, #a8a8b0)', display: 'flex' }}>
                                <ChevronDown />
                            </span>
                        </span>
                        {collOpen && (
                            <div
                                style={{
                                    background: 'var(--surface, #fff)',
                                    border: '1px solid var(--border, #ececef)',
                                    borderRadius: 10,
                                    boxShadow: '0 14px 34px -10px rgba(24,24,48,.32)',
                                    left: 0,
                                    maxHeight: 220,
                                    minWidth: 180,
                                    overflow: 'auto',
                                    padding: 5,
                                    position: 'absolute',
                                    top: 32,
                                    zIndex: 30,
                                }}
                            >
                                {collections.length === 0 && (
                                    <div
                                        style={{
                                            color: 'var(--text3, #9a9aa5)',
                                            fontSize: 12.5,
                                            padding: '7px 10px',
                                        }}
                                    >
                                        No collections yet
                                    </div>
                                )}
                                {collections.map((c) => (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            setCollectionId(c.id);
                                            setCollOpen(false);
                                        }}
                                        style={{
                                            alignItems: 'center',
                                            background:
                                                c.id === collectionId ? '#f0f0fb' : 'transparent',
                                            borderRadius: 7,
                                            color: c.id === collectionId ? AC : '#3b3b44',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            fontSize: 13,
                                            fontWeight: c.id === collectionId ? 600 : 400,
                                            gap: 8,
                                            padding: '7px 10px',
                                        }}
                                    >
                                        <span
                                            style={{
                                                background: c.color,
                                                borderRadius: '50%',
                                                flex: 'none',
                                                height: 9,
                                                width: 9,
                                            }}
                                        />
                                        {c.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* footer */}
            <div
                style={{
                    alignItems: 'center',
                    background: 'var(--surface2, #fafafa)',
                    borderTop: '1px solid var(--border-soft, #f0f0f2)',
                    display: 'flex',
                    flex: 'none',
                    justifyContent: 'space-between',
                    padding: '11px 16px',
                }}
            >
                <span style={{ color: error ? '#c0392b' : '#9a9aa5', fontSize: 12 }}>
                    {error ??
                        (inDrawer
                            ? 'esc to close · drag files to attach'
                            : '⌥Space to toggle · drag files to attach')}
                </span>
                <span style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                    <span
                        onClick={onCancel}
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
                        onClick={() => void save()}
                        style={{
                            alignItems: 'center',
                            background: AC,
                            borderRadius: 8,
                            color: '#fff',
                            cursor: canSave ? 'pointer' : 'default',
                            display: 'inline-flex',
                            fontSize: 13,
                            fontWeight: 600,
                            gap: 7,
                            opacity: canSave ? 1 : 0.55,
                            padding: '7px 14px',
                        }}
                    >
                        Save
                        <span
                            style={{
                                background: 'rgba(255,255,255,.22)',
                                borderRadius: 5,
                                fontFamily: 'ui-monospace,Menlo,monospace',
                                fontSize: 11,
                                padding: '0px 6px',
                            }}
                        >
                            ⏎
                        </span>
                    </span>
                </span>
            </div>
        </div>
    );
}
