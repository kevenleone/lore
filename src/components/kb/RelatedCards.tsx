import type { Item } from '../../store/types';

import { useAssetSrc } from '../../lib/assetSrc';
import { cn } from '../../lib/cn';
import { useImageFallback } from '../../lib/imageFallback';
import { linkVideo, videoThumbnail } from '../../lib/video';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { ChevronRight, Play } from '../common/glyphs';
import { Icon } from '../common/Icon';

interface RelatedCardsProps {
    hint: string;
    items: Item[];
    label: string;
}

export function RelatedCards({ hint, items, label }: RelatedCardsProps) {
    return (
        <div className="mt-[22px]">
            <div className="mb-[11px] flex items-center gap-2">
                <span className="text-caption font-[680] tracking-[.06em] text-faint uppercase">
                    {label}
                </span>
                <span className="text-caption text-faint">{hint}</span>
            </div>
            <div className="flex flex-col gap-2">
                {items.map((item) => (
                    <RelatedCard item={item} key={item.id} />
                ))}
            </div>
        </div>
    );
}

function RelatedCard({ item }: { item: Item }) {
    const openLinkedItem = useStore((s) => s.openLinkedItem);
    const meta = typeMeta(item.type);
    const video = item.type === 'link' ? linkVideo(item.url) : null;
    const storedImage = useAssetSrc(item.image);
    const thumbnail = video ? (storedImage ?? videoThumbnail(video)) : undefined;
    const { broken, onError } = useImageFallback(thumbnail);

    return (
        <button
            className="flex w-full items-center gap-[11px] rounded-11 border border-border bg-transparent px-[13px] py-[11px] text-left font-[inherit] hover:bg-surface2"
            onClick={() => openLinkedItem(item.id)}
            type="button"
        >
            {thumbnail && !broken ? (
                <span className="relative h-[54px] w-[96px] flex-none overflow-hidden rounded-lg bg-surface3">
                    <img
                        alt=""
                        className="block h-full w-full object-cover"
                        draggable={false}
                        onError={onError}
                        src={thumbnail}
                    />
                    <span className="absolute top-1/2 left-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[rgba(20,20,28,.6)] text-white">
                        <Play className="ml-px" size={11} />
                    </span>
                </span>
            ) : (
                <span
                    className={cn(
                        'flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg',
                        meta.chip,
                    )}
                >
                    <Icon name={item.type} />
                </span>
            )}
            <div className="min-w-0 flex-1">
                <div className="truncate text-subhead font-semibold text-text">{item.title}</div>
                <div className="text-body-sm text-text3">{item.domain || meta.label}</div>
            </div>
            <span className="flex flex-none text-faint">
                <ChevronRight />
            </span>
        </button>
    );
}
