// A look at an item without leaving where you are: hover or focus a reference
// to it and its cover, title and opening lines appear beside the reference.

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { Item } from '../../store/types';

import { getRepository } from '../../data';
import { useAssetSrc } from '../../lib/assetSrc';
import { cn } from '../../lib/cn';
import { useImageFallback } from '../../lib/imageFallback';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { Icon } from '../common/Icon';
import { MarkdownView } from '../common/MarkdownView';

/** Long enough that a pointer crossing a link on its way elsewhere opens nothing. */
const OPEN_DELAY_MS = 350;
/** Long enough to cross the gap from the reference into the card. */
const CLOSE_DELAY_MS = 120;
const EXCERPT_CHARACTERS = 700;
/** Shared with the placement arithmetic below, which has to know the card's size. */
const CARD_WIDTH = 320;
const CARD_HEIGHT = 300;

const GAP = 6;
const EDGE = 8;

/**
 * The attribute that marks the element a card is drawn inside, written as
 * `data-hover-bounds=""` by whoever hosts references. It must be positioned, and it is
 * the card's portal target: drawn where the reference is, the card would be a
 * block inside a paragraph and would be cut off by the scrolling answer list.
 */
const HOVER_BOUNDS = 'data-hover-bounds';

interface Placement {
    /** Set instead of `top` when the card opens upward. */
    bottom?: number;
    host: HTMLElement;
    left: number;
    top?: number;
}

export function ItemHoverCard({ children, item }: { children: ReactNode; item: Item }) {
    const [placement, setPlacement] = useState<null | Placement>(null);
    const anchor = useRef<HTMLSpanElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => () => clearTimeout(timer.current), []);

    const schedule = (open: boolean) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(
            () => setPlacement(open && anchor.current ? place(anchor.current) : null),
            open ? OPEN_DELAY_MS : CLOSE_DELAY_MS,
        );
    };

    return (
        <span
            onBlur={() => schedule(false)}
            onClick={() => schedule(false)}
            onFocus={() => schedule(true)}
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    schedule(false);
                }
            }}
            onMouseEnter={() => schedule(true)}
            onMouseLeave={() => schedule(false)}
            ref={anchor}
        >
            {children}
            {placement &&
                createPortal(
                    <div
                        className="absolute z-40 flex animate-pop-in-fast flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-float"
                        // The pointer may travel from the reference into the card.
                        onMouseEnter={() => schedule(true)}
                        onMouseLeave={() => schedule(false)}
                        role="tooltip"
                        // Measured from the reference, and `CARD_WIDTH` is the
                        // constant that measurement was made against.
                        style={{
                            bottom: placement.bottom,
                            left: placement.left,
                            top: placement.top,
                            width: CARD_WIDTH,
                        }}
                    >
                        <Preview item={item} />
                    </div>,
                    placement.host,
                )}
        </span>
    );
}

function place(anchor: HTMLElement): null | Placement {
    const host = anchor.closest<HTMLElement>(`[${HOVER_BOUNDS}]`);

    if (!host) {
        return null;
    }

    const rect = anchor.getBoundingClientRect();
    const bounds = host.getBoundingClientRect();
    // Rectangles are in screen pixels and CSS lengths are not, once the Text
    // size preference has zoomed the tree.
    const zoom = bounds.width / host.offsetWidth || 1;
    const width = bounds.width / zoom;
    const left = Math.max(
        EDGE,
        Math.min((rect.left - bounds.left) / zoom, width - CARD_WIDTH - EDGE),
    );
    const roomBelow = (bounds.bottom - rect.bottom) / zoom;
    const roomAbove = (rect.top - bounds.top) / zoom;

    if (roomBelow < CARD_HEIGHT && roomAbove > roomBelow) {
        return { bottom: (bounds.bottom - rect.top) / zoom + GAP, host, left };
    }

    return { host, left, top: (rect.bottom - bounds.top) / zoom + GAP };
}

function Preview({ item }: { item: Item }) {
    const collections = useStore((state) => state.collections);
    const [body, setBody] = useState<null | string>(null);
    const image = useAssetSrc(item.image) ?? item.image;
    const { broken, onError } = useImageFallback(image);
    const meta = typeMeta(item.type);
    const collection = collections.find((candidate) => candidate.id === item.collectionId);

    // A listed item carries no body; the card is the one place that needs it.
    useEffect(() => {
        let cancelled = false;

        getRepository()
            .getItem(item.id)
            .then((full) => {
                if (!cancelled) {
                    setBody(full?.body?.trim() ?? '');
                }
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [item.id]);

    const fallback = item.summary ?? item.description ?? item.snippet ?? '';

    return (
        <>
            {image && !broken && (
                <img
                    alt=""
                    className="block h-[84px] w-full flex-none object-cover"
                    draggable={false}
                    onError={onError}
                    src={image}
                />
            )}
            <div className="flex flex-col gap-[6px] px-[14px] pt-3 pb-[14px]">
                <div className="flex items-center gap-[7px] text-body-sm text-text3">
                    <span
                        className={cn(
                            'flex h-[18px] w-[18px] flex-none items-center justify-center rounded-5',
                            meta.chip,
                        )}
                    >
                        <Icon name={item.type} size={12} />
                    </span>
                    <span className="truncate">{collection?.name ?? 'Inbox'}</span>
                </div>
                <div className="text-subhead leading-[1.35] font-[680] text-text">{item.title}</div>
                {body ? (
                    <div className="relative max-h-[150px] overflow-hidden">
                        <MarkdownView
                            className="gap-[6px] text-body leading-[1.5] text-text2"
                            markdown={body.slice(0, EXCERPT_CHARACTERS)}
                        />
                        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-9 bg-linear-to-t from-surface to-transparent" />
                    </div>
                ) : (
                    fallback && (
                        <div className="line-clamp-4 text-body leading-[1.5] text-text2">
                            {fallback}
                        </div>
                    )
                )}
            </div>
        </>
    );
}
