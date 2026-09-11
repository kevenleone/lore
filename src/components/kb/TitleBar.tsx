// Top window bar: traffic lights, sidebar toggle, a window-centered ⌘K search,
// AI-chat toggle, view/sort buttons, and the Capture button. Custom-drawn to
// match the prototype; the window uses `decorations:false`, so the dots drive
// the real window controls.

import { useEffect, useRef } from 'react';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { Plus, Search, SidebarToggle, Sparkle } from '../common/glyphs';
import { ModeAccentBar, ModeBadge } from '../common/ModeBadge';
import { Tooltip } from '../common/Tooltip';
import { FocusChip } from '../focus/FocusChip';

/** The round chrome button beside the Capture button. */
const CHROME_BUTTON =
    'flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg border-none bg-transparent';

export function TitleBar({ onCapture }: { onCapture: () => void }) {
    const toggleSidebar = useStore((s) => s.toggleSidebar);
    const toggleChat = useStore((s) => s.toggleChat);
    const chatOpen = useStore((s) => s.chatOpen);
    const search = useStore((s) => s.search);
    const setSearch = useStore((s) => s.setSearch);
    const inputRef = useRef<HTMLInputElement>(null);

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

    return (
        <div
            // z-35 keeps it above every pane below, so a tooltip hanging off the
            // bar is drawn over the list header rather than behind it.
            className="relative z-35 flex h-[46px] flex-none items-center gap-[14px] border-b border-border bg-titlebar px-[14px] backdrop-blur-[20px] select-none"
            // "deep" drags from anywhere in the bar, not only its bare gaps; Tauri
            // exempts the real controls, which is why they are all buttons.
            data-tauri-drag-region="deep"
        >
            <ModeAccentBar />

            <div className="flex items-center gap-2">
                <TrafficLight action="close" color="#ff5f57" label="Close" />
                <TrafficLight action="minimize" color="#febc2e" label="Minimize" />
                <TrafficLight action="toggleMaximize" color="#28c840" label="Zoom" />
            </div>

            <ModeBadge />

            <Tooltip keys="⌘B" label="Toggle sidebar">
                <button
                    aria-label="Toggle sidebar"
                    className="ml-1 flex cursor-pointer border-none bg-transparent p-0 text-faint"
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
                    className="ml-1 inline-flex cursor-pointer items-center gap-[7px] rounded-lg border-none bg-accent px-[11px] py-[6px] font-[inherit] text-body font-semibold text-white"
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
            className="h-3 w-3 cursor-pointer rounded-full border-none p-0"
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
