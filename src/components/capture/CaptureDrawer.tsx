// Capture from inside Lore: a drawer over the library, sharing the Composer
// with the floating quick-capture window.
//
// The two surfaces answer different situations. This one is for when the window
// is already in front — there is no reason to throw a separate always-on-top
// panel over an app the user is looking at. The floating window is reserved for
// ⌥Space from another app, where there is no Lore window to open a drawer in.
//
// Saving goes through the store rather than `saveCapture`, so the library
// behind the drawer updates directly instead of waiting on the cross-window
// `item:created` event the capture window has to send.

import { useEffect, useState } from 'react';

import type { NewItem } from '../../data/repository';

import { cn } from '../../lib/cn';
import { DRAWER_MS } from '../../lib/motion';
import { useMountTransition } from '../../lib/useMountTransition';
import { useStore } from '../../store/useStore';
import { Close } from '../common/glyphs';
import { Composer } from './Composer';

export function CaptureDrawer() {
    const captureOpen = useStore((s) => s.captureOpen);
    const closeCapture = useStore((s) => s.closeCapture);
    const createItem = useStore((s) => s.createItem);
    const reduceMotion = useStore((s) => s.prefs.switches.motion);
    // Capture from inside a collection files into it — the drawer is opened from
    // the library the user is already looking at.
    const view = useStore((s) => s.view);
    const { mounted, open } = useMountTransition(captureOpen, DRAWER_MS, reduceMotion);
    // False for the length of the slide, so the form does not focus a field that
    // is still off the right edge — see `Composer`'s `focusReady`. A timer rather
    // than `animationend`, which never arrives if the run is throttled away.
    const [settled, setSettled] = useState(false);

    useEffect(() => {
        if (!captureOpen) {
            setSettled(false);
            return;
        }
        if (reduceMotion) {
            setSettled(true);
            return;
        }
        const timer = setTimeout(() => setSettled(true), DRAWER_MS);
        return () => clearTimeout(timer);
    }, [captureOpen, reduceMotion]);

    if (!mounted) return null;

    const save = async (input: NewItem) => {
        await createItem(input);
        closeCapture();
    };

    return (
        /*
         * The clip is load-bearing, not cosmetic: without it the panel's opening
         * position — a full width past the right edge — is real scrollable
         * overflow for everything above it, and anything that scrolls to reach it
         * takes the whole window along. Nothing here is meant to be seen outside
         * the body area anyway.
         */
        <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
            <div
                className={cn(
                    'pointer-events-auto absolute inset-0 cursor-pointer bg-scrim',
                    !reduceMotion && (open ? 'animate-scrim-in' : 'animate-scrim-out'),
                )}
                onClick={closeCapture}
            />
            <div
                className={cn(
                    'pointer-events-auto absolute top-0 right-0 bottom-0 z-1 flex min-h-0 w-[496px] flex-col border-l border-border bg-surface shadow-float',
                    !reduceMotion && (open ? 'animate-drawer-in' : 'animate-drawer-out'),
                )}
            >
                <div className="flex flex-none items-center gap-2 border-b border-border bg-surface2 px-3 py-[9px]">
                    <span className="text-body-lg font-semibold">Capture</span>
                    <button
                        aria-label="Close capture"
                        className="ml-auto inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-7 border-none bg-transparent p-0 text-text3"
                        onClick={closeCapture}
                        type="button"
                    >
                        <Close size={15} sw={2} />
                    </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                    <Composer
                        chrome="drawer"
                        defaultCollectionId={view.kind === 'collection' ? view.val : null}
                        focusReady={settled}
                        onCancel={closeCapture}
                        onSave={save}
                    />
                </div>
            </div>
        </div>
    );
}
