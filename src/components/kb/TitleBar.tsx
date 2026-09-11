// Top window bar: traffic lights, sidebar toggle, a window-centered ⌘K search,
// AI-chat toggle, view/sort buttons, and the Capture button. Custom-drawn to
// match the prototype; the window uses `decorations:false`, so the dots drive
// the real window controls.

import { useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { Plus, Search, SidebarToggle, Sparkle } from '../common/glyphs';
import { ModeAccentBar, ModeBadge } from '../common/ModeBadge';
import { Tooltip } from '../common/Tooltip';
import { FocusChip } from '../focus/FocusChip';

/**
 * macOS draws the real traffic lights (see `window_frame.rs`); everywhere else
 * a frameless window has no controls at all, so the drawn ones stand in.
 */
const NATIVE_WINDOW_CONTROLS = navigator.userAgent.includes('Macintosh');

/** The width the system's three buttons take, so the bar starts clear of them. */
const WINDOW_CONTROLS_WIDTH = 52;

/** The round chrome button beside the Capture button. */
const CHROME_BUTTON =
    'flex h-[30px] w-[30px] items-center justify-center rounded-lg border-none bg-transparent';

export function TitleBar({ onCapture }: { onCapture: () => void }) {
    const toggleSidebar = useStore((s) => s.toggleSidebar);
    const toggleChat = useStore((s) => s.toggleChat);
    const chatOpen = useStore((s) => s.chatOpen);
    const textSize = useStore((s) => s.prefs.textSize);
    const search = useStore((s) => s.search);
    const setSearch = useStore((s) => s.setSearch);
    const inputRef = useRef<HTMLInputElement>(null);
    const barRef = useRef<HTMLDivElement>(null);
    // Fullscreen takes the system's buttons away with the titlebar, so the room
    // kept for them goes too.
    const [fullscreen, setFullscreen] = useState(false);

    // ⌘K / Ctrl+K focuses the search box.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                inputRef.current?.select();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (!NATIVE_WINDOW_CONTROLS) return;

        let unlisten: (() => void) | undefined;
        let mounted = true;

        void (async () => {
            try {
                const { getCurrentWindow } = await import('@tauri-apps/api/window');
                const currentWindow = getCurrentWindow();
                const sync = async () => setFullscreen(await currentWindow.isFullscreen());

                await sync();
                // Entering and leaving fullscreen both resize the window.
                const stop = await currentWindow.onResized(() => void sync());
                if (mounted) unlisten = stop;
                else stop();
            } catch {
                // Running outside Tauri (e.g. Vite preview) — never fullscreen.
            }
        })();

        return () => {
            mounted = false;
            unlisten?.();
        };
    }, []);

    // The system centres its window buttons in a titlebar of its own height, so
    // it has to be told how tall this bar is. `zoom` scales the bar without
    // changing its layout box, which is why this follows the Text size
    // preference rather than a ResizeObserver.
    useEffect(() => {
        const bar = barRef.current;
        if (!NATIVE_WINDOW_CONTROLS || !bar) return;

        const align = async () => {
            try {
                const { invoke } = await import('@tauri-apps/api/core');
                // The rect is in screen pixels, zoom included — which is the
                // height AppKit needs, not the 46 the class asks for.
                await invoke('set_title_bar_height', {
                    height: bar.getBoundingClientRect().height,
                });
            } catch {
                // Running outside Tauri (e.g. Vite preview) — no window to align.
            }
        };

        void align();
    }, [textSize]);

    return (
        <div
            // z-35 keeps it above every pane below, so a tooltip hanging off the
            // bar is drawn over the list header rather than behind it.
            className="relative z-35 flex h-[46px] flex-none items-center gap-[14px] border-b border-border bg-titlebar px-[14px] backdrop-blur-[20px] select-none"
            // "deep" drags from anywhere in the bar, not only its bare gaps; Tauri
            // exempts the real controls, which is why they are all buttons.
            data-tauri-drag-region="deep"
            ref={barRef}
        >
            <ModeAccentBar />

            {NATIVE_WINDOW_CONTROLS ? (
                !fullscreen && (
                    <span
                        // A layout constant shared with AppKit, not a class: it is
                        // the span of buttons the system draws over this corner.
                        style={{ width: WINDOW_CONTROLS_WIDTH }}
                    />
                )
            ) : (
                <div className="flex items-center gap-2">
                    <TrafficLight action="close" color="#ff5f57" label="Close" />
                    <TrafficLight action="minimize" color="#febc2e" label="Minimize" />
                    <TrafficLight action="toggleMaximize" color="#28c840" label="Zoom" />
                </div>
            )}

            <ModeBadge />

            <Tooltip keys="⌘B" label="Toggle sidebar">
                <button
                    aria-label="Toggle sidebar"
                    className="ml-1 flex border-none bg-transparent p-0 text-faint"
                    onClick={toggleSidebar}
                    type="button"
                >
                    <SidebarToggle />
                </button>
            </Tooltip>

            <div className="flex-1" />

            {/* window-centered search */}
            <label
                className={cn(
                    'absolute top-1/2 left-1/2 flex w-[min(420px,38vw)] [transform:translate(-50%,-50%)] items-center gap-2 rounded-9 bg-surface3 px-[11px] py-[7px] text-body-lg',
                    // The input is bare; the box around it is the field.
                    'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
                    search ? 'text-text' : 'text-text3',
                )}
            >
                <Search />
                <input
                    className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-text outline-none"
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search your knowledge…"
                    ref={inputRef}
                    value={search}
                />
                <span className="rounded-5 border border-border bg-surface px-[6px] py-px font-mono text-caption text-faint">
                    ⌘K
                </span>
            </label>

            <div className="flex items-center gap-[6px]">
                <Tooltip keys="⌥⇧F" label="Focus timer">
                    <FocusChip />
                </Tooltip>
                <Tooltip keys="⌘J" label="Ask Lore">
                    <button
                        aria-label="Ask Lore"
                        className={cn(
                            CHROME_BUTTON,
                            chatOpen ? 'bg-accent-tint text-accent' : 'text-text2',
                        )}
                        onClick={toggleChat}
                        type="button"
                    >
                        <Sparkle />
                    </button>
                </Tooltip>
                <button
                    className="ml-1 inline-flex items-center gap-[7px] rounded-lg border-none bg-accent px-[11px] py-[6px] font-[inherit] text-body font-semibold text-white"
                    onClick={onCapture}
                    type="button"
                >
                    <Plus />
                    Capture
                    <span className="rounded-5 bg-white/22 px-[6px] py-px font-mono text-micro">
                        ⌘N
                    </span>
                </button>
            </div>
        </div>
    );
}

function TrafficLight({
    action,
    color,
    label,
}: {
    action: 'close' | 'minimize' | 'toggleMaximize';
    color: string;
    label: string;
}) {
    return (
        <button
            aria-label={label}
            className="h-3 w-3 rounded-full border-none p-0"
            onClick={() => windowControl(action)}
            // The macOS traffic-light colours are fixed, not themed.
            style={{ background: color }}
            type="button"
        />
    );
}

async function windowControl(action: 'close' | 'minimize' | 'toggleMaximize') {
    try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const w = getCurrentWindow();
        if (action === 'close') await w.close();
        else if (action === 'minimize') await w.minimize();
        else await w.toggleMaximize();
    } catch {
        // Running outside Tauri (e.g. Vite preview) — controls are decorative.
    }
}
