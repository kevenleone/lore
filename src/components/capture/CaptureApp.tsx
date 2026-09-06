// Root of the Quick Capture window — a transparent, frameless panel (Spotlight
// style). Only the floating card is visible; clicking the empty backdrop or
// losing focus dismisses it. Hosts both capture directions (A command bar,
// B composer) behind a small toggle.
//
// This window is the out-of-app path: ⌥Space reaches it only when Lore is not
// the frontmost window. With Lore in front, the shortcut opens `CaptureDrawer`
// in the main window instead.

import { useEffect, useState } from 'react';

import { setWorkspace } from '../../data';
import { hideCapture } from '../../lib/captureActions';
import { cn } from '../../lib/cn';
import { onWorkspaceChanged } from '../../lib/workspace';
import { loadPersisted } from '../../store/persisted';
import { effectiveTheme, paintTheme } from '../../theme/tokens';
import { CommandBar } from './CommandBar';
import { Composer } from './Composer';
type Mode = 'A' | 'B';

export function CaptureApp() {
    const [mode, setMode] = useState<Mode>('A');
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
        paintTheme(theme, prefs.accent);
    }, [prefs.accent, theme]);

    return (
        <div
            className="flex h-full flex-col items-center gap-3 overflow-hidden bg-transparent px-7 py-[26px]"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) void hideCapture();
            }}
        >
            {/* direction toggle — a floating segmented control */}
            <div className="flex gap-[3px] rounded-9 border border-border bg-surface-glass p-[3px] shadow-[0_6px_18px_-6px_rgba(24,24,48,.35)] backdrop-blur-[20px]">
                <Toggle active={mode === 'A'} onClick={() => setMode('A')}>
                    Command bar
                </Toggle>
                <Toggle active={mode === 'B'} onClick={() => setMode('B')}>
                    Composer
                </Toggle>
            </div>

            <div className="w-full max-w-[560px]">
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
            className={cn(
                'cursor-pointer rounded-7 px-3 py-[5px] text-body-sm',
                active ? 'bg-accent font-semibold text-white' : 'font-medium text-text2',
            )}
            onClick={onClick}
        >
            {children}
        </span>
    );
}
