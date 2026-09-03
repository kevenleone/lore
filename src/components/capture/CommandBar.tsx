// Direction A — Command bar. Type anything; the AI detects what it is, fetches
// link metadata (title/description/image), suggests tags, and files it.
// Enter saves, Esc closes.

import { useEffect, useMemo, useState } from 'react';

import type { NewItem } from '../../data/repository';
import type { ItemType } from '../../store/types';

import { captureAi, hideCapture, hostOf, saveCapture } from '../../lib/captureActions';
import { fetchLinkMetadata, type LinkMetadata } from '../../lib/linkMetadata';
import { typeMeta } from '../../store/typeMeta';
import { Globe, Sparkle } from '../common/glyphs';
import { Icon } from '../common/Icon';

const AC = 'var(--ac, #5b5bd6)';

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
        <div
            style={{
                background: 'var(--surface, #fff)',
                border: '1px solid var(--border, #ececef)',
                borderRadius: 16,
                boxShadow: 'var(--float-shadow)',
                overflow: 'hidden',
            }}
        >
            {/* input row */}
            <div style={{ alignItems: 'center', display: 'flex', gap: 13, padding: '17px 18px' }}>
                <span
                    style={{
                        alignItems: 'center',
                        background: meta_.bg,
                        borderRadius: 7,
                        color: meta_.fg,
                        display: 'flex',
                        flex: 'none',
                        height: 25,
                        justifyContent: 'center',
                        width: 25,
                    }}
                >
                    <Icon name={type} size={15} />
                </span>
                <input
                    autoFocus
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') void save();
                        if (e.key === 'Escape') void hideCapture();
                    }}
                    placeholder="Capture a link, note, task, or code…"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text, #1a1a1f)',
                        flex: 1,
                        font: 'inherit',
                        fontSize: 15.5,
                        minWidth: 0,
                        outline: 'none',
                    }}
                    value={text}
                />
                <span
                    style={{
                        alignItems: 'center',
                        background: meta_.bg,
                        borderRadius: 6,
                        color: meta_.fg,
                        display: 'inline-flex',
                        flex: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                        gap: 5,
                        padding: '3px 8px',
                    }}
                >
                    <Icon name={type} size={12} />
                    {meta_.label}
                </span>
            </div>

            {/* link preview */}
            {showPreview && (
                <>
                    <div style={{ background: 'var(--hover, #f0f0f2)', height: 1 }} />
                    <div
                        style={{
                            alignItems: 'flex-start',
                            display: 'flex',
                            gap: 13,
                            padding: '14px 18px',
                        }}
                    >
                        <div
                            style={{
                                alignItems: 'center',
                                background:
                                    'repeating-linear-gradient(45deg,var(--surface3,#f3f3f6),var(--surface3,#f3f3f6) 6px,var(--border-soft,#ededf1) 6px,var(--border-soft,#ededf1) 12px)',
                                borderRadius: 9,
                                color: 'var(--faint, #a8a8b0)',
                                display: 'flex',
                                flex: 'none',
                                height: 46,
                                justifyContent: 'center',
                                overflow: 'hidden',
                                width: 46,
                            }}
                        >
                            {meta?.image ? (
                                <img
                                    alt=""
                                    src={meta.image}
                                    style={{ height: '100%', objectFit: 'cover', width: '100%' }}
                                />
                            ) : (
                                <Globe size={18} />
                            )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                                style={{
                                    color: 'var(--text, #1a1a1f)',
                                    fontSize: 14.5,
                                    fontWeight: 620,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {fetching && !meta ? 'Fetching…' : meta?.title || hostOf(text)}
                            </div>
                            <div
                                style={{
                                    color: 'var(--text3, #9a9aa5)',
                                    fontSize: 12.5,
                                    marginTop: 2,
                                }}
                            >
                                {hostOf(text)}
                            </div>
                            {meta?.description && (
                                <div
                                    style={{
                                        color: 'var(--text2, #6b6b76)',
                                        display: '-webkit-box',
                                        fontSize: 13,
                                        lineHeight: 1.5,
                                        marginTop: 9,
                                        overflow: 'hidden',
                                        WebkitBoxOrient: 'vertical',
                                        WebkitLineClamp: 2,
                                    }}
                                >
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
                    <div style={{ background: 'var(--hover, #f0f0f2)', height: 1 }} />
                    <div
                        style={{
                            alignItems: 'center',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 7,
                            padding: '12px 18px',
                        }}
                    >
                        <span
                            style={{
                                alignItems: 'center',
                                color: 'var(--faint, #a8a8b0)',
                                display: 'inline-flex',
                                fontSize: 10.5,
                                fontWeight: 600,
                                gap: 4,
                                letterSpacing: '.05em',
                                textTransform: 'uppercase',
                            }}
                        >
                            <Sparkle size={11} style={{ color: AC }} />
                            AI tags
                        </span>
                        {tags.map((t) => (
                            <span
                                key={t}
                                style={{
                                    background: 'var(--ac-tint, #eeeef2)',
                                    borderRadius: 6,
                                    color: AC,
                                    fontFamily: 'ui-monospace,Menlo,monospace',
                                    fontSize: 11,
                                    padding: '2px 7px',
                                }}
                            >
                                #{t}
                            </span>
                        ))}
                    </div>
                </>
            )}

            {/* footer */}
            <div
                style={{
                    alignItems: 'center',
                    background: 'var(--surface2, #fafafa)',
                    borderTop: '1px solid var(--border-soft, #f0f0f2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '11px 18px',
                }}
            >
                {error ? (
                    <span style={{ color: '#c0392b', fontSize: 12 }}>{error}</span>
                ) : (
                    <span
                        style={{
                            alignItems: 'center',
                            color: 'var(--text3, #9a9aa5)',
                            display: 'inline-flex',
                            fontSize: 12,
                            gap: 7,
                        }}
                    >
                        <Sparkle size={13} style={{ color: AC }} />
                        Filed to{' '}
                        <strong style={{ color: 'var(--text2, #6b6b76)', fontWeight: 600 }}>
                            {filedTo}
                        </strong>
                    </span>
                )}
                <span style={{ alignItems: 'center', display: 'flex', gap: 7 }}>
                    <span
                        onClick={() => void hideCapture()}
                        style={{
                            background: 'var(--surface, #fff)',
                            border: '1px solid var(--kbd-border, #e2e2e7)',
                            borderBottomWidth: 2,
                            borderRadius: 6,
                            color: 'var(--text2, #6b6b76)',
                            cursor: 'pointer',
                            fontFamily: 'ui-monospace,Menlo,monospace',
                            fontSize: 11,
                            padding: '2px 7px',
                        }}
                    >
                        esc
                    </span>
                    <span
                        onClick={() => void save()}
                        style={{
                            background: AC,
                            border: '1px solid rgba(0,0,0,.12)',
                            borderBottomWidth: 2,
                            borderRadius: 6,
                            color: '#fff',
                            cursor: 'pointer',
                            fontFamily: 'ui-monospace,Menlo,monospace',
                            fontSize: 11,
                            padding: '2px 8px',
                        }}
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
