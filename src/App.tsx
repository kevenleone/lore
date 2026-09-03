// Main knowledge-base window: title bar over a three-pane body (sidebar · list ·
// detail/chat). The selected accent is published as the `--ac` CSS variable and
// the Light/Dark token set is written alongside it, so every component can
// reference `var(--ac)` / `var(--surface)` exactly as the prototypes did.
//
// Before any of that is reachable, `Lore Onboarding` covers the window until
// the user has either signed in or chosen a local vault.

import { useEffect, useRef } from 'react';

import { AskLoreChat } from './components/kb/AskLoreChat';
import { DetailPane } from './components/kb/DetailPane';
import { ListPane } from './components/kb/ListPane';
import { Notice } from './components/kb/Notice';
import { Sidebar } from './components/kb/Sidebar';
import { TitleBar } from './components/kb/TitleBar';
import { Onboarding } from './components/onboarding/Onboarding';
import { SettingsModal } from './components/settings/SettingsModal';
import { openCaptureWindow } from './lib/capture';
import { useStore } from './store/useStore';
import { applyTokens, effectiveTheme, resolveAccent } from './theme/tokens';

export default function App() {
    const hydrate = useStore((s) => s.hydrate);
    const refresh = useStore((s) => s.refresh);
    const appearance = useStore((s) => s.prefs.appearance);
    const accent = useStore((s) => s.prefs.accent);
    const textSize = useStore((s) => s.prefs.textSize);
    const sidebarVisible = useStore((s) => s.sidebarVisible);
    const chatOpen = useStore((s) => s.chatOpen);
    const onboarded = useStore((s) => s.onboarded);
    const settingsOpen = useStore((s) => s.settingsOpen);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    // Paint the token set for the effective theme, and repaint when the OS
    // switches while Appearance is on Auto.
    useEffect(() => {
        const paint = () => {
            if (rootRef.current) applyTokens(rootRef.current, effectiveTheme(appearance));
        };
        paint();
        if (appearance !== 'auto' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', paint);
        return () => mq.removeEventListener('change', paint);
    }, [appearance]);

    // Refresh when the Quick Capture window saves a new item.
    useEffect(() => {
        let unlisten: (() => void) | undefined;
        (async () => {
            try {
                const { listen } = await import('@tauri-apps/api/event');
                unlisten = await listen('item:created', () => void refresh());
            } catch {
                // Outside Tauri — no event bus.
            }
        })();
        return () => unlisten?.();
    }, [refresh]);

    const theme = effectiveTheme(appearance);

    return (
        <div
            ref={rootRef}
            style={{
                // `--ac` drives every accent reference in the tree; the design lifts it
                // when it would be too dark to read on the dark ground.
                ['--ac' as string]: resolveAccent(accent, theme),
                background: 'var(--surface, #fff)',
                color: 'var(--text, #1a1a1f)',
                height: '100%',
                overflow: 'hidden',
                // Anchors the overlays below, which are deliberately outside the
                // zoomed subtree.
                position: 'relative',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    // "Text size" scales the whole tree; every size in the UI is in px,
                    // so the zoom is applied here rather than through rem units.
                    zoom: textSize,
                }}
            >
                <TitleBar onCapture={openCaptureWindow} />
                <Notice />
                <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                    {sidebarVisible && <Sidebar onCapture={openCaptureWindow} />}
                    <ListPane />
                    <div
                        style={{
                            background: 'var(--surface, #fff)',
                            display: 'flex',
                            flex: 1,
                            flexDirection: 'column',
                            minWidth: 0,
                        }}
                    >
                        {chatOpen ? <AskLoreChat /> : <DetailPane />}
                    </div>
                </div>
            </div>

            {/*
             * Overlays sit outside the zoomed subtree on purpose. They size against
             * the window (`calc(100% - 64px)`), so under zoom they would grow past
             * the viewport and clip; and the Text size slider lives in Settings —
             * inside the zoom, every drag step rescales the slider under the pointer,
             * which breaks the native drag and slams the value to one end.
             */}
            {settingsOpen && <SettingsModal />}
            {!onboarded && <Onboarding />}
        </div>
    );
}
