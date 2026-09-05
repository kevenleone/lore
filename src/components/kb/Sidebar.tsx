// Left sidebar: the workspace switcher, Quick Capture, Library views (with
// counts), Collections, Tags,
// and the footer (Ask Lore + Settings).

import type { IconName, View } from '../../store/types';

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

const ROW_BASE =
    'text-subhead flex cursor-pointer items-center gap-[9px] rounded-7 px-[9px] py-[6px]';

const SECTION_LABEL =
    'text-caption px-[9px] pt-[15px] pb-[5px] font-[680] tracking-[.06em] text-faint uppercase';

const COUNT = 'text-body-sm tabular-nums opacity-50';

const FOOTER_ROW =
    'flex cursor-pointer items-center gap-[9px] rounded-7 px-[9px] py-[8px] text-text2 hover:bg-hover';

/** Selected rows carry the accent; the rest only light up under the pointer. */
function rowClass(active: boolean): string {
    return cn(
        ROW_BASE,
        active ? 'bg-accent-tint font-[590] text-accent' : 'text-text2 hover:bg-hover',
    );
}

const LIB_VIEWS: {
    countKey: keyof ReturnType<typeof viewCounts>;
    icon: IconName;
    kind: View['kind'];
    label: string;
}[] = [
    { countKey: 'all', icon: 'layers', kind: 'all', label: 'All Items' },
    { countKey: 'inbox', icon: 'inbox', kind: 'inbox', label: 'Inbox' },
    { countKey: 'today', icon: 'calendar', kind: 'today', label: 'Today' },
    { countKey: 'starred', icon: 'star', kind: 'starred', label: 'Flagged' },
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
            <div
                className="mb-[10px] flex cursor-pointer items-center gap-[9px] rounded-9 border border-accent-border bg-accent-tint px-[11px] py-[9px] font-[590] text-accent"
                onClick={onCapture}
            >
                <Sparkle size={15} />
                Quick Capture
                <span className="ml-auto font-mono text-caption opacity-75">⌥Space</span>
            </div>

            {/* Library */}
            <div className={cn(SECTION_LABEL, 'pt-[6px]')}>Library</div>
            {LIB_VIEWS.map((v) => {
                const active = mainView === 'library' && isViewActive(view, v.kind);
                return (
                    <div
                        className={rowClass(active)}
                        key={v.kind}
                        onClick={() => selectView(v.kind, null)}
                    >
                        <span className="flex flex-none">
                            <Icon name={v.icon} />
                        </span>
                        <span className="flex-1">{v.label}</span>
                        {showCounts && <span className={COUNT}>{counts[v.countKey]}</span>}
                    </div>
                );
            })}

            {/* The calendar is a surface rather than a filter, so it sits apart. */}
            <div
                className={rowClass(mainView === 'calendar')}
                onClick={() => setMainView('calendar')}
            >
                <span className="flex flex-none">
                    <Icon name="calendar" />
                </span>
                <span className="flex-1">Calendar</span>
                <span className="font-mono text-caption opacity-50">⌘3</span>
            </div>

            {/* Collections (add / edit / remove) */}
            <CollectionsSection />

            {/* Tags */}
            <div className={SECTION_LABEL}>Tags</div>
            {tags.map((t) => {
                const active = isViewActive(view, 'tag', t.name);
                return (
                    <div
                        className={rowClass(active)}
                        key={t.name}
                        onClick={() => selectView('tag', t.name)}
                    >
                        <span className="flex flex-none opacity-60">
                            <Icon name="hash" />
                        </span>
                        <span className="flex-1">{t.name}</span>
                        {showCounts && <span className={COUNT}>{t.count}</span>}
                    </div>
                );
            })}

            <div className="min-h-4 flex-1" />

            {/* Footer */}
            <div className={FOOTER_ROW} onClick={toggleChat}>
                <span className="flex flex-none text-accent">
                    <Message />
                </span>
                Ask Lore
                <span className="ml-auto rounded-5 bg-accent-tint px-[6px] py-[1px] text-caption font-semibold text-accent">
                    AI
                </span>
            </div>
            <div className={FOOTER_ROW} onClick={() => openSettings()}>
                <span className="flex flex-none">
                    <Settings />
                </span>
                Settings
            </div>
        </div>
    );
}
