// An item's preview image, over the hashed placeholder it crossfades out of.
// Fills its parent, which must be positioned and clipped; the parent also owns
// the corner radius, so the same component serves the 56×38 list thumbnail and
// the 172px-tall detail banner.

import { useMemo, useState } from 'react';

import type { Item } from '../../store/types';

import { useAssetSrc } from '../../lib/assetSrc';
import { bannerPalette, bannerSeed, bannerStyle } from '../../lib/banner';
import { useStore } from '../../store/useStore';

interface ItemBannerProps {
    /** Show the "loading preview" chip while the image is still in flight. */
    chip?: boolean;
    item: Item;
}

export function ItemBanner({ chip, item }: ItemBannerProps) {
    const reduceMotion = useStore((s) => s.prefs.switches.motion);
    // Keyed by src rather than a bare boolean: the same component instance can be
    // handed a different item as the list re-sorts, and a stale `true` would show
    // an image that has not arrived.
    const [loadedSrc, setLoadedSrc] = useState<null | string>(null);
    const seed = bannerSeed(item);
    const palette = useMemo(() => bannerPalette(seed), [seed]);
    const src = useAssetSrc(item.image);

    const loaded = !!src && loadedSrc === src;
    const fade = reduceMotion ? undefined : 'opacity .45s ease';

    return (
        <>
            <span
                style={{
                    ...bannerStyle(palette, true),
                    opacity: loaded ? 0 : 1,
                    transition: fade,
                }}
            />
            {src && (
                <img
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                    loading="lazy"
                    onLoad={() => setLoadedSrc(src)}
                    src={src}
                    style={{
                        filter: loaded ? 'none' : 'blur(6px)',
                        opacity: loaded ? 1 : 0,
                        transition: reduceMotion ? undefined : 'opacity .5s ease, filter .5s ease',
                    }}
                />
            )}
            {chip && !loaded && (
                <span className="absolute bottom-2 left-2 rounded-5 bg-[rgba(20,20,28,.42)] px-[6px] py-[2px] font-mono text-[9.5px] tracking-[.03em] text-white">
                    loading preview
                </span>
            )}
        </>
    );
}
