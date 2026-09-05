// Main knowledge-base window: title bar over a three-pane body (sidebar · list ·
// detail/chat). The selected accent is published as the `--ac` CSS variable and
// the Light/Dark token set is written alongside it, so every component can
// reference `var(--ac)` / `var(--surface)` exactly as the prototypes did.
//
// Before any of that is reachable, `Lore Onboarding` covers the window until
// the user has either signed in or chosen a local vault.

import { useEffect, useRef } from 'react';

import { DRAWER_MS, drawerIn, drawerOut, scrimIn, scrimOut } from './App.css';
import { CalendarView } from './components/calendar/CalendarView';
import { CaptureDrawer } from './components/capture/CaptureDrawer';
import { FocusMode } from './components/focus/FocusMode';
import { FocusPopover } from './components/focus/FocusPopover';
import { useFocusTimer } from './components/focus/useFocusTimer';
import { AskLoreChat } from './components/kb/AskLoreChat';
import { DetailPane } from './components/kb/DetailPane';
import { ListPane } from './components/kb/ListPane';
import { Notice } from './components/kb/Notice';
import { PROPERTIES_WIDTH, PropertiesPanel } from './components/kb/PropertiesPanel';
import { Sidebar, SIDEBAR_WIDTH } from './components/kb/Sidebar';
import { TitleBar } from './components/kb/TitleBar';
import { Onboarding } from './components/onboarding/Onboarding';
import { SettingsModal } from './components/settings/SettingsModal';
import { useMountTransition } from './lib/useMountTransition';
import { useStore } from './store/useStore';
import { applyTokens, effectiveTheme, resolveAccent } from './theme/tokens';

export default function App() {
    const hydrate = useStore((s) => s.hydrate);
    const refresh = useStore((s) => s.refresh);
    const appearance = useStore((s) => s.prefs.appearance);
    const accent = useStore((s) => s.prefs.accent);
    const textSize = useStore((s) => s.prefs.textSize);
    const sidebarVisible = useStore((s) => s.sidebarVisible);
    const reduceMotion = useStore((s) => s.prefs.switches.motion);
    const captureOpen = useStore((s) => s.captureOpen);
    const chatOpen = useStore((s) => s.chatOpen);
    const closeCapture = useStore((s) => s.closeCapture);
    const closeOpenItem = useStore((s) => s.closeOpenItem);
    const focusModeOpen = useStore((s) => s.focusModeOpen);
    const focusPopoverOpen = useStore((s) => s.focusPopoverOpen);
    const mainView = useStore((s) => s.mainView);
    const onboarded = useStore((s) => s.onboarded);
    const openId = useStore((s) => s.openId);
    const propertiesOpen = useStore((s) => s.prefs.propertiesOpen);
    // The per-item override wins over the saved preference — that is what the
    // drawer's expand button sets.
    const openAs = useStore((s) => s.openAs ?? s.prefs.openMode);
    const openCapture = useStore((s) => s.openCapture);
    const setMainView = useStore((s) => s.setMainView);
    const settingsOpen = useStore((s) => s.settingsOpen);
    const toggleCapture = useStore((s) => s.toggleCapture);
    const toggleFocus = useStore((s) => s.toggleFocus);
    const toggleProperties = useStore((s) => s.toggleProperties);
    const viewMode = useStore((s) => s.prefs.viewMode);
    const rootRef = useRef<HTMLDivElement>(null);

    useFocusTimer();

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    // The two window shortcuts the new surfaces claim, as listed in Settings →
    // Keyboard Shortcuts. ⌘K lives with the search box it focuses.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.altKey && e.shiftKey && e.code === 'KeyF') {
                e.preventDefault();
                toggleFocus();
            } else if ((e.metaKey || e.ctrlKey) && e.altKey && e.code === 'KeyI') {
                e.preventDefault();
                toggleProperties();
            } else if ((e.metaKey || e.ctrlKey) && e.key === '3') {
                e.preventDefault();
                setMainView('calendar');
            } else if (e.key === 'Escape') {
                // The capture drawer lies over everything else, so it is the first
                // thing Escape takes away; under it, both ways of opening an item
                // from Cards or Table are dismissible too.
                if (captureOpen) closeCapture();
                else closeOpenItem();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [captureOpen, closeCapture, closeOpenItem, setMainView, toggleFocus, toggleProperties]);

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

    // Refresh when the Quick Capture window saves a new item, and take over
    // ⌥Space while this window is in front — Rust routes the shortcut here
    // rather than to the floating panel whenever the main window has focus.
    useEffect(() => {
        const unlisteners: (() => void)[] = [];
        (async () => {
            try {
                const { listen } = await import('@tauri-apps/api/event');
                unlisteners.push(await listen('item:created', () => void refresh()));
                unlisteners.push(await listen('capture:toggle', () => toggleCapture()));
            } catch {
                // Outside Tauri — no event bus.
            }
        })();
        return () => unlisteners.forEach((off) => off());
    }, [refresh, toggleCapture]);

    const theme = effectiveTheme(appearance);
    // List keeps a permanent detail column; Cards and Table open an item over or
    // instead of themselves, which is what `openMode` chooses between.
    const listMode = viewMode === 'list';
    const opened = !listMode && openId !== null;
    const asDrawer = opened && openAs === 'drawer';
    const asPage = opened && openAs === 'page';
    const drawer = useMountTransition(asDrawer && !chatOpen, DRAWER_MS, reduceMotion);
    // Reduce Motion drops both runs; otherwise the class picks the direction, and
    // the panel's own style is the open position it animates to and from.
    const drawerClass = reduceMotion ? undefined : drawer.open ? drawerIn : drawerOut;
    const scrimClass = reduceMotion ? undefined : drawer.open ? scrimIn : scrimOut;

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
                <TitleBar onCapture={openCapture} />
                <Notice />
                <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
                    {/*
                     * The sidebar stays mounted and collapses by width so the pane
                     * slides instead of popping. The clip is on the wrapper and the
                     * width on the sidebar is fixed, so its contents keep their layout
                     * through the transition rather than reflowing on every frame.
                     */}
                    <div
                        aria-hidden={!sidebarVisible}
                        inert={!sidebarVisible}
                        style={{
                            flex: 'none',
                            overflow: 'hidden',
                            transition: reduceMotion
                                ? undefined
                                : 'width .22s cubic-bezier(.4,0,.2,1)',
                            width: sidebarVisible ? SIDEBAR_WIDTH : 0,
                        }}
                    >
                        <Sidebar onCapture={openCapture} />
                    </div>
                    {mainView === 'calendar' ? (
                        <CalendarView onCapture={openCapture} />
                    ) : (
                        <>
                            {/*
                             * The list only steps aside for a full-page item. A drawer
                             * lays over it, and Ask Lore takes the whole area in Cards
                             * and Table because neither leaves a column for it.
                             */}
                            {!(asPage || (chatOpen && !listMode)) && <ListPane />}
                            {(listMode || (chatOpen && !listMode)) && (
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
                            )}
                            {asPage && !chatOpen && (
                                <div
                                    style={{
                                        background: 'var(--surface, #fff)',
                                        display: 'flex',
                                        flex: 1,
                                        flexDirection: 'column',
                                        minHeight: 0,
                                        minWidth: 0,
                                    }}
                                >
                                    <DetailPane chrome="page" />
                                </div>
                            )}
                            {/*
                             * Held in the tree by `drawer.mounted` for the length of
                             * the slide out — but dropped at once when the item is
                             * promoted to a page, since it is not leaving, it is
                             * becoming the thing underneath.
                             */}
                            {drawer.mounted && !chatOpen && !asPage && (
                                <>
                                    <div
                                        className={scrimClass}
                                        onClick={closeOpenItem}
                                        style={{
                                            background: 'var(--scrim, rgba(20,20,30,.36))',
                                            cursor: 'pointer',
                                            inset: 0,
                                            position: 'absolute',
                                            zIndex: 20,
                                        }}
                                    />
                                    <div
                                        className={drawerClass}
                                        style={{
                                            background: 'var(--surface, #fff)',
                                            borderLeft: '1px solid var(--border, #ececef)',
                                            bottom: 0,
                                            boxShadow: 'var(--float-shadow)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            minHeight: 0,
                                            position: 'absolute',
                                            right: 0,
                                            top: 0,
                                            width: 496,
                                            zIndex: 30,
                                        }}
                                    >
                                        <DetailPane chrome="drawer" />
                                    </div>
                                </>
                            )}
                            {/*
                             * Docked on the far edge, outside the drawer/page
                             * branches: a full-page item and a drawer both keep it,
                             * and it collapses by width the way the sidebar does so
                             * its contents never reflow mid-transition.
                             */}
                            <div
                                aria-hidden={!propertiesOpen}
                                inert={!propertiesOpen}
                                style={{
                                    borderLeft: propertiesOpen
                                        ? '1px solid var(--border, #ececef)'
                                        : 'none',
                                    flex: 'none',
                                    overflow: 'hidden',
                                    transition: reduceMotion
                                        ? undefined
                                        : 'width .22s cubic-bezier(.4,0,.2,1)',
                                    width: propertiesOpen ? PROPERTIES_WIDTH : 0,
                                    zIndex: 31,
                                }}
                            >
                                <PropertiesPanel />
                            </div>
                        </>
                    )}

                    {/* Covers the body, not the title bar — the timer chip stays reachable. */}
                    {focusModeOpen && <FocusMode />}

                    {/*
                     * Last in the body, and above the item drawer's z-indexes: a
                     * capture started while something else is open lies over it
                     * rather than fighting it for the same edge.
                     */}
                    <CaptureDrawer />
                </div>
            </div>

            {/*
             * Overlays sit outside the zoomed subtree on purpose. They size against
             * the window (`calc(100% - 64px)`), so under zoom they would grow past
             * the viewport and clip; and the Text size slider lives in Settings —
             * inside the zoom, every drag step rescales the slider under the pointer,
             * which breaks the native drag and slams the value to one end.
             */}
            {focusPopoverOpen && <FocusPopover />}
            {settingsOpen && <SettingsModal />}
            {!onboarded && <Onboarding />}
        </div>
    );
}
