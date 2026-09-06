// Direction A — Command bar. Type anything; the AI detects what it is, fetches
// link metadata (title/description/image), suggests tags, and files it.
// Enter saves, Esc closes.

import { useEffect, useMemo, useState } from 'react';

import type { NewItem } from '../../data/repository';
import type { ItemType } from '../../store/types';

import { captureAi, hideCapture, hostOf, saveCapture } from '../../lib/captureActions';
import { cn } from '../../lib/cn';
import { fetchLinkMetadata, type LinkMetadata } from '../../lib/linkMetadata';
import { typeMeta } from '../../store/typeMeta';
import { Globe, Sparkle } from '../common/glyphs';
import { Icon } from '../common/Icon';

const COLLECTION_FOR: Partial<Record<ItemType, string>> = {
    code: 'design',
    link: 'reading',
    note: 'work',
    task: 'work',
};

export function CommandBar() {
    const [text, setText] = useState('');
    const [type, setType] = useState<ItemType>('note');
    const [tags, setTags] = useState<string[]>([]);
    const [meta, setMeta] = useState<LinkMetadata | null>(null);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState<null | string>(null);

    // Detect type, suggest tags, and (for links) fetch metadata as input settles.
    useEffect(() => {
        const value = text.trim();
        if (!value) {
            setType('note');
            setTags([]);
            setMeta(null);
            return;
        }
        let cancelled = false;
        const id = setTimeout(async () => {
            const detected = await captureAi.detectType(value);
            if (cancelled) return;
            setType(detected);
            const suggested = await captureAi.suggestTags({
                createdAt: '',
                flags: {},
                id: '',
                related: [],
                tags: [],
                title: value,
                type: detected,
                updatedAt: '',
            });
            if (!cancelled) setTags(suggested.slice(0, 2));

            if (detected === 'link') {
                setFetching(true);
                try {
                    const m = await fetchLinkMetadata(value);
                    if (!cancelled) setMeta(m);
                } catch {
                    if (!cancelled) setMeta(null);
                } finally {
                    if (!cancelled) setFetching(false);
                }
            } else {
                setMeta(null);
            }
        }, 350);
        return () => {
            cancelled = true;
            clearTimeout(id);
        };
    }, [text]);

    const meta_ = typeMeta(type);
    const filedTo = useMemo(() => {
        const id = COLLECTION_FOR[type];
        return id ? id[0].toUpperCase() + id.slice(1) : 'Inbox';
    }, [type]);

    const save = async () => {
        if (!text.trim()) return;
        try {
            setError(null);
            await saveCapture(buildItem(text, type, tags, meta));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    const showPreview = type === 'link' && (fetching || !!meta);

    return (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-float">
            {/* input row */}
            <div className="flex items-center gap-[13px] px-[18px] py-[17px]">
                <span
                    className={cn(
                        'flex h-[25px] w-[25px] flex-none items-center justify-center rounded-7',
                        meta_.chip,
                    )}
                >
                    <Icon name={type} size={15} />
                </span>
                <input
                    autoFocus
                    className="min-w-0 flex-1 border-none bg-transparent text-[15.5px] text-text outline-none"
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') void save();
                        if (e.key === 'Escape') void hideCapture();
                    }}
                    placeholder="Capture a link, note, task, or code…"
                    value={text}
                />
                <span
                    className={cn(
                        'inline-flex flex-none items-center gap-[5px] rounded-md px-2 py-[3px] text-caption font-semibold',
                        meta_.chip,
                    )}
                >
                    <Icon name={type} size={12} />
                    {meta_.label}
                </span>
            </div>

            {/* link preview */}
            {showPreview && (
                <>
                    <div className="h-px bg-hover" />
                    <div className="flex items-start gap-[13px] px-[18px] py-[14px]">
                        <div className="flex h-[46px] w-[46px] flex-none items-center justify-center overflow-hidden rounded-9 bg-[repeating-linear-gradient(45deg,var(--surface3),var(--surface3)_6px,var(--border-soft)_6px,var(--border-soft)_12px)] text-faint">
                            {meta?.image ? (
                                <img
                                    alt=""
                                    className="h-full w-full object-cover"
                                    draggable={false}
                                    src={meta.image}
                                />
                            ) : (
                                <Globe size={18} />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-[14.5px] font-[620] text-text">
                                {fetching && !meta ? 'Fetching…' : meta?.title || hostOf(text)}
                            </div>
                            <div className="mt-[2px] text-body text-text3">{hostOf(text)}</div>
                            {meta?.description && (
                                <div className="mt-[9px] line-clamp-2 text-body-lg leading-[1.5] text-text2">
                                    {meta.description}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* AI tags */}
            {tags.length > 0 && (
                <>
                    <div className="h-px bg-hover" />
                    <div className="flex flex-wrap items-center gap-[7px] px-[18px] py-3">
                        <span className="inline-flex items-center gap-1 text-micro font-semibold tracking-[.05em] text-faint uppercase">
                            <Sparkle className="text-accent" size={11} />
                            AI tags
                        </span>
                        {tags.map((t) => (
                            <span
                                className="rounded-md bg-accent-tint px-[7px] py-[2px] font-mono text-caption text-accent"
                                key={t}
                            >
                                #{t}
                            </span>
                        ))}
                    </div>
                </>
            )}

            {/* footer */}
            <div className="flex items-center justify-between border-t border-border-soft bg-surface2 px-[18px] py-[11px]">
                {error ? (
                    <span className="text-body-sm text-[#c0392b]">{error}</span>
                ) : (
                    <span className="inline-flex items-center gap-[7px] text-body-sm text-text3">
                        <Sparkle className="text-accent" size={13} />
                        Filed to <strong className="font-semibold text-text2">{filedTo}</strong>
                    </span>
                )}
                <span className="flex items-center gap-[7px]">
                    <span
                        className="cursor-pointer rounded-md border border-b-2 border-kbd-border bg-surface px-[7px] py-[2px] font-mono text-caption text-text2"
                        onClick={() => void hideCapture()}
                    >
                        esc
                    </span>
                    <span
                        className="cursor-pointer rounded-md border border-b-2 border-black/12 bg-accent px-2 py-[2px] font-mono text-caption text-white"
                        onClick={() => void save()}
                    >
                        ⏎ Save
                    </span>
                </span>
            </div>
        </div>
    );
}

function buildItem(
    text: string,
    type: ItemType,
    tags: string[],
    meta: LinkMetadata | null,
): NewItem {
    const trimmed = text.trim();
    const base: NewItem = {
        collectionId: COLLECTION_FOR[type],
        flags: { inbox: true },
        related: [],
        tags,
        title: trimmed,
        type,
    };
    if (type === 'link') {
        const host = hostOf(trimmed);
        return {
            ...base,
            description: meta?.description,
            domain: host || undefined,
            image: meta?.image,
            title: meta?.title || host || trimmed,
            url: trimmed,
        };
    }
    if (type === 'code' || type === 'note' || type === 'task') {
        return { ...base, body: trimmed, title: trimmed.split('\n')[0].slice(0, 80) };
    }
    return base;
}
