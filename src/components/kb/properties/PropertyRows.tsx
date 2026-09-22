// The panel's top block: the item's own editable fields, one per row.
//
// `createdAt` is read-only on purpose — `ItemPatch` excludes it, because the
// capture time is the one thing about a note that should not be rewritable from
// a dropdown.

import { useRef, useState } from 'react';

import type { Item, ItemFlags, ItemType, Priority } from '../../../store/types';

import { getRepository } from '../../../data';
import { useAssetSrc } from '../../../lib/assetSrc';
import { cn } from '../../../lib/cn';
import { formatSavedDate } from '../../../lib/format';
import { useImageFallback } from '../../../lib/imageFallback';
import { TYPE_META, typeMeta } from '../../../store/typeMeta';
import { PRIORITIES } from '../../../store/types';
import { useStore } from '../../../store/useStore';
import { Calendar, Globe, Link, Timer } from '../../common/glyphs';
import { Icon } from '../../common/Icon';
import { MenuItem, Picker, ReadOnly, Row } from './controls';

const TYPES = Object.keys(TYPE_META) as ItemType[];

const FLAGS: { key: keyof ItemFlags; label: string }[] = [
    { key: 'inbox', label: 'Inbox' },
    { key: 'today', label: 'Today' },
    { key: 'starred', label: 'Starred' },
    { key: 'done', label: 'Done' },
];

export function PropertyRows({ item }: { item: Item }) {
    const collections = useStore((s) => s.collections);
    const updateItem = useStore((s) => s.updateItem);
    const unsplashKey = useStore((s) => s.prefs.unsplashKey);
    const openPhotoPicker = useStore((s) => s.openPhotoPicker);
    const [editingUrl, setEditingUrl] = useState(false);
    const [urlDraft, setUrlDraft] = useState('');
    const [editingImage, setEditingImage] = useState(false);
    const [imageDraft, setImageDraft] = useState('');
    const fileInput = useRef<HTMLInputElement>(null);
    const thumbnailSrc = useAssetSrc(item.image);
    const { broken: thumbnailBroken, onError: onThumbnailError } = useImageFallback(thumbnailSrc);

    const collection = collections.find((c) => c.id === item.collectionId);

    const commitUrl = () => {
        const next = urlDraft.trim();

        setEditingUrl(false);

        if (next !== (item.url ?? '')) {
            void updateItem(item.id, { url: next || undefined });
        }
    };

    const commitImage = () => {
        const next = imageDraft.trim();

        setEditingImage(false);

        if (next === (item.image ?? '')) {
            return;
        }

        // A hand-typed URL is nobody's credited photo, so the byline goes with
        // the image it belonged to.
        void updateItem(item.id, { image: next || undefined, imageCredit: undefined });
    };

    /** A picked file is copied into the vault; the item stores the path it lands at. */
    const uploadThumbnail = async (file: File) => {
        const stored = await getRepository().uploadAttachment?.(file);

        if (stored) {
            await updateItem(item.id, { image: stored, imageCredit: undefined });
        }
    };

    return (
        <div className="px-4 pt-[14px] pb-4">
            <Row icon={<Icon name="file" size={13} />} label="Type">
                <Picker trigger={<TypeBadge type={item.type} />} width={160}>
                    {(close) =>
                        TYPES.map((type) => (
                            <MenuItem
                                key={type}
                                onClick={() => {
                                    close();

                                    if (type !== item.type) {
                                        void updateItem(item.id, { type });
                                    }
                                }}
                                selected={type === item.type}
                            >
                                <Icon name={type} size={13} />
                                {typeMeta(type).label}
                            </MenuItem>
                        ))
                    }
                </Picker>
            </Row>

            <Row icon={<Icon name="layers" size={13} />} label="Collection">
                <Picker
                    trigger={
                        <>
                            <span
                                className="h-2 w-2 flex-none rounded-xs"
                                // The collection's own colour, which the user picks.
                                style={{ background: collection?.color ?? '#c4c4cc' }}
                            />
                            <span className="truncate">{collection?.name ?? 'Unfiled'}</span>
                        </>
                    }
                >
                    {(close) => (
                        <>
                            <MenuItem
                                onClick={() => {
                                    close();

                                    if (item.collectionId) {
                                        void updateItem(item.id, { collectionId: undefined });
                                    }
                                }}
                                selected={!item.collectionId}
                            >
                                Unfiled
                            </MenuItem>
                            {collections.map((c) => (
                                <MenuItem
                                    key={c.id}
                                    onClick={() => {
                                        close();

                                        if (c.id !== item.collectionId) {
                                            void updateItem(item.id, { collectionId: c.id });
                                        }
                                    }}
                                    selected={c.id === item.collectionId}
                                >
                                    <span
                                        className="h-2 w-2 flex-none rounded-xs"
                                        style={{ background: c.color }}
                                    />
                                    {c.name}
                                </MenuItem>
                            ))}
                        </>
                    )}
                </Picker>
            </Row>

            {/*
             * Due and Priority are a task's own fields, and until they were here
             * they could only be set at capture time — a task could be created
             * late but never rescheduled.
             */}
            {item.type === 'task' && (
                <>
                    <Row icon={<Calendar />} label="Due">
                        <input
                            className="border-none bg-transparent text-right font-[inherit] text-body text-text2 outline-none"
                            onChange={(e) =>
                                void updateItem(item.id, { dueAt: e.target.value || undefined })
                            }
                            type="date"
                            value={item.dueAt ?? ''}
                        />
                    </Row>

                    <Row icon={<Timer />} label="Priority">
                        <Picker
                            trigger={
                                <span className="capitalize">{item.priority ?? 'normal'}</span>
                            }
                            width={140}
                        >
                            {(close) =>
                                PRIORITIES.map((priority) => (
                                    <MenuItem
                                        key={priority}
                                        onClick={() => {
                                            close();

                                            if (priority !== (item.priority ?? 'normal')) {
                                                void updateItem(item.id, {
                                                    priority: normalize(priority),
                                                });
                                            }
                                        }}
                                        selected={priority === (item.priority ?? 'normal')}
                                    >
                                        <span className="capitalize">{priority}</span>
                                    </MenuItem>
                                ))
                            }
                        </Picker>
                    </Row>
                </>
            )}

            <Row icon={<Calendar />} label="Created">
                <ReadOnly>{formatSavedDate(item.createdAt)}</ReadOnly>
            </Row>

            <Row icon={<Globe />} label="Status">
                <span className="flex flex-wrap justify-end gap-[5px]">
                    {FLAGS.map(({ key, label }) => (
                        <FlagChip
                            key={key}
                            label={label}
                            on={!!item.flags[key]}
                            onClick={() =>
                                void updateItem(item.id, {
                                    flags: { ...item.flags, [key]: !item.flags[key] },
                                })
                            }
                        />
                    ))}
                </span>
            </Row>

            <Row icon={<Icon name="image" size={13} />} label="Thumbnail">
                {editingImage ? (
                    <input
                        autoFocus
                        className="w-full min-w-0 border-b-[1.5px] border-none border-b-accent bg-transparent text-right font-[inherit] text-body text-text outline-none"
                        onBlur={commitImage}
                        onChange={(e) => setImageDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                commitImage();
                            }

                            if (e.key === 'Escape') {
                                setEditingImage(false);
                            }
                        }}
                        placeholder="https://…/image.png"
                        value={imageDraft}
                    />
                ) : (
                    <Picker
                        trigger={
                            <Thumbnail
                                broken={thumbnailBroken}
                                onError={onThumbnailError}
                                src={thumbnailSrc}
                            />
                        }
                        width={180}
                    >
                        {(close) => (
                            <>
                                <MenuItem
                                    onClick={() => {
                                        close();
                                        setImageDraft(item.image ?? '');
                                        setEditingImage(true);
                                    }}
                                    selected={false}
                                >
                                    Use an image URL…
                                </MenuItem>
                                <MenuItem
                                    onClick={() => {
                                        close();
                                        fileInput.current?.click();
                                    }}
                                    selected={false}
                                >
                                    Choose a file…
                                </MenuItem>
                                {/* Absent rather than disabled without a key:
                                    a menu entry that cannot do anything is
                                    worse than one that is not offered. */}
                                {unsplashKey && (
                                    <MenuItem
                                        onClick={() => {
                                            close();
                                            openPhotoPicker(item.id);
                                        }}
                                        selected={false}
                                    >
                                        Search Unsplash…
                                    </MenuItem>
                                )}
                                {item.image && (
                                    <MenuItem
                                        onClick={() => {
                                            close();
                                            void updateItem(item.id, {
                                                image: undefined,
                                                imageCredit: undefined,
                                            });
                                        }}
                                        selected={false}
                                    >
                                        Remove
                                    </MenuItem>
                                )}
                            </>
                        )}
                    </Picker>
                )}
            </Row>
            <input
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];

                    // Cleared so picking the same file twice fires again.
                    e.target.value = '';

                    if (file) {
                        void uploadThumbnail(file);
                    }
                }}
                ref={fileInput}
                type="file"
            />
            <Row icon={<Link />} label="URL">
                {editingUrl ? (
                    <input
                        autoFocus
                        className="w-full min-w-0 border-b-[1.5px] border-none border-b-accent bg-transparent text-right font-[inherit] text-body text-text outline-none"
                        onBlur={commitUrl}
                        onChange={(e) => setUrlDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                commitUrl();
                            }

                            if (e.key === 'Escape') {
                                setEditingUrl(false);
                            }
                        }}
                        placeholder="https://…"
                        value={urlDraft}
                    />
                ) : (
                    <button
                        className="min-w-0 overflow-hidden border-none bg-transparent p-0 text-left font-[inherit] text-[inherit]"
                        onClick={() => {
                            setUrlDraft(item.url ?? '');
                            setEditingUrl(true);
                        }}
                        title={item.url ?? 'Click to edit'}
                        type="button"
                    >
                        <ReadOnly>{item.url}</ReadOnly>
                    </button>
                )}
            </Row>
        </div>
    );
}

function FlagChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
    return (
        <button
            aria-pressed={on}
            className={cn(
                'rounded-md border px-[7px] py-[2.5px] font-[inherit] text-label',
                on
                    ? 'border-solid border-transparent bg-accent-tint font-semibold text-accent'
                    : 'border-dashed border-dash bg-transparent font-medium text-faint',
            )}
            onClick={onClick}
            type="button"
        >
            {label}
        </button>
    );
}

/** `normal` is the absence of a priority, so it is stored as nothing at all. */
function normalize(priority: Priority): Priority | undefined {
    return priority === 'normal' ? undefined : priority;
}

/** The current thumbnail, at the size the panel's value column allows. */
function Thumbnail({
    broken,
    onError,
    src,
}: {
    broken: boolean;
    onError: () => void;
    src?: string;
}) {
    if (!src || broken) {
        return <span className="text-body text-faint">{broken ? 'Broken' : 'None'}</span>;
    }

    return (
        <span className="block h-[22px] w-[34px] overflow-hidden rounded-[5px] border border-border">
            <img
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
                onError={onError}
                src={src}
            />
        </span>
    );
}

function TypeBadge({ type }: { type: ItemType }) {
    const meta = typeMeta(type);

    return (
        <span
            className={cn(
                'inline-flex items-center gap-[5px] rounded-md px-[7px] py-[2.5px] text-label font-semibold',
                meta.chip,
            )}
        >
            <Icon name={type} size={12} /> {meta.label}
        </span>
    );
}
