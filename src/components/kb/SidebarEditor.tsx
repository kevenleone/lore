// Choosing which surfaces the sidebar carries.
//
// A small sheet rather than a settings pane: this is a decision about the thing
// you are looking at, and making it two clicks away inside Settings puts it
// further from the sidebar than the sidebar is from itself.

import { useEffect, useRef } from 'react';

import type { OptionalSurfaceId } from './sidebarItems';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { Check } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { isSurfaceVisible, OPTIONAL_SURFACES, toggleSurface } from './sidebarItems';

export function SidebarEditor({ onClose }: { onClose: () => void }) {
    const hidden = useStore((state) => state.prefs.hiddenSurfaces);
    const setPref = useStore((state) => state.setPref);
    const mainView = useStore((state) => state.mainView);
    const setMainView = useStore((state) => state.setMainView);
    const sheetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        sheetRef.current?.focus();
    }, []);

    const toggle = (id: OptionalSurfaceId) => {
        const next = toggleSurface(id, hidden);

        setPref('hiddenSurfaces', next);

        // Putting away the surface you are looking at would otherwise leave you
        // on it with no row to leave by.
        if (next.includes(id) && mainView === id) {
            setMainView('library');
        }
    };

    return (
        <>
            <div
                className="absolute inset-0 z-40 animate-scrim-fade-in bg-scrim backdrop-blur-[2px]"
                onClick={onClose}
            />
            <div
                aria-label="Edit sidebar"
                aria-modal="true"
                // The centring stays in `transform` so the entrance keyframe,
                // which animates the same property, replaces it rather than
                // composing with a `translate` utility.
                className="absolute top-1/2 left-1/2 z-50 w-[min(420px,calc(100%-64px))] [transform:translate(-50%,-50%)] animate-sheet-in overflow-hidden rounded-2xl border border-border bg-surface text-text shadow-sheet"
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        onClose();
                    }
                }}
                ref={sheetRef}
                role="dialog"
                tabIndex={-1}
            >
                <div className="px-5 pt-[18px] pb-3">
                    <div className="text-subhead font-semibold">Edit sidebar</div>
                    <div className="mt-[3px] text-body text-text3">
                        Choose which surfaces appear. Anything you put away stays one click away
                        under More.
                    </div>
                </div>

                <div className="px-[10px] pb-2">
                    {OPTIONAL_SURFACES.map((surface) => {
                        const shown = isSurfaceVisible(surface.id, hidden);

                        return (
                            <button
                                aria-checked={shown}
                                className="flex w-full items-center gap-[11px] rounded-9 border-none bg-transparent px-[10px] py-[9px] text-left font-[inherit] hover:bg-hover"
                                key={surface.id}
                                onClick={() => toggle(surface.id)}
                                role="checkbox"
                                type="button"
                            >
                                {/*
                                 * Drawn rather than a control: the whole row is
                                 * the target, and a checkbox inside a button is
                                 * a second one nested in the first.
                                 */}
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'flex h-[15px] w-[15px] flex-none items-center justify-center rounded-sm border-[1.5px]',
                                        shown ? 'border-accent bg-accent' : 'border-border',
                                    )}
                                >
                                    {shown && <Check size={11} />}
                                </span>
                                <span
                                    className={cn(
                                        'flex flex-none',
                                        shown ? 'text-text2' : 'text-faint',
                                    )}
                                >
                                    <Icon name={surface.icon} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span
                                        className={cn(
                                            'block text-body',
                                            shown ? 'font-[560] text-text' : 'text-text3',
                                        )}
                                    >
                                        {surface.label}
                                    </span>
                                    <span className="block text-caption text-faint">
                                        {surface.summary}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="flex justify-end border-t border-border px-5 py-[11px]">
                    <button
                        className="rounded-7 border border-border bg-surface2 px-[12px] py-[6px] font-[inherit] text-body text-text"
                        onClick={onClose}
                        type="button"
                    >
                        Done
                    </button>
                </div>
            </div>
        </>
    );
}
