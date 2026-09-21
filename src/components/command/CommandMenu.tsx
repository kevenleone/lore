// The ⌘K command menu: one box that finds a document, runs an action or goes to
// a view from wherever the window is, rather than filtering a list that may not
// be on screen.

import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';

import type { Item, ViewKind } from '../../store/types';

import { getRepository } from '../../data';
import { APP_LINKS, openExternal } from '../../lib/appInfo';
import { cn } from '../../lib/cn';
import { formatHotkey, hotkeyFor } from '../../lib/hotkeys';
import { typeMeta } from '../../store/typeMeta';
import { useStore } from '../../store/useStore';
import { effectiveTheme } from '../../theme/tokens';
import {
    External,
    History,
    Moon,
    Plus,
    Search,
    Settings,
    SidebarToggle,
    Sparkle,
    StarOutline,
    Sun,
    Timer,
    Trash,
} from '../common/glyphs';
import { Icon } from '../common/Icon';

interface CommandEntry {
    group: string;
    hint?: string;
    icon: ReactNode;
    id: string;
    /** Leaves the menu up after running, for rows that only change the query. */
    keepOpen?: boolean;
    keys?: string;
    label: string;
    run: () => void;
    terms?: string;
}

const MAX_DOCUMENTS = 8;
const MIN_INDEXED_QUERY = 3;
const RECENT_FALLBACK = 6;

const KEYCAP =
    'rounded-5 border border-border bg-surface px-[6px] py-px font-mono text-caption text-faint';

export function CommandMenu() {
    const close = useStore((s) => s.closeCommandMenu);
    const items = useStore((s) => s.items);
    const collections = useStore((s) => s.collections);
    const recentItemIds = useStore((s) => s.recentItemIds);
    const recentSearches = useStore((s) => s.recentSearches);
    const recordRecentSearch = useStore((s) => s.recordRecentSearch);
    const openItemPage = useStore((s) => s.openItemPage);
    const commands = useCommands();

    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const indexHits = useIndexSearch(query);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const listId = useId();

    useEffect(() => {
        const previous = document.activeElement;
        inputRef.current?.focus();
        return () => {
            // Hand focus back only if nothing a command did has claimed it.
            const current = document.activeElement;
            if (current && current !== document.body) return;
            if (previous instanceof HTMLElement) previous.focus();
        };
    }, []);

    const entries = useMemo<CommandEntry[]>(() => {
        const trimmed = query.trim();
        const byId = new Map(items.map((item) => [item.id, item]));
        const collectionName = (item: Item): string | undefined =>
            collections.find((c) => c.id === item.collectionId)?.name;
        const openItem = (item: Item, group: string): CommandEntry => ({
            group,
            hint: collectionName(item) ?? typeMeta(item.type).label,
            icon: (
                <span className={typeMeta(item.type).chipFg}>
                    <Icon name={item.type} size={15} />
                </span>
            ),
            id: `item:${group}:${item.id}`,
            label: item.title || 'Untitled',
            run: () => {
                if (trimmed) recordRecentSearch(trimmed);
                openItemPage(item.id);
            },
        });

        if (!trimmed) {
            const searches = recentSearches.map<CommandEntry>((text) => ({
                group: 'Recent searches',
                icon: <History size={14} />,
                id: `search:${text}`,
                keepOpen: true,
                label: text,
                run: () => setQuery(text),
            }));
            const opened = recentItemIds
                .map((id) => byId.get(id))
                .filter((item): item is Item => !!item)
                .map((item) => openItem(item, 'Recently opened'));
            const fallback =
                searches.length || opened.length
                    ? []
                    : [...items]
                          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
                          .slice(0, RECENT_FALLBACK)
                          .map((item) => openItem(item, 'Recent'));
            return [...searches, ...opened, ...fallback, ...commands];
        }

        const needle = trimmed.toLowerCase();
        const indexed = (indexHits ?? [])
            .map((id) => byId.get(id))
            .filter((item): item is Item => !!item);
        const local = items.filter(
            (item) =>
                item.title.toLowerCase().includes(needle) ||
                item.tags.some((tag) => tag.toLowerCase().includes(needle)),
        );
        const documents = [...new Set([...indexed, ...local])]
            .slice(0, MAX_DOCUMENTS)
            .map((item) => openItem(item, 'Documents'));

        return [...documents, ...rankCommands(commands, needle), filterRow(trimmed)];
    }, [
        collections,
        commands,
        indexHits,
        items,
        query,
        recentItemIds,
        recentSearches,
        recordRecentSearch,
        openItemPage,
    ]);

    useEffect(() => setActive(0), [query]);

    useEffect(() => {
        listRef.current
            ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
            ?.scrollIntoView?.({ block: 'nearest' });
    }, [active]);

    const run = (entry: CommandEntry | undefined) => {
        if (!entry) return;
        if (!entry.keepOpen) close();
        entry.run();
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!entries.length) return;
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActive((index) => (index + step + entries.length) % entries.length);
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            run(entries[active]);
            return;
        }
        if (e.key === 'Escape') {
            // App's window listener would otherwise also close the item underneath.
            e.stopPropagation();
            close();
        }
    };

    const optionId = (index: number) => `${listId}-${index}`;

    return (
        <>
            <div
                className="absolute inset-0 z-40 animate-scrim-fade-in bg-scrim backdrop-blur-[2px]"
                onClick={close}
            />
            <div
                aria-label="Command menu"
                aria-modal="true"
                className="absolute top-[12vh] left-1/2 z-50 flex max-h-[min(520px,76vh)] w-[min(620px,calc(100%-64px))] -translate-x-1/2 animate-scrim-fade-in flex-col overflow-hidden rounded-xl border border-border bg-surface text-text shadow-sheet"
                role="dialog"
            >
                <div className="flex items-center gap-[10px] border-b border-border px-4 py-3 text-text3">
                    <Search size={16} />
                    <input
                        aria-activedescendant={entries.length ? optionId(active) : undefined}
                        aria-autocomplete="list"
                        aria-controls={listId}
                        aria-expanded="true"
                        aria-label="Search or run a command"
                        className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-title text-text outline-none placeholder:text-text3"
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder="Search documents or run a command…"
                        ref={inputRef}
                        role="combobox"
                        value={query}
                    />
                    <span className={KEYCAP}>esc</span>
                </div>

                <div
                    className="min-h-0 flex-1 overflow-y-auto p-[6px]"
                    id={listId}
                    ref={listRef}
                    role="listbox"
                >
                    {entries.map((entry, index) => (
                        <div key={entry.id}>
                            {entry.group !== entries[index - 1]?.group && (
                                <div className="px-[10px] pt-[10px] pb-1 text-caption font-medium text-faint">
                                    {entry.group}
                                </div>
                            )}
                            <div
                                aria-selected={index === active}
                                className={cn(
                                    'flex cursor-default items-center gap-[10px] rounded-lg px-[10px] py-[7px] text-body-lg',
                                    index === active ? 'bg-hover text-text' : 'text-text2',
                                )}
                                data-index={index}
                                id={optionId(index)}
                                onClick={() => run(entry)}
                                // Keeps the caret in the input, which a recent search refills.
                                onMouseDown={(e) => e.preventDefault()}
                                onMouseMove={() => setActive(index)}
                                role="option"
                            >
                                <span className="flex w-4 flex-none justify-center text-text3">
                                    {entry.icon}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                                {entry.hint && (
                                    <span className="flex-none truncate text-body-sm text-faint">
                                        {entry.hint}
                                    </span>
                                )}
                                {entry.keys && <span className={KEYCAP}>{entry.keys}</span>}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-none items-center gap-3 border-t border-border px-4 py-2 text-caption text-faint">
                    <span>↑↓ navigate</span>
                    <span>↵ open</span>
                    <span>esc close</span>
                </div>
            </div>
        </>
    );

    function filterRow(text: string): CommandEntry {
        return {
            group: 'Library',
            icon: <Search size={14} />,
            id: 'filter-library',
            label: `Filter library by “${text}”`,
            run: () => {
                recordRecentSearch(text);
                useStore.getState().selectView('all', null);
                useStore.getState().setSearch(text);
            },
        };
    }
}

/**
 * Keeps the menu's section order and ranks prefix matches first inside each
 * section — ranking across sections would split one into two headings.
 */
function rankCommands(commands: CommandEntry[], needle: string): CommandEntry[] {
    const sections = new Map<string, { contains: CommandEntry[]; prefix: CommandEntry[] }>();
    for (const command of commands) {
        const label = command.label.toLowerCase();
        const matchesPrefix = label.startsWith(needle);
        if (!matchesPrefix && !`${label} ${command.terms ?? ''}`.includes(needle)) continue;
        const section = sections.get(command.group) ?? { contains: [], prefix: [] };
        (matchesPrefix ? section.prefix : section.contains).push(command);
        sections.set(command.group, section);
    }
    return [...sections.values()].flatMap((section) => [...section.prefix, ...section.contains]);
}

function useCommands(): CommandEntry[] {
    const appearance = useStore((s) => s.prefs.appearance);
    const collections = useStore((s) => s.collections);
    const focusRunning = useStore((s) => s.focus.running);
    const hasRecents = useStore((s) => s.recentItemIds.length + s.recentSearches.length > 0);

    return useMemo(() => {
        const store = useStore.getState;
        const dark = effectiveTheme(appearance) === 'dark';

        const actions: CommandEntry[] = [
            {
                icon: <Plus size={14} />,
                id: 'capture',
                keys: formatHotkey(hotkeyFor('capture')),
                label: 'Quick Capture',
                run: () => store().openCapture(),
                terms: 'new create add note link task',
            },
            {
                icon: <Sparkle size={14} />,
                id: 'ask-lore',
                label: 'Ask Lore',
                run: () => {
                    store().setMainView('library');
                    if (!store().chatOpen) store().toggleChat();
                },
                terms: 'ai chat question',
            },
            {
                icon: <SidebarToggle size={14} />,
                id: 'sidebar',
                keys: formatHotkey(hotkeyFor('sidebar')),
                label: 'Toggle Sidebar',
                run: () => store().toggleSidebar(),
            },
            {
                icon: <Timer size={14} />,
                id: 'focus',
                keys: formatHotkey(hotkeyFor('focus')),
                label: focusRunning ? 'Stop Focus Timer' : 'Start Focus Timer',
                run: () => store().toggleFocus(),
                terms: 'pomodoro timer',
            },
            {
                icon: dark ? <Sun size={14} /> : <Moon size={14} />,
                id: 'appearance',
                label: dark ? 'Switch to Light Theme' : 'Switch to Dark Theme',
                run: () => store().setAppearance(dark ? 'light' : 'dark'),
                terms: 'appearance theme mode color',
            },
            {
                icon: <Settings size={14} />,
                id: 'settings',
                keys: formatHotkey(hotkeyFor('settings')),
                label: 'Settings',
                run: () => store().openSettings(),
                terms: 'preferences',
            },
            ...(hasRecents
                ? [
                      {
                          icon: <Trash size={14} />,
                          id: 'clear-recents',
                          label: 'Clear Recent',
                          run: () => store().clearRecents(),
                          terms: 'history',
                      },
                  ]
                : []),
        ].map((entry) => ({ ...entry, group: 'Actions' }));

        const views: { icon: ReactNode; keys?: string; kind: ViewKind; label: string }[] = [
            {
                icon: <Icon name="layers" size={14} />,
                keys: formatHotkey(hotkeyFor('view-all')),
                kind: 'all',
                label: 'Everything',
            },
            {
                icon: <Icon name="inbox" size={14} />,
                keys: formatHotkey(hotkeyFor('view-inbox')),
                kind: 'inbox',
                label: 'Inbox',
            },
            {
                icon: <Icon name="note" size={14} />,
                keys: formatHotkey(hotkeyFor('view-notes')),
                kind: 'notes',
                label: 'Notes',
            },
            {
                icon: <Icon name="globe" size={14} />,
                keys: formatHotkey(hotkeyFor('view-links')),
                kind: 'links',
                label: 'Links',
            },
            {
                icon: <Icon name="file" size={14} />,
                keys: formatHotkey(hotkeyFor('view-files')),
                kind: 'files',
                label: 'Files',
            },
            { icon: <Icon name="sun" size={14} />, kind: 'today', label: 'Today' },
            { icon: <StarOutline size={14} />, kind: 'starred', label: 'Starred' },
        ];

        const goTo: CommandEntry[] = views
            .map(({ kind, ...view }) => ({
                ...view,
                group: 'Go to',
                id: `view:${kind}`,
                run: () => store().selectView(kind, null),
            }))
            .concat([
                {
                    group: 'Go to',
                    icon: <Icon name="task" size={14} />,
                    id: 'view:tasks',
                    keys: formatHotkey(hotkeyFor('view-tasks')),
                    label: 'Tasks',
                    run: () => store().setTaskView('summary'),
                },
                {
                    group: 'Go to',
                    icon: <Icon name="calendar" size={14} />,
                    id: 'view:calendar',
                    keys: formatHotkey(hotkeyFor('view-calendar')),
                    label: 'Calendar',
                    run: () => store().setMainView('calendar'),
                },
            ]);

        const collectionEntries: CommandEntry[] = collections.map((collection) => ({
            group: 'Collections',
            icon: (
                <span
                    className="h-2 w-2 rounded-xs"
                    // The collection's own colour, which the user picks.
                    style={{ background: collection.color }}
                />
            ),
            id: `collection:${collection.id}`,
            label: collection.name,
            run: () => store().selectView('collection', collection.id),
            terms: 'collection',
        }));

        const help: CommandEntry[] = [
            {
                group: 'Help',
                icon: <External size={14} />,
                id: 'documentation',
                label: 'Lore Documentation',
                run: () => void openExternal(APP_LINKS.readme),
                terms: 'help docs readme',
            },
            {
                group: 'Help',
                icon: <External size={14} />,
                id: 'contribute',
                label: 'Contribute',
                run: () => void openExternal(APP_LINKS.issues),
                terms: 'help github issue bug',
            },
        ];

        return [...actions, ...goTo, ...collectionEntries, ...help];
    }, [appearance, collections, focusRunning, hasRecents]);
}

/** Body text lives only in the index, so longer queries go there too. */
function useIndexSearch(query: string): null | string[] {
    const [hits, setHits] = useState<null | string[]>(null);

    useEffect(() => {
        const trimmed = query.trim();
        setHits(null);
        if (trimmed.length < MIN_INDEXED_QUERY) return;
        let cancelled = false;
        const timer = setTimeout(() => {
            void getRepository()
                .search(trimmed)
                .then((found) => {
                    if (!cancelled) setHits(found.map((item) => item.id));
                })
                .catch(() => undefined);
        }, 150);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [query]);

    return hits;
}
