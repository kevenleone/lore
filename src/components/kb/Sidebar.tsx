// Left sidebar: the workspace switcher, Quick Capture, Library views (with
// counts), Collections, Tags,
// and the footer (Ask Lore + Settings).

import type { IconName, View } from '../../store/types';

import { captureShortcut } from '../../lib/appMode';
import { cn } from '../../lib/cn';
import { SEED_TAG_ORDER } from '../../store/seed';
import { useStore } from '../../store/useStore';
import { isViewActive, tagCounts, viewCounts } from '../../store/views';
import { Message, Settings, Sparkle } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { CollectionsSection } from './CollectionsSection';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

/** Fixed while the pane collapses, so the contents don't reflow mid-transition. */
export const SIDEBAR_WIDTH = 248;

/**
 * Every row here is a button: the sidebar is how the library is navigated, so
 * each one has to be reachable by keyboard as well as by pointer. The reset
 * strips the chrome a `<button>` brings with it, leaving the row it replaced.
 */
const ROW_BASE =
    'text-subhead flex w-full items-center gap-[9px] rounded-7 border-none bg-transparent px-[9px] py-[6px] text-left font-[inherit]';

const SECTION_LABEL =
    'text-caption px-[9px] pt-[15px] pb-[5px] font-[680] tracking-[.06em] text-faint uppercase';

const COUNT = 'text-body-sm tabular-nums opacity-50';

const FOOTER_ROW =
    'flex w-full items-center gap-[9px] rounded-7 border-none bg-transparent px-[9px] py-[8px] text-left font-[inherit] text-text2 hover:bg-hover';

/** Selected rows carry the accent; the rest only light up under the pointer. */
function rowClass(active: boolean): string {
    return cn(
        ROW_BASE,
        active ? 'bg-accent-tint font-[590] text-accent' : 'text-text2 hover:bg-hover',
    );
}

const KEY_CAP = 'font-mono text-caption opacity-50';

const LIB_VIEWS: {
    countKey: keyof ReturnType<typeof viewCounts>;
    icon: IconName;
    keys: string;
    kind: View['kind'];
    label: string;
}[] = [
    { countKey: 'all', icon: 'layers', keys: '⌘1', kind: 'all', label: 'All Items' },
    { countKey: 'inbox', icon: 'inbox', keys: '⌘2', kind: 'inbox', label: 'Inbox' },
    { countKey: 'today', icon: 'calendar', keys: '⌘3', kind: 'today', label: 'Today' },
    { countKey: 'starred', icon: 'star', keys: '⌘4', kind: 'starred', label: 'Starred' },
];

export function Sidebar({ onCapture }: { onCapture: () => void }) {
    const items = useStore((s) => s.items);
    const mainView = useStore((s) => s.mainView);
    const setMainView = useStore((s) => s.setMainView);
    const view = useStore((s) => s.view);
    const selectView = useStore((s) => s.selectView);
    const toggleChat = useStore((s) => s.toggleChat);
    const openSettings = useStore((s) => s.openSettings);
    const showCounts = useStore((s) => s.prefs.switches.counts);
    const vaultTagOrder = useStore((s) => s.tagOrder);

    const counts = viewCounts(items);
    // The open vault's own order when it has one, else the sample order.
    const tags = tagCounts(items, vaultTagOrder.length ? vaultTagOrder : SEED_TAG_ORDER);

    return (
        <div
            className="flex h-full flex-none flex-col overflow-auto border-r border-border bg-surface2 p-[10px] text-subhead"
            // The width is shared with App.tsx's collapse transition, so it stays
            // a constant rather than becoming a class.
            style={{ width: SIDEBAR_WIDTH }}
        >
            {/* Which vault this window is showing — scopes everything below it. */}
            <WorkspaceSwitcher />

            {/* Quick Capture */}
            <button
                className="mb-[10px] flex w-full items-center gap-[9px] rounded-9 border border-accent-border bg-accent-tint px-[11px] py-[9px] text-left font-[inherit] font-[590] text-accent"
                onClick={onCapture}
                type="button"
            >
                <Sparkle size={15} />
                Quick Capture
                <span className="ml-auto font-mono text-caption opacity-75">
                    {captureShortcut()}
                </span>
            </button>

            {/* Library */}
            <div className={cn(SECTION_LABEL, 'pt-[6px]')}>Library</div>
            {LIB_VIEWS.map((v) => {
                const active = mainView === 'library' && isViewActive(view, v.kind);
                return (
                    <button
                        aria-current={active ? 'page' : undefined}
                        className={rowClass(active)}
                        key={v.kind}
                        onClick={() => selectView(v.kind, null)}
                        type="button"
                    >
                        <span className="flex flex-none">
                            <Icon name={v.icon} />
                        </span>
                        <span className="flex-1">{v.label}</span>
                        {showCounts && <span className={COUNT}>{counts[v.countKey]}</span>}
                        <span className={KEY_CAP}>{v.keys}</span>
                    </button>
                );
            })}

            {/* The calendar is a surface rather than a filter, so it sits apart. */}
            <button
                aria-current={mainView === 'calendar' ? 'page' : undefined}
                className={rowClass(mainView === 'calendar')}
                onClick={() => setMainView('calendar')}
                type="button"
            >
                <span className="flex flex-none">
                    <Icon name="calendar" />
                </span>
                <span className="flex-1">Calendar</span>
                <span className={KEY_CAP}>⌘5</span>
            </button>

            {/* Collections (add / edit / remove) */}
            <CollectionsSection />

            {/* Tags */}
            <div className={SECTION_LABEL}>Tags</div>
            {tags.map((t) => {
                const active = isViewActive(view, 'tag', t.name);
                return (
                    <button
                        aria-current={active ? 'page' : undefined}
                        className={rowClass(active)}
                        key={t.name}
                        onClick={() => selectView('tag', t.name)}
                        type="button"
                    >
                        <span className="flex flex-none opacity-60">
                            <Icon name="hash" />
                        </span>
                        <span className="flex-1">{t.name}</span>
                        {showCounts && <span className={COUNT}>{t.count}</span>}
                    </button>
                );
            })}

            <div className="min-h-4 flex-1" />

            {/* Footer */}
            <button className={FOOTER_ROW} onClick={toggleChat} type="button">
                <span className="flex flex-none text-accent">
                    <Message />
                </span>
                Ask Lore
                <span className="ml-auto rounded-5 bg-accent-tint px-[6px] py-[1px] text-caption font-semibold text-accent">
                    AI
                </span>
            </button>
            <button className={FOOTER_ROW} onClick={() => openSettings()} type="button">
                <span className="flex flex-none">
                    <Settings />
                </span>
                Settings
            </button>
        </div>
    );
}
