// The thumbnail picker's Unsplash search: a sheet over the window, because the
// Properties panel is a 316px column and a grid of photos needs the room.
//
// Every result carries its photographer's name, and picking one writes that
// credit onto the item alongside the URL — Unsplash's API terms require the
// byline wherever the photo is shown, so it has to survive the pick.

import { useEffect, useRef, useState } from 'react';

import type { UnsplashPhoto } from '../../../lib/unsplash';

import { cn } from '../../../lib/cn';
import { messageFor, searchPhotos, UNSPLASH_HOME } from '../../../lib/unsplash';
import { useStore } from '../../../store/useStore';
import { Close, Search } from '../../common/glyphs';

interface UnsplashPickerProps {
    onClose: () => void;
    onPick: (photo: UnsplashPhoto) => void;
    /** Seeds the field, so the picker opens having already searched the title. */
    query: string;
}

export function UnsplashPicker({ onClose, onPick, query }: UnsplashPickerProps) {
    const key = useStore((s) => s.prefs.unsplashKey);
    const [draft, setDraft] = useState(query);
    // The committed search, separate from what is being typed: the effect below
    // is keyed on it, so Enter is what sends a request and every keystroke is not.
    const [term, setTerm] = useState(query.trim());
    const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
    const [error, setError] = useState<null | string>(null);
    const [searching, setSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', onKey);
        inputRef.current?.focus();
        inputRef.current?.select();
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        if (!key || !term) return;
        let cancelled = false;
        setSearching(true);
        setError(null);
        searchPhotos(key, term).then(
            (result) => {
                if (cancelled) return;
                setPhotos(result.photos);
                setSearching(false);
            },
            (failure: unknown) => {
                if (cancelled) return;
                setPhotos([]);
                setError(messageFor(failure));
                setSearching(false);
            },
        );
        return () => {
            cancelled = true;
        };
    }, [key, term]);

    return (
        <>
            <div
                className="absolute inset-0 z-40 animate-scrim-fade-in bg-scrim backdrop-blur-[2px]"
                onClick={onClose}
            />
            <div
                aria-label="Search Unsplash"
                aria-modal="true"
                className="absolute top-1/2 left-1/2 z-50 flex h-[min(620px,calc(100%-64px))] w-[min(860px,calc(100%-64px))] [transform:translate(-50%,-50%)] animate-sheet-in flex-col overflow-hidden rounded-2xl border border-border bg-surface text-text shadow-sheet"
                role="dialog"
            >
                <div className="flex flex-none items-center gap-[10px] border-b border-border px-4 py-3">
                    <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface3 px-[9px] py-[7px] text-body-lg text-text3">
                        <Search size={14} />
                        <input
                            className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-text outline-none"
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key !== 'Enter') return;
                                e.preventDefault();
                                setTerm(draft.trim());
                            }}
                            placeholder="Search Unsplash photos…"
                            ref={inputRef}
                            value={draft}
                        />
                    </label>
                    <button
                        aria-label="Close"
                        className="flex h-[28px] w-[28px] flex-none items-center justify-center rounded-7 border-none bg-transparent p-0 text-text3 hover:bg-hover"
                        onClick={onClose}
                        type="button"
                    >
                        <Close size={16} sw={2} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    <Body
                        error={error}
                        onPick={onPick}
                        photos={photos}
                        searched={!!term}
                        searching={searching}
                    />
                </div>

                <div className="flex-none border-t border-border px-4 py-[9px] text-body text-text3">
                    Photos from{' '}
                    <a className="text-text2 underline" href={UNSPLASH_HOME} rel="noreferrer">
                        Unsplash
                    </a>
                    . Picking one keeps a link to their CDN and credits the photographer.
                </div>
            </div>
        </>
    );
}

function Body({
    error,
    onPick,
    photos,
    searched,
    searching,
}: {
    error: null | string;
    onPick: (photo: UnsplashPhoto) => void;
    photos: UnsplashPhoto[];
    searched: boolean;
    searching: boolean;
}) {
    if (error) {
        return <p className="py-10 text-center text-body-lg text-danger">{error}</p>;
    }
    if (searching && photos.length === 0) {
        return <p className="py-10 text-center text-body-lg text-text3">Searching…</p>;
    }
    if (searched && photos.length === 0) {
        return (
            <p className="py-10 text-center text-body-lg text-text3">
                No photos match that. Try a broader word.
            </p>
        );
    }
    if (!searched) {
        return (
            <p className="py-10 text-center text-body-lg text-text3">
                Type what the thumbnail should show, then press Enter.
            </p>
        );
    }
    return (
        <div className={cn('grid grid-cols-3 gap-3', searching && 'opacity-60')}>
            {photos.map((photo) => (
                <button
                    className="group block overflow-hidden rounded-11 border border-border bg-transparent p-0 text-left font-[inherit] hover:border-accent-border"
                    key={photo.id}
                    onClick={() => onPick(photo)}
                    type="button"
                >
                    <img
                        alt={photo.alt}
                        className="block h-[124px] w-full object-cover"
                        loading="lazy"
                        src={photo.url}
                        // The photo's own average colour, so the tile has the
                        // right weight before the bytes land.
                        style={{ background: photo.color }}
                    />
                    <span className="block truncate px-[9px] py-[6px] text-label text-text3">
                        {photo.name}
                    </span>
                </button>
            ))}
        </div>
    );
}
