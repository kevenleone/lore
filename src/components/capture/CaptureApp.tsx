// Root of the Quick Capture window — a transparent, frameless panel (Spotlight
// style). Only the floating card is visible; clicking the empty backdrop or
// losing focus dismisses it. Hosts both capture directions (A command bar,
// B composer) behind a small toggle.

import { useEffect, useRef, useState } from 'react';

import { setWorkspace } from '../../data';
import { hideCapture } from '../../lib/captureActions';
import { onWorkspaceChanged } from '../../lib/workspace';
import { loadPersisted } from '../../store/persisted';
import { applyTokens, effectiveTheme, resolveAccent } from '../../theme/tokens';
import { CommandBar } from './CommandBar';
import { Composer } from './Composer';

const AC = 'var(--ac, #5b5bd6)';
type Mode = 'A' | 'B';

export function CaptureApp() {
    const [mode, setMode] = useState<Mode>('A');
    const rootRef = useRef<HTMLDivElement>(null);
    // This window has its own JS context, so it reads the shared preferences
    // straight from storage rather than through the knowledge-base store.
    const [prefs, setPrefs] = useState(() => loadPersisted().prefs);
    // Bumped each time the window is shown so the form remounts fresh (no leftover
    // text/state from the previous capture).
    const [sessionKey, setSessionKey] = useState(0);

    // Esc closes; clicking the backdrop closes; losing focus closes; gaining focus
    // (i.e. being shown) resets the form.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') void hideCapture();
        };
        window.addEventListener('keydown', onKey);

        let unlisten: (() => void) | undefined;
        (async () => {
            try {
                const { getCurrentWindow } = await import('@tauri-apps/api/window');
                unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
                    if (focused) setSessionKey((k) => k + 1);
                    else void hideCapture();
                });
            } catch {
                // Outside Tauri.
            }
        })();

        return () => {
            window.removeEventListener('keydown', onKey);
            unlisten?.();
        };
    }, []);

    // Re-read preferences whenever the panel is shown, so a change made in
    // Settings is reflected the next time ⌥Space opens it.
    useEffect(() => {
        setPrefs(loadPersisted().prefs);
    }, [sessionKey]);

    // This window holds its own repository in its own webview. Without following
    // the main window's workspace, the next capture would be written into the
    // vault the user just navigated away from.
    useEffect(() => {
        let unlisten: (() => void) | undefined;
        void setWorkspace(loadPersisted().workspacePath);
        void onWorkspaceChanged((path) => void setWorkspace(path)).then((fn) => {
            unlisten = fn;
        });
        return () => unlisten?.();
    }, []);

    const theme = effectiveTheme(prefs.appearance);
    useEffect(() => {
        if (rootRef.current) applyTokens(rootRef.current, theme);
    }, [theme]);

    return (
        <div
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) void hideCapture();
            }}
            ref={rootRef}
            style={{
                ['--ac' as string]: resolveAccent(prefs.accent, theme),
                alignItems: 'center',
                background: 'transparent',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                height: '100%',
                overflow: 'hidden',
                padding: '26px 28px',
            }}
        >
            {/* direction toggle — a floating segmented control */}
            <div
                style={{
                    backdropFilter: 'blur(20px)',
                    background: 'var(--surface-glass, rgba(255,255,255,.82))',
                    border: '1px solid var(--border, #ececef)',
                    borderRadius: 9,
                    boxShadow: '0 6px 18px -6px rgba(24,24,48,.35)',
                    display: 'flex',
                    gap: 3,
                    padding: 3,
                    WebkitBackdropFilter: 'blur(20px)',
                }}
            >
                <Toggle active={mode === 'A'} onClick={() => setMode('A')}>
                    Command bar
                </Toggle>
                <Toggle active={mode === 'B'} onClick={() => setMode('B')}>
                    Composer
                </Toggle>
            </div>

            <div style={{ maxWidth: 560, width: '100%' }}>
                {mode === 'A' ? <CommandBar key={sessionKey} /> : <Composer key={sessionKey} />}
            </div>
        </div>
    );
}

function Toggle({
    active,
    children,
    onClick,
}: {
    active: boolean;
    children: React.ReactNode;
    onClick: () => void;
}) {
    return (
        <span
            onClick={onClick}
            style={{
                background: active ? AC : 'transparent',
                borderRadius: 7,
                color: active ? '#fff' : 'var(--text2, #6b6b76)',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                padding: '5px 12px',
            }}
        >
            {children}
        </span>
    );
}
