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
import { cn } from '../../lib/cn';
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

const TABS: { label: string; type: ItemType }[] = [
    { label: 'Link', type: 'link' },
    { label: 'Note', type: 'note' },
    { label: 'Task', type: 'task' },
    { label: 'Code', type: 'code' },
    { label: 'Image', type: 'image' },
];

const SECTION_LABEL = 'text-micro font-semibold tracking-[.05em] text-faint uppercase';

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
            className={cn(
                'flex min-h-0 flex-col overflow-hidden bg-surface',
                inDrawer ? 'h-full' : 'rounded-2xl border border-border shadow-float',
            )}
        >
            {/* type tabs */}
            <div className="flex flex-none gap-[5px] overflow-hidden border-b border-border-soft px-[11px] py-[9px]">
                {TABS.map((t) => {
                    const active = tab === t.type;
                    return (
                        <div
                            className={cn(
                                'flex cursor-pointer items-center gap-[6px] rounded-lg px-[11px] py-[7px] text-body-lg whitespace-nowrap',
                                active ? 'bg-accent-tint font-[590] text-accent' : 'text-text2',
                            )}
                            key={t.type}
                            onClick={() => setTab(t.type)}
                        >
                            <Icon name={t.type} size={15} />
                            <span>{t.label}</span>
                        </div>
                    );
                })}
            </div>

            <div
                className={cn(
                    'min-h-0 px-4 py-[15px]',
                    inDrawer ? 'flex-1 overflow-y-auto' : 'flex-none overflow-y-visible',
                )}
            >
                {/* per-type content */}
                {tab === 'link' && (
                    <>
                        <div className="flex items-center gap-[9px] rounded-10 border border-border px-3 py-[10px] text-title text-text">
                            <span className="flex flex-none text-faint">
                                <Globe size={16} />
                            </span>
                            <input
                                className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-text outline-none"
                                onChange={(e) => setValue(e.target.value)}
                                onKeyDown={onFieldKeyDown}
                                placeholder="https://…"
                                ref={setFieldRef}
                                value={value}
                            />
                            {fetching && (
                                <span className="flex-none text-caption text-text3">fetching…</span>
                            )}
                            {!fetching && meta && (
                                <span className="inline-flex flex-none items-center gap-1 rounded-md bg-type-task-bg px-[7px] py-[2px] text-caption text-type-task-fg">
                                    <Check size={12} sw={2.4} />
                                    fetched
                                </span>
                            )}
                        </div>
                        {meta && (
                            <div className="mt-3 overflow-hidden rounded-xl border border-border">
                                {meta.image && (
                                    <img
                                        alt=""
                                        className="block h-[118px] w-full object-cover"
                                        draggable={false}
                                        src={meta.image}
                                    />
                                )}
                                <div className="px-[14px] py-3">
                                    <div className="text-[14.5px] font-[620]">
                                        {meta.title || hostOf(value)}
                                    </div>
                                    <div className="mt-[3px] flex items-center gap-[5px] text-body text-text3">
                                        <Globe size={12} />
                                        {hostOf(value)}
                                    </div>
                                    {meta.description && (
                                        <div className="mt-[10px] line-clamp-3 text-body-lg leading-[1.55] text-text2">
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
                        className="min-h-[150px] w-full resize-y rounded-xl border border-border px-[14px] py-[13px] font-[inherit] text-[14.5px] leading-[1.6] text-text outline-none"
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Write a note…"
                        ref={setFieldRef}
                        value={value}
                    />
                )}
                {tab === 'task' && (
                    <div className="flex items-start gap-[11px] rounded-xl border border-border p-[14px]">
                        <span className="mt-px h-5 w-5 flex-none rounded-md border-2 border-border" />
                        <input
                            className="flex-1 border-none bg-transparent font-[inherit] text-title-lg text-text outline-none"
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={onFieldKeyDown}
                            placeholder="What needs doing?"
                            ref={setFieldRef}
                            value={value}
                        />
                    </div>
                )}
                {tab === 'code' && (
                    <textarea
                        className="min-h-[150px] w-full resize-y rounded-xl border border-border bg-surface2 p-[14px] font-mono text-body leading-[1.7] text-text2 outline-none"
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Paste a snippet…"
                        ref={setFieldRef}
                        value={value}
                    />
                )}
                {tab === 'image' && (
                    <div className="flex flex-col items-center gap-[9px] rounded-xl border-[1.5px] border-dashed border-dash p-[34px] text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-11 bg-type-image-bg text-type-image-fg">
                            <FileGlyph />
                        </span>
                        <div className="text-title font-[560] text-text2">
                            Drag files &amp; images here
                        </div>
                        <div className="text-body text-text3">
                            or click to browse — PNG, PDF, screenshots
                        </div>
                        <input
                            className="mt-2 w-[70%] rounded-lg border border-border px-[10px] py-[6px] text-center font-[inherit] text-body-lg outline-none"
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={onFieldKeyDown}
                            placeholder="Title (optional)"
                            value={value}
                        />
                    </div>
                )}

                {/* tags */}
                <div className="mt-[14px] flex flex-wrap items-center gap-[7px]">
                    <span className={SECTION_LABEL}>Tags</span>
                    {tags.map((t) => (
                        <span
                            className="inline-flex cursor-pointer items-center gap-[5px] rounded-md bg-accent-tint px-2 py-[3px] font-mono text-caption text-accent"
                            key={t}
                            onClick={() => removeTag(t)}
                        >
                            #{t}
                            <span className="opacity-55">×</span>
                        </span>
                    ))}
                    {addingTag ? (
                        <input
                            autoFocus
                            className="w-[70px] rounded-md border border-accent bg-transparent px-[7px] py-[2px] font-mono text-caption text-accent outline-none"
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
                            value={tagDraft}
                        />
                    ) : (
                        <span
                            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-dash bg-transparent px-[7px] py-[2px] font-mono text-caption text-text3"
                            onClick={() => setAddingTag(true)}
                        >
                            + tag
                        </span>
                    )}
                </div>

                {/* collection — custom dropdown (a native <select> would steal focus and
            dismiss the capture window) */}
                <div className="mt-[11px] flex items-center gap-2">
                    <span className={SECTION_LABEL}>Collection</span>
                    <div className="relative" ref={collRef}>
                        <span
                            className="inline-flex cursor-pointer items-center gap-[7px] rounded-lg bg-sel px-[10px] py-[5px] text-body-lg text-text2"
                            onClick={() => setCollOpen((o) => !o)}
                        >
                            <span
                                className="h-[9px] w-[9px] rounded-full"
                                // The collection's own colour, which the user picks.
                                style={{ background: activeCollection?.color ?? '#c4c4cc' }}
                            />
                            {activeCollection?.name ?? 'Unfiled'}
                            <span className="flex text-faint">
                                <ChevronDown />
                            </span>
                        </span>
                        {collOpen && (
                            <div className="absolute top-8 left-0 z-30 max-h-[220px] min-w-[180px] overflow-auto rounded-10 border border-border bg-surface p-[5px] shadow-[0_14px_34px_-10px_rgba(24,24,48,.32)]">
                                {collections.length === 0 && (
                                    <div className="px-[10px] py-[7px] text-body text-text3">
                                        No collections yet
                                    </div>
                                )}
                                {collections.map((c) => (
                                    <div
                                        className={cn(
                                            'flex cursor-pointer items-center gap-2 rounded-7 px-[10px] py-[7px] text-body-lg',
                                            c.id === collectionId
                                                ? 'bg-accent-tint font-semibold text-accent'
                                                : 'bg-transparent font-normal text-text2',
                                        )}
                                        key={c.id}
                                        onClick={() => {
                                            setCollectionId(c.id);
                                            setCollOpen(false);
                                        }}
                                    >
                                        <span
                                            className="h-[9px] w-[9px] flex-none rounded-full"
                                            style={{ background: c.color }}
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
            <div className="flex flex-none items-center justify-between border-t border-border-soft bg-surface2 px-4 py-[11px]">
                <span className={cn('text-body-sm', error ? 'text-[#c0392b]' : 'text-text3')}>
                    {error ??
                        (inDrawer
                            ? 'esc to close · drag files to attach'
                            : '⌥Space to toggle · drag files to attach')}
                </span>
                <span className="flex items-center gap-2">
                    <span
                        className="cursor-pointer rounded-lg px-3 py-[6px] text-body-lg text-text2"
                        onClick={onCancel}
                    >
                        Cancel
                    </span>
                    <span
                        className={cn(
                            'inline-flex items-center gap-[7px] rounded-lg bg-accent px-[14px] py-[7px] text-body-lg font-semibold text-white',
                            canSave ? 'cursor-pointer opacity-100' : 'cursor-default opacity-55',
                        )}
                        onClick={() => void save()}
                    >
                        Save
                        <span className="rounded-5 bg-white/22 px-[6px] py-0 font-mono text-caption">
                            ⏎
                        </span>
                    </span>
                </span>
            </div>
        </div>
    );
}
