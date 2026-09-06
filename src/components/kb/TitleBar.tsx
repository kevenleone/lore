// Top window bar: traffic lights, sidebar toggle, a window-centered ⌘K search,
// AI-chat toggle, view/sort buttons, and the Capture button. Custom-drawn to
// match the prototype; the window uses `decorations:false`, so the dots drive
// the real window controls.

import { useEffect, useRef } from 'react';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { PanelRight, Plus, Search, SidebarToggle, Sort, Sparkle, ViewList } from '../common/glyphs';
import { Tooltip } from '../common/Tooltip';
import { FocusChip } from '../focus/FocusChip';

/** The three round chrome buttons either side of the Capture button. */
const CHROME_BUTTON =
    'flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg';

export function TitleBar({ onCapture }: { onCapture: () => void }) {
    const toggleSidebar = useStore((s) => s.toggleSidebar);
    const toggleChat = useStore((s) => s.toggleChat);
    const toggleProperties = useStore((s) => s.toggleProperties);
    const chatOpen = useStore((s) => s.chatOpen);
    const propertiesOpen = useStore((s) => s.prefs.propertiesOpen);
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
            className="relative z-35 flex h-[46px] flex-none items-center gap-[14px] border-b border-border bg-titlebar px-[14px] backdrop-blur-[20px]"
            data-tauri-drag-region
        >
            <div className="flex items-center gap-2">
                <TrafficLight action="close" color="#ff5f57" />
                <TrafficLight action="minimize" color="#febc2e" />
                <TrafficLight action="toggleMaximize" color="#28c840" />
            </div>

            <Tooltip keys="⌘⌥S" label="Toggle sidebar">
                <span
                    aria-label="Toggle sidebar"
                    className="ml-1 flex cursor-pointer text-faint"
                    onClick={toggleSidebar}
                >
                    <SidebarToggle />
                </span>
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
                    <span
                        aria-label="Ask Lore"
                        className={cn(
                            CHROME_BUTTON,
                            chatOpen ? 'bg-accent-tint text-accent' : 'text-text2',
                        )}
                        onClick={toggleChat}
                    >
                        <Sparkle />
                    </span>
                </Tooltip>
                <Tooltip keys="⌘⌥I" label="Properties">
                    <span
                        aria-label="Properties"
                        aria-pressed={propertiesOpen}
                        className={cn(
                            CHROME_BUTTON,
                            propertiesOpen ? 'bg-accent-tint text-accent' : 'text-text2',
                        )}
                        onClick={toggleProperties}
                        role="button"
                    >
                        <PanelRight />
                    </span>
                </Tooltip>
                <Tooltip label="View options">
                    <ChromeButton label="View options">
                        <ViewList />
                    </ChromeButton>
                </Tooltip>
                <Tooltip label="Sort">
                    <ChromeButton label="Sort">
                        <Sort />
                    </ChromeButton>
                </Tooltip>
                <span
                    className="ml-1 inline-flex cursor-pointer items-center gap-[7px] rounded-lg bg-accent px-[11px] py-[6px] text-body font-semibold text-white"
                    onClick={onCapture}
                >
                    <Plus />
                    Capture
                    <span className="rounded-5 bg-white/22 px-[6px] py-px font-mono text-micro">
                        ⌘N
                    </span>
                </span>
            </div>
        </div>
    );
}

function ChromeButton({ children, label }: { children: React.ReactNode; label: string }) {
    return (
        <span aria-label={label} className={cn(CHROME_BUTTON, 'text-text2')}>
            {children}
        </span>
    );
}

function TrafficLight({
    action,
    color,
}: {
    action: 'close' | 'minimize' | 'toggleMaximize';
    color: string;
}) {
    return (
        <span
            className="h-3 w-3 cursor-pointer rounded-full"
            onClick={() => windowControl(action)}
            // The macOS traffic-light colours are fixed, not themed.
            style={{ background: color }}
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
