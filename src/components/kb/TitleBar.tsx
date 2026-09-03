// Top window bar: traffic lights, sidebar toggle, a window-centered ⌘K search,
// AI-chat toggle, view/sort buttons, and the Capture button. Custom-drawn to
// match the prototype; the window uses `decorations:false`, so the dots drive
// the real window controls.

import { useEffect, useRef } from 'react';

import { useStore } from '../../store/useStore';
import { Plus, Search, SidebarToggle, Sort, Sparkle, ViewList } from '../common/glyphs';

const AC = 'var(--ac, #5b5bd6)';

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
            data-tauri-drag-region
            style={{
                alignItems: 'center',
                backdropFilter: 'blur(20px)',
                background: 'rgba(252,252,253,.86)',
                borderBottom: '1px solid var(--border, #ececef)',
                display: 'flex',
                flex: 'none',
                gap: 14,
                height: 46,
                padding: '0 14px',
                position: 'relative',
                WebkitBackdropFilter: 'blur(20px)',
            }}
        >
            <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                <TrafficLight action="close" color="#ff5f57" />
                <TrafficLight action="minimize" color="#febc2e" />
                <TrafficLight action="toggleMaximize" color="#28c840" />
            </div>

            <span
                onClick={toggleSidebar}
                style={{
                    color: 'var(--faint, #a8a8b0)',
                    cursor: 'pointer',
                    display: 'flex',
                    marginLeft: 4,
                }}
            >
                <SidebarToggle />
            </span>

            <div style={{ flex: 1 }} />

            {/* window-centered search */}
            <label
                style={{
                    alignItems: 'center',
                    background: 'var(--surface3, #f1f1f3)',
                    borderRadius: 9,
                    color: search ? '#1a1a1f' : '#9a9aa5',
                    display: 'flex',
                    fontSize: 13,
                    gap: 8,
                    left: '50%',
                    padding: '7px 11px',
                    position: 'absolute',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'min(420px, 38vw)',
                }}
            >
                <Search />
                <input
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search your knowledge…"
                    ref={inputRef}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text, #1a1a1f)',
                        flex: 1,
                        font: 'inherit',
                        minWidth: 0,
                        outline: 'none',
                    }}
                    value={search}
                />
                <span
                    style={{
                        background: 'var(--surface, #fff)',
                        border: '1px solid var(--border, #e4e4ea)',
                        borderRadius: 5,
                        color: 'var(--faint, #a8a8b0)',
                        fontFamily: 'ui-monospace,Menlo,monospace',
                        fontSize: 11,
                        padding: '1px 6px',
                    }}
                >
                    ⌘K
                </span>
            </label>

            <div style={{ alignItems: 'center', display: 'flex', gap: 6 }}>
                <span
                    onClick={toggleChat}
                    style={{
                        alignItems: 'center',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        height: 30,
                        justifyContent: 'center',
                        width: 30,
                        ...(chatOpen
                            ? { background: 'var(--ac-tint, #eeeef2)', color: AC }
                            : { color: 'var(--text2, #6b6b76)' }),
                    }}
                >
                    <Sparkle />
                </span>
                <ChromeButton>
                    <ViewList />
                </ChromeButton>
                <ChromeButton>
                    <Sort />
                </ChromeButton>
                <span
                    onClick={onCapture}
                    style={{
                        alignItems: 'center',
                        background: AC,
                        borderRadius: 8,
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        fontSize: 12.5,
                        fontWeight: 600,
                        gap: 7,
                        marginLeft: 4,
                        padding: '6px 11px',
                    }}
                >
                    <Plus />
                    Capture
                    <span
                        style={{
                            background: 'rgba(255,255,255,.22)',
                            borderRadius: 5,
                            fontFamily: 'ui-monospace,Menlo,monospace',
                            fontSize: 10.5,
                            padding: '1px 6px',
                        }}
                    >
                        ⌥Space
                    </span>
                </span>
            </div>
        </div>
    );
}

function ChromeButton({ children }: { children: React.ReactNode }) {
    return (
        <span
            style={{
                alignItems: 'center',
                borderRadius: 8,
                color: 'var(--text2, #6b6b76)',
                cursor: 'pointer',
                display: 'flex',
                height: 30,
                justifyContent: 'center',
                width: 30,
            }}
        >
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
            onClick={() => windowControl(action)}
            style={{
                background: color,
                borderRadius: '50%',
                cursor: 'pointer',
                height: 12,
                width: 12,
            }}
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
