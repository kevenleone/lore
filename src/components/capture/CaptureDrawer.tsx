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

import { DRAWER_MS, drawerIn, drawerOut, scrimIn, scrimOut } from '../../App.css';
import { useMountTransition } from '../../lib/useMountTransition';
import { useStore } from '../../store/useStore';
import { Close } from '../common/glyphs';
import { Composer } from './Composer';

export function CaptureDrawer() {
    const captureOpen = useStore((s) => s.captureOpen);
    const closeCapture = useStore((s) => s.closeCapture);
    const createItem = useStore((s) => s.createItem);
    const reduceMotion = useStore((s) => s.prefs.switches.motion);
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
        <div
            style={{
                inset: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
                position: 'absolute',
                zIndex: 40,
            }}
        >
            <div
                className={reduceMotion ? undefined : open ? scrimIn : scrimOut}
                onClick={closeCapture}
                style={{
                    background: 'var(--scrim, rgba(20,20,30,.36))',
                    cursor: 'pointer',
                    inset: 0,
                    pointerEvents: 'auto',
                    position: 'absolute',
                }}
            />
            <div
                className={reduceMotion ? undefined : open ? drawerIn : drawerOut}
                style={{
                    background: 'var(--surface, #fff)',
                    borderLeft: '1px solid var(--border, #ececef)',
                    bottom: 0,
                    boxShadow: 'var(--float-shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    pointerEvents: 'auto',
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: 496,
                    zIndex: 1,
                }}
            >
                <div
                    style={{
                        alignItems: 'center',
                        background: 'var(--surface2, #fafafa)',
                        borderBottom: '1px solid var(--border, #ececef)',
                        display: 'flex',
                        flex: 'none',
                        gap: 8,
                        padding: '9px 12px',
                    }}
                >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Capture</span>
                    <button
                        aria-label="Close capture"
                        onClick={closeCapture}
                        style={{
                            alignItems: 'center',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: 7,
                            color: 'var(--text3, #9a9aa5)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            height: 28,
                            justifyContent: 'center',
                            marginLeft: 'auto',
                            padding: 0,
                            width: 28,
                        }}
                        type="button"
                    >
                        <Close size={15} sw={2} />
                    </button>
                </div>
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
                    <Composer
                        chrome="drawer"
                        focusReady={settled}
                        onCancel={closeCapture}
                        onSave={save}
                    />
                </div>
            </div>
        </div>
    );
}
