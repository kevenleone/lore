// Direction B — Composer. Pick a type, add structured content, accept/dismiss
// AI tag suggestions, choose a collection, then save.
//
// The same form serves both capture surfaces: the floating quick-capture window
// (`panel`) and the in-window capture drawer (`drawer`). Only the frame around
// it differs — the panel is a card that sizes to its content, the drawer fills
// the height it is given and scrolls between fixed tabs and footer.

import { useEffect, useMemo, useRef, useState } from 'react';

import type { NewItem } from '../../data/repository';
import type { Subtask } from '../../lib/subtasks';
import type { Collection, ItemType, Priority } from '../../store/types';

import { getRepository } from '../../data';
import { addDays } from '../../lib/calendar';
import {
    hideCapture,
    hostOf,
    lastCollectionId,
    rememberCollectionId,
    saveCapture,
} from '../../lib/captureActions';
import { cn } from '../../lib/cn';
import { fetchLinkMetadata, type LinkMetadata } from '../../lib/linkMetadata';
import { joinBody } from '../../lib/subtasks';
import { PRIORITIES } from '../../store/types';
import { localDateKey } from '../../store/views';
import { Calendar, Check, ChevronDown, Close, FileGlyph, Globe, Plus } from '../common/glyphs';
import { Icon } from '../common/Icon';

export type CaptureChrome = 'drawer' | 'panel';

export interface ComposerProps {
    chrome?: CaptureChrome;
    /**
     * Where to file a capture when the user has not chosen. The drawer passes
     * the collection the sidebar is showing; the floating window has no sidebar
     * to read, so it falls through to the last one used.
     */
    defaultCollectionId?: null | string;
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

const DEADLINES: { days: number; label: string }[] = [
    { days: 0, label: 'Today' },
    { days: 1, label: 'Tomorrow' },
    { days: 7, label: 'Next week' },
];

/** Where an image capture gets its file: picked off disk, or fetched from a URL. */
type ImageSource = 'file' | 'url';

const IMAGE_SOURCES: { label: string; value: ImageSource }[] = [
    { label: 'Upload', value: 'file' },
    { label: 'URL', value: 'url' },
];

const PRIORITY_LABELS: Record<Priority, string> = {
    high: 'High',
    low: 'Low',
    normal: 'Normal',
    urgent: 'Urgent',
};

const SECTION_LABEL = 'text-micro font-semibold tracking-[.05em] text-faint uppercase';
const CHIP = 'cursor-pointer rounded-md px-[9px] py-[3px] text-caption';
const CHIP_ON = 'bg-accent-tint font-semibold text-accent';
const CHIP_OFF = 'bg-surface3 text-text2';

export function Composer({
    chrome = 'panel',
    defaultCollectionId = null,
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
    const [collectionId, setCollectionId] = useState<string>(
        () => defaultCollectionId ?? lastCollectionId() ?? '',
    );
    const [collOpen, setCollOpen] = useState(false);
    const [error, setError] = useState<null | string>(null);
    const [saving, setSaving] = useState(false);
    const [meta, setMeta] = useState<LinkMetadata | null>(null);
    const [fetching, setFetching] = useState(false);

    // Task-only fields.
    const [description, setDescription] = useState('');
    const [dueAt, setDueAt] = useState('');
    const [priority, setPriority] = useState<Priority>('normal');
    const [today, setToday] = useState(false);
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [subtaskDraft, setSubtaskDraft] = useState('');

    // Image-only fields.
    const [imageSource, setImageSource] = useState<ImageSource>('file');
    const [file, setFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState('');
    const [imageUrlBroken, setImageUrlBroken] = useState(false);
    const [preview, setPreview] = useState<null | string>(null);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Where a capture is filed by default: the surface's own answer (the
    // sidebar's collection), then the last one used, then whatever exists.
    useEffect(() => {
        void getRepository()
            .listCollections()
            .then((c) => {
                setCollections(c);
                if (!c.length) return;
                const has = (id: null | string): boolean => !!id && c.some((x) => x.id === id);
                setCollectionId((current) => {
                    if (has(current)) return current;
                    if (has(defaultCollectionId)) return defaultCollectionId!;
                    const last = lastCollectionId();
                    return has(last) ? last! : c[0].id;
                });
            });
    }, [defaultCollectionId]);

    // The object URL is a live handle on the file; leaking one per picked image
    // pins the whole blob in memory for as long as the window lives.
    useEffect(() => {
        if (!file) {
            setPreview(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const addTag = (raw: string) => {
        const t = raw.trim().replace(/^#/, '').toLowerCase();
        setTagDraft('');
        setAddingTag(false);
        if (t && !tags.includes(t)) setTags((a) => [...a, t]);
    };
    const removeTag = (t: string) => setTags((a) => a.filter((x) => x !== t));

    const addSubtask = (raw: string) => {
        const text = raw.trim();
        setSubtaskDraft('');
        if (text) setSubtasks((a) => [...a, { done: false, text }]);
    };

    const activeCollection = collections.find((c) => c.id === collectionId) ?? null;
    const collRef = useRef<HTMLDivElement>(null);
    const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    // One ref for all five tabs: each renders its own field, so only ever one of
    // them is mounted, and a plain assignment lets it be typed for both.
    const setFieldRef = (el: HTMLInputElement | HTMLTextAreaElement | null) => {
        fieldRef.current = el;
    };

    // The tab's own field takes focus — on open once the surface is settled, and
    // again whenever a different tab (or image source) swaps a new field in. `preventScroll` is
    // belt to `focusReady`'s braces: nothing should need scrolling to by then.
    useEffect(() => {
        if (focusReady) fieldRef.current?.focus({ preventScroll: true });
    }, [focusReady, tab, imageSource]);

    // Close the collection dropdown when clicking elsewhere.
    useEffect(() => {
        if (!collOpen) return;
        const onDown = (e: MouseEvent) => {
            if (collRef.current && !collRef.current.contains(e.target as Node)) setCollOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        return () => window.removeEventListener('mousedown', onDown);
    }, [collOpen]);

    // An image capture *is* its file. The tab used to accept a bare title, which
    // saved an item with no picture in it at all.
    const canSave = useMemo(() => {
        if (tab !== 'image') return value.trim().length > 0;
        return imageSource === 'url' ? imageUrl.trim().length > 0 : !!file;
    }, [tab, value, file, imageSource, imageUrl]);

    const save = async () => {
        if (!canSave || saving) return;
        try {
            setError(null);
            setSaving(true);
            await doSave();
            rememberCollectionId(collectionId);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    };

    // The footer promises ⏎, so the single-line fields honour it. The note and
    // code textareas — and the task's description — keep Enter for newlines.
    const onFieldKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        void save();
    };

    const doSave = async () => {
        const text = value.trim();
        let item: NewItem = {
            collectionId: collectionId || undefined,
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
        } else if (tab === 'task') {
            const body = joinBody(description, subtasks);
            item = {
                ...item,
                body: body || undefined,
                dueAt: dueAt || undefined,
                flags: { inbox: true, today },
                priority: priority === 'normal' ? undefined : priority,
                title: text.slice(0, 80),
            };
        } else if (tab === 'image') {
            const source = imageSource === 'url' ? imageUrl.trim() : null;
            // A URL is kept as a live reference — the item points at the original,
            // so it reflects whatever the source is showing now. An uploaded file
            // has no origin to point at, so the store copies it into the vault and
            // answers with the reference the item holds instead.
            const image = source ?? (await getRepository().uploadAttachment?.(file!));
            item = {
                ...item,
                image,
                title: text || (source ? urlFileName(source) : file!.name),
                url: source ?? undefined,
            };
        } else {
            item = { ...item, body: text, title: text.split('\n')[0].slice(0, 80) };
        }
        await (onSave ? onSave(item) : saveCapture(item));
    };

    const pickFile = (picked: File | null | undefined) => {
        if (picked) setFile(picked);
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
                    <>
                        {/*
                         * No checkbox beside the title: nothing can tick it — you
                         * do not capture a task that is already done — and next to
                         * the real ones under Subtasks a decorative one reads as a
                         * control. The tab's own icon already says "task".
                         */}
                        <div className="rounded-xl border border-border p-[14px]">
                            <input
                                className="w-full border-none bg-transparent font-[inherit] text-title-lg text-text outline-none"
                                onChange={(e) => setValue(e.target.value)}
                                onKeyDown={onFieldKeyDown}
                                placeholder="What needs doing?"
                                ref={setFieldRef}
                                value={value}
                            />
                            <textarea
                                className="mt-[9px] min-h-[52px] w-full resize-y border-none bg-transparent font-[inherit] text-body-lg leading-[1.55] text-text2 outline-none"
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add a description…"
                                value={description}
                            />
                        </div>

                        <div className="mt-[14px] flex flex-wrap items-center gap-[7px]">
                            <span className={SECTION_LABEL}>Deadline</span>
                            {DEADLINES.map((choice) => {
                                const day = dayFromNow(choice.days);
                                return (
                                    <span
                                        className={cn(CHIP, dueAt === day ? CHIP_ON : CHIP_OFF)}
                                        key={choice.label}
                                        onClick={() => setDueAt(dueAt === day ? '' : day)}
                                    >
                                        {choice.label}
                                    </span>
                                );
                            })}
                            <span className="inline-flex items-center gap-[5px] rounded-md bg-surface3 px-[9px] py-[3px] text-caption text-text2">
                                <Calendar size={12} />
                                <input
                                    className="border-none bg-transparent font-[inherit] text-caption text-text2 outline-none"
                                    onChange={(e) => setDueAt(e.target.value)}
                                    type="date"
                                    value={dueAt}
                                />
                            </span>
                            {dueAt && (
                                <span
                                    className="inline-flex cursor-pointer items-center text-faint"
                                    onClick={() => setDueAt('')}
                                    title="Clear the deadline"
                                >
                                    <Close size={13} sw={2} />
                                </span>
                            )}
                        </div>

                        <div className="mt-[11px] flex flex-wrap items-center gap-[7px]">
                            <span className={SECTION_LABEL}>Priority</span>
                            {PRIORITIES.map((p) => (
                                <span
                                    className={cn(CHIP, priority === p ? CHIP_ON : CHIP_OFF)}
                                    key={p}
                                    onClick={() => setPriority(p)}
                                >
                                    {PRIORITY_LABELS[p]}
                                </span>
                            ))}
                        </div>

                        <div className="mt-[11px] flex items-center gap-2">
                            <span className={SECTION_LABEL}>Focus</span>
                            <span
                                className={cn(
                                    'inline-flex cursor-pointer items-center gap-[6px] rounded-md px-[9px] py-[3px] text-caption',
                                    today ? CHIP_ON : CHIP_OFF,
                                )}
                                onClick={() => setToday((t) => !t)}
                            >
                                <span
                                    className={cn(
                                        'flex h-[13px] w-[13px] items-center justify-center rounded-[4px] border',
                                        today
                                            ? 'border-accent bg-accent text-white'
                                            : 'border-dash text-transparent',
                                    )}
                                >
                                    <Check size={9} sw={3} />
                                </span>
                                Add to Today
                            </span>
                        </div>

                        <div className="mt-[11px] flex flex-wrap items-start gap-2">
                            <span className={cn(SECTION_LABEL, 'mt-[5px]')}>Subtasks</span>
                            <div className="flex min-w-[180px] flex-1 flex-col gap-[5px]">
                                {subtasks.map((subtask, index) => (
                                    <span
                                        className="inline-flex items-center gap-[7px] text-body-lg text-text2"
                                        key={`${index}-${subtask.text}`}
                                    >
                                        <span
                                            className={cn(
                                                'flex h-[15px] w-[15px] flex-none cursor-pointer items-center justify-center rounded-[4px] border',
                                                subtask.done
                                                    ? 'border-accent bg-accent text-white'
                                                    : 'border-border text-transparent',
                                            )}
                                            onClick={() =>
                                                setSubtasks((a) =>
                                                    a.map((x, j) =>
                                                        j === index ? { ...x, done: !x.done } : x,
                                                    ),
                                                )
                                            }
                                        >
                                            <Check size={10} sw={3} />
                                        </span>
                                        <span
                                            className={cn(
                                                subtask.done && 'line-through opacity-60',
                                            )}
                                        >
                                            {subtask.text}
                                        </span>
                                        <span
                                            className="cursor-pointer text-faint"
                                            onClick={() =>
                                                setSubtasks((a) => a.filter((_, j) => j !== index))
                                            }
                                        >
                                            <Close size={12} sw={2} />
                                        </span>
                                    </span>
                                ))}
                                <input
                                    className="w-full border-none bg-transparent font-[inherit] text-body-lg text-text outline-none placeholder:text-text3"
                                    onChange={(e) => setSubtaskDraft(e.target.value)}
                                    onKeyDown={(e) => {
                                        // Enter here means "this subtask", not "the
                                        // capture" — the footer's ⏎ must not fire.
                                        if (e.key !== 'Enter') return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        addSubtask(subtaskDraft);
                                    }}
                                    placeholder="+ subtask"
                                    value={subtaskDraft}
                                />
                            </div>
                        </div>
                    </>
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
                    <>
                        <div className="mb-3 flex items-center gap-[7px]">
                            {IMAGE_SOURCES.map((source) => (
                                <span
                                    className={cn(
                                        CHIP,
                                        imageSource === source.value ? CHIP_ON : CHIP_OFF,
                                    )}
                                    key={source.value}
                                    onClick={() => setImageSource(source.value)}
                                >
                                    {source.label}
                                </span>
                            ))}
                        </div>
                        {imageSource === 'url' ? (
                            <>
                                <div className="flex items-center gap-[9px] rounded-10 border border-border px-3 py-[10px] text-title text-text">
                                    <span className="flex flex-none text-faint">
                                        <Globe size={16} />
                                    </span>
                                    <input
                                        className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-text outline-none"
                                        onChange={(e) => {
                                            setImageUrl(e.target.value);
                                            setImageUrlBroken(false);
                                        }}
                                        onKeyDown={onFieldKeyDown}
                                        placeholder="https://…/image.png"
                                        ref={setFieldRef}
                                        value={imageUrl}
                                    />
                                </div>
                                {imageUrl.trim() && (
                                    <div className="mt-3 flex flex-col items-center gap-[9px] rounded-xl border border-border p-[14px] text-center">
                                        {imageUrlBroken ? (
                                            <span className="text-body text-text3">
                                                Nothing loads from that URL. Saving still keeps the
                                                link, but check it resolves.
                                            </span>
                                        ) : (
                                            <img
                                                alt=""
                                                className="max-h-[150px] w-full rounded-lg object-contain"
                                                draggable={false}
                                                onError={() => setImageUrlBroken(true)}
                                                src={imageUrl.trim()}
                                            />
                                        )}
                                    </div>
                                )}
                                <div className="mt-2 text-body text-text3">
                                    Kept as a live reference — the image updates with the source,
                                    and goes with it if the page disappears.
                                </div>
                            </>
                        ) : (
                            <>
                                <div
                                    className={cn(
                                        'flex cursor-pointer flex-col items-center gap-[9px] rounded-xl border-[1.5px] border-dashed p-[34px] text-center',
                                        dragging ? 'border-accent bg-accent-tint' : 'border-dash',
                                    )}
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragLeave={() => setDragging(false)}
                                    onDragOver={(e) => {
                                        // Without this the browser navigates to the file
                                        // instead of letting the drop land here.
                                        e.preventDefault();
                                        setDragging(true);
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setDragging(false);
                                        pickFile(e.dataTransfer.files[0]);
                                    }}
                                >
                                    {preview && file?.type.startsWith('image/') ? (
                                        <img
                                            alt={file.name}
                                            className="max-h-[150px] w-full rounded-lg object-contain"
                                            draggable={false}
                                            src={preview}
                                        />
                                    ) : (
                                        <span className="flex h-11 w-11 items-center justify-center rounded-11 bg-type-image-bg text-type-image-fg">
                                            <FileGlyph />
                                        </span>
                                    )}
                                    <div className="text-title font-[560] text-text2">
                                        {file ? file.name : 'Drag files & images here'}
                                    </div>
                                    <div className="text-body text-text3">
                                        {file
                                            ? 'Click to choose a different file'
                                            : 'or click to browse — PNG, PDF, screenshots'}
                                    </div>
                                </div>
                                <input
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    onChange={(e) => pickFile(e.target.files?.[0])}
                                    ref={fileInputRef}
                                    type="file"
                                />
                            </>
                        )}
                        <input
                            className="mt-3 w-full rounded-lg border border-border px-[10px] py-[6px] font-[inherit] text-body-lg text-text outline-none"
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={onFieldKeyDown}
                            placeholder="Title (optional)"
                            value={value}
                        />
                    </>
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
                            <Plus size={9} sw={2.4} />
                            tag
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
                            canSave && !saving
                                ? 'cursor-pointer opacity-100'
                                : 'cursor-default opacity-55',
                        )}
                        onClick={() => void save()}
                    >
                        {saving ? 'Saving…' : 'Save'}
                        <span className="rounded-5 bg-white/22 px-[6px] py-0 font-mono text-caption">
                            ⏎
                        </span>
                    </span>
                </span>
            </div>
        </div>
    );
}

/** A day the deadline chips jump to, as `YYYY-MM-DD` in the user's own zone. */
function dayFromNow(days: number): string {
    return localDateKey(addDays(new Date(), days).toISOString());
}

/** The basename a URL implies, for titling an image captured from the web. */
function urlFileName(raw: string): string {
    try {
        const { hostname, pathname } = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
        return decodeURIComponent(pathname.split('/').filter(Boolean).pop() ?? '') || hostname;
    } catch {
        return raw;
    }
}
