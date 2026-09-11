// Main knowledge-base window: title bar over a three-pane body (sidebar · list ·
// detail/chat). The selected accent is published as the `--ac` CSS variable and
// the Light/Dark token set is written alongside it, so every component can
// reference `var(--ac)` / `var(--surface)` exactly as the prototypes did.
//
// Before any of that is reachable, `Lore Onboarding` covers the window until
// the user has chosen a folder to hold their vault.

import { useEffect, useMemo } from 'react';

import { CalendarView } from './components/calendar/CalendarView';
import { CaptureDrawer } from './components/capture/CaptureDrawer';
import { Toasts } from './components/common/Toasts';
import { FocusMode } from './components/focus/FocusMode';
import { FocusPopover } from './components/focus/FocusPopover';
import { useFocusTimer } from './components/focus/useFocusTimer';
import { AskLoreChat } from './components/kb/AskLoreChat';
import { DetailPane } from './components/kb/DetailPane';
import { ListPane } from './components/kb/ListPane';
import { Notice } from './components/kb/Notice';
import { PROPERTIES_WIDTH, PropertiesPanel } from './components/kb/PropertiesPanel';
import { Sidebar, SIDEBAR_WIDTH } from './components/kb/Sidebar';
import { StatusBar } from './components/kb/StatusBar';
import { TitleBar } from './components/kb/TitleBar';
import { Onboarding } from './components/onboarding/Onboarding';
import { SettingsModal } from './components/settings/SettingsModal';
import { APP_LINKS, openExternal } from './lib/appInfo';
import { cn } from './lib/cn';
import { DRAWER_MS } from './lib/motion';
import { SEARCH_COMMAND } from './lib/searchCommand';
import { isTypingTarget } from './lib/typingTarget';
import { useMountTransition } from './lib/useMountTransition';
import { useStore } from './store/useStore';
import { effectiveTheme, paintTheme } from './theme/tokens';

export default function App() {
    const hydrate = useStore((s) => s.hydrate);
    const refresh = useStore((s) => s.refresh);
    const appearance = useStore((s) => s.prefs.appearance);
    const accent = useStore((s) => s.prefs.accent);
    const darkTheme = useStore((s) => s.prefs.darkTheme);
    const lightTheme = useStore((s) => s.prefs.lightTheme);
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
    const openSettings = useStore((s) => s.openSettings);
    const selectView = useStore((s) => s.selectView);
    const setMainView = useStore((s) => s.setMainView);
    const settingsOpen = useStore((s) => s.settingsOpen);
    const statusBarVisible = useStore((s) => s.prefs.switches.statusBar);
    const toggleCapture = useStore((s) => s.toggleCapture);
    const toggleFocus = useStore((s) => s.toggleFocus);
    const toggleProperties = useStore((s) => s.toggleProperties);
    const toggleSidebar = useStore((s) => s.toggleSidebar);
    const viewMode = useStore((s) => s.prefs.viewMode);

    useFocusTimer();

    useEffect(() => {
        void hydrate();
    }, [hydrate]);

    // Escape is the one shortcut the menu bar cannot own: what it closes
    // depends on what is open. Every other command is a menu item now — see
    // `app_menu.rs` — and ⌥⇧F reaches here from the tray as well.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.altKey && e.shiftKey && e.code === 'KeyF') {
                e.preventDefault();
                toggleFocus();
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
    }, [captureOpen, closeCapture, closeOpenItem, toggleFocus]);

    // What the menu bar's items do. The ids are `app_menu.rs`'s.
    const menuCommands = useMemo<Record<string, () => void>>(
        () => ({
            capture: () => toggleCapture(),
            contribute: () => void openExternal(APP_LINKS.issues),
            documentation: () => void openExternal(APP_LINKS.readme),
            'open-vault': () => openSettings('vault'),
            properties: () => toggleProperties(),
            search: () => window.dispatchEvent(new CustomEvent(SEARCH_COMMAND)),
            'select-all': selectAllInFocusedField,
            settings: () => openSettings(),
            sidebar: () => toggleSidebar(),
            'view-all': () => selectView('all', null),
            'view-calendar': () => setMainView('calendar'),
            'view-inbox': () => selectView('inbox', null),
            'view-starred': () => selectView('starred', null),
            'view-today': () => selectView('today', null),
        }),
        [openSettings, selectView, setMainView, toggleCapture, toggleProperties, toggleSidebar],
    );

    // Paint the token set for the effective theme, and repaint when the OS
    // switches while Color mode is on Auto.
    useEffect(() => {
        const paint = () => {
            const mode = effectiveTheme(appearance);
            paintTheme({ accent, mode, themeId: mode === 'dark' ? darkTheme : lightTheme });
        };
        paint();
        if (appearance !== 'auto' || !window.matchMedia) return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', paint);
        return () => mq.removeEventListener('change', paint);
    }, [accent, appearance, darkTheme, lightTheme]);

    // Refresh when the Quick Capture window saves a new item, and take over
    // ⌥Space while this window is in front — Rust routes the shortcut here
    // rather than to the floating panel whenever the main window has focus.
    useEffect(() => {
        // `listen` resolves a tick after the effect returns, so a cleanup that
        // has already run has nothing to remove — and the listener outlives the
        // mount that made it. Under StrictMode that is two of everything, which
        // a toggle answers by toggling straight back.
        let live = true;
        let unlisteners: (() => void)[] = [];

        (async () => {
            try {
                const { listen } = await import('@tauri-apps/api/event');
                const registered = await Promise.all([
                    listen('item:created', () => void refresh()),
                    listen('capture:toggle', () => toggleCapture()),
                    listen<string>('menu', (e) => menuCommands[e.payload]?.()),
                ]);
                if (live) unlisteners = registered;
                else registered.forEach((off) => off());
            } catch {
                // Outside Tauri — no event bus.
            }
        })();

        return () => {
            live = false;
            unlisteners.forEach((off) => off());
        };
    }, [menuCommands, refresh, toggleCapture]);

    // List keeps a permanent detail column; Cards and Table open an item over or
    // instead of themselves, which is what `openMode` chooses between.
    const listMode = viewMode === 'list';
    const opened = !listMode && openId !== null;
    const asDrawer = opened && openAs === 'drawer';
    const asPage = opened && openAs === 'page';
    const drawer = useMountTransition(asDrawer && !chatOpen, DRAWER_MS, reduceMotion);
    // Reduce Motion drops both runs; otherwise the class picks the direction, and
    // the panel's own style is the open position it animates to and from.
    const drawerClass = reduceMotion
        ? undefined
        : drawer.open
          ? 'animate-drawer-in'
          : 'animate-drawer-out';
    // The panel describes the open item, so it is only on screen while one is.
    const detailVisible = !chatOpen && (listMode || asPage || drawer.mounted);
    const showProperties = propertiesOpen && detailVisible;
    /*
     * Follows the view mode, never the drawer's mounted state: that flips
     * mid-close, while the panel still has its width and a collapse to
     * animate, and the panel briefly becomes a column that squeezes the table.
     */
    const overlayProperties = !listMode && !asPage;

    const scrimClass = reduceMotion
        ? undefined
        : drawer.open
          ? 'animate-scrim-in'
          : 'animate-scrim-out';

    return (
        <div
            // `relative` anchors the overlays below, which are deliberately
            // outside the zoomed subtree.
            className="relative h-full overflow-hidden bg-surface text-text"
        >
            <div
                // `relative` anchors the toast stack, which belongs inside the
                // zoom so it follows the Text size preference.
                className="relative flex h-full flex-col"
                // "Text size" scales the whole tree; every size in the UI is in px
                // (see theme/tailwind.css), so the zoom is applied here rather than
                // through rem units.
                style={{ zoom: textSize }}
            >
                <TitleBar onCapture={openCapture} />
                <Notice />
                <div className="relative flex min-h-0 flex-1">
                    {/*
                     * The sidebar stays mounted and collapses by width so the pane
                     * slides instead of popping. The clip is on the wrapper and the
                     * width on the sidebar is fixed, so its contents keep their layout
                     * through the transition rather than reflowing on every frame.
                     */}
                    <div
                        aria-hidden={!sidebarVisible}
                        className={cn(
                            'flex-none overflow-hidden',
                            !reduceMotion &&
                                'transition-[width] duration-220 ease-[cubic-bezier(.4,0,.2,1)]',
                        )}
                        inert={!sidebarVisible}
                        // The collapse animates between two shared constants.
                        style={{ width: sidebarVisible ? SIDEBAR_WIDTH : 0 }}
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
                                <div className="flex min-w-0 flex-1 flex-col bg-surface">
                                    {chatOpen ? <AskLoreChat /> : <DetailPane />}
                                </div>
                            )}
                            {asPage && !chatOpen && (
                                <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
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
                                        className={cn('absolute inset-0 z-20 bg-scrim', scrimClass)}
                                        onClick={closeOpenItem}
                                    />
                                    <div
                                        className={cn(
                                            'absolute top-0 bottom-0 z-30 flex min-h-0 w-[496px] flex-col border-l border-border bg-surface shadow-float',
                                            !reduceMotion &&
                                                'transition-[right] duration-220 ease-[cubic-bezier(.4,0,.2,1)]',
                                            drawerClass,
                                        )}
                                        // Both claim the right edge; without this
                                        // the panel paints over the drawer.
                                        style={{ right: showProperties ? PROPERTIES_WIDTH : 0 }}
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
                                aria-hidden={!showProperties}
                                className={cn(
                                    'z-31 overflow-hidden',
                                    // A drawer lays over the list, so the panel must
                                    // too, or the list reflows behind the scrim.
                                    overlayProperties
                                        ? 'absolute top-0 right-0 bottom-0'
                                        : 'flex-none',
                                    showProperties
                                        ? 'border-l border-border'
                                        : 'border-l-0 border-none',
                                    !reduceMotion &&
                                        'transition-[width] duration-220 ease-[cubic-bezier(.4,0,.2,1)]',
                                )}
                                inert={!showProperties}
                                // The collapse animates between two shared constants.
                                style={{ width: showProperties ? PROPERTIES_WIDTH : 0 }}
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
                {statusBarVisible && <StatusBar />}
                <Toasts />
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

/**
 * Select All, as a desktop app means it: the focused field's text, or nothing.
 * A list of items is not a page of text to select — and the library has no
 * selection of its own yet.
 */
function selectAllInFocusedField(): void {
    const target = document.activeElement;
    if (!isTypingTarget(target)) return;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.select();
        return;
    }
    const selection = document.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target as HTMLElement);
    selection?.removeAllRanges();
    selection?.addRange(range);
}
