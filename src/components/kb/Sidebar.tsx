// Left sidebar: the workspace switcher, Quick Capture, Library views (with
// counts), Collections, Tags,
// and the footer (Ask Lore + Settings).

import type { IconName, View } from '../../store/types';

import { SEED_TAG_ORDER } from '../../store/seed';
import { useStore } from '../../store/useStore';
import { isViewActive, tagCounts, viewCounts } from '../../store/views';
import { hoverable } from '../../theme/util.css';
import { Message, Settings, Sparkle } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { CollectionsSection } from './CollectionsSection';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';

const AC = 'var(--ac, #5b5bd6)';

/** Fixed while the pane collapses, so the contents don't reflow mid-transition. */
export const SIDEBAR_WIDTH = 248;

const ROW_BASE = {
    alignItems: 'center',
    borderRadius: 7,
    cursor: 'pointer',
    display: 'flex',
    fontSize: 13.5,
    gap: 9,
    padding: '6px 9px',
} as const;

function rowStyle(active: boolean): React.CSSProperties {
    return active
        ? { ...ROW_BASE, background: 'var(--ac-tint, #eeeef2)', color: AC, fontWeight: 590 }
        : { ...ROW_BASE, color: 'var(--text2, #6b6b76)' };
}

const SECTION_LABEL: React.CSSProperties = {
    color: 'var(--faint, #a8a8b0)',
    fontSize: 11,
    fontWeight: 680,
    letterSpacing: '.06em',
    padding: '15px 9px 5px',
    textTransform: 'uppercase',
};

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

    const countStyle: React.CSSProperties = {
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        opacity: 0.5,
    };

    return (
        <div
            style={{
                background: 'var(--surface2, #fafafa)',
                borderRight: '1px solid var(--border, #ececef)',
                display: 'flex',
                flex: 'none',
                flexDirection: 'column',
                fontSize: 13.5,
                height: '100%',
                overflow: 'auto',
                padding: 10,
                width: SIDEBAR_WIDTH,
            }}
        >
            {/* Which vault this window is showing — scopes everything below it. */}
            <WorkspaceSwitcher />

            {/* Quick Capture */}
            <div
                onClick={onCapture}
                style={{
                    alignItems: 'center',
                    background: 'var(--ac-tint, #eeeef2)',
                    border: '1px solid var(--ac-border, #dedee5)',
                    borderRadius: 9,
                    color: AC,
                    cursor: 'pointer',
                    display: 'flex',
                    fontWeight: 590,
                    gap: 9,
                    marginBottom: 10,
                    padding: '9px 11px',
                }}
            >
                <Sparkle size={15} />
                Quick Capture
                <span
                    style={{
                        fontFamily: 'ui-monospace,Menlo,monospace',
                        fontSize: 11,
                        marginLeft: 'auto',
                        opacity: 0.75,
                    }}
                >
                    ⌥Space
                </span>
            </div>

            {/* Library */}
            <div style={{ ...SECTION_LABEL, paddingTop: 6 }}>Library</div>
            {LIB_VIEWS.map((v) => {
                const active = mainView === 'library' && isViewActive(view, v.kind);
                return (
                    <div
                        className={active ? undefined : hoverable}
                        key={v.kind}
                        onClick={() => selectView(v.kind, null)}
                        style={rowStyle(active)}
                    >
                        <span style={{ display: 'flex', flex: 'none' }}>
                            <Icon name={v.icon} />
                        </span>
                        <span style={{ flex: 1 }}>{v.label}</span>
                        {showCounts && <span style={countStyle}>{counts[v.countKey]}</span>}
                    </div>
                );
            })}

            {/* The calendar is a surface rather than a filter, so it sits apart. */}
            <div
                className={mainView === 'calendar' ? undefined : hoverable}
                onClick={() => setMainView('calendar')}
                style={rowStyle(mainView === 'calendar')}
            >
                <span style={{ display: 'flex', flex: 'none' }}>
                    <Icon name="calendar" />
                </span>
                <span style={{ flex: 1 }}>Calendar</span>
                <span
                    style={{
                        fontFamily: 'ui-monospace,Menlo,monospace',
                        fontSize: 11,
                        opacity: 0.5,
                    }}
                >
                    ⌘3
                </span>
            </div>

            {/* Collections (add / edit / remove) */}
            <CollectionsSection />

            {/* Tags */}
            <div style={SECTION_LABEL}>Tags</div>
            {tags.map((t) => {
                const active = isViewActive(view, 'tag', t.name);
                return (
                    <div
                        className={active ? undefined : hoverable}
                        key={t.name}
                        onClick={() => selectView('tag', t.name)}
                        style={rowStyle(active)}
                    >
                        <span style={{ display: 'flex', flex: 'none', opacity: 0.6 }}>
                            <Icon name="hash" />
                        </span>
                        <span style={{ flex: 1 }}>{t.name}</span>
                        {showCounts && <span style={countStyle}>{t.count}</span>}
                    </div>
                );
            })}

            <div style={{ flex: 1, minHeight: 16 }} />

            {/* Footer */}
            <div
                className={hoverable}
                onClick={toggleChat}
                style={{
                    alignItems: 'center',
                    borderRadius: 7,
                    color: 'var(--text2, #6b6b76)',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 9,
                    padding: '8px 9px',
                }}
            >
                <span style={{ color: AC, display: 'flex', flex: 'none' }}>
                    <Message />
                </span>
                Ask Lore
                <span
                    style={{
                        background: 'var(--ac-tint, #eeeef2)',
                        borderRadius: 5,
                        color: AC,
                        fontSize: 11,
                        fontWeight: 600,
                        marginLeft: 'auto',
                        padding: '1px 6px',
                    }}
                >
                    AI
                </span>
            </div>
            <div
                className={hoverable}
                onClick={() => openSettings()}
                style={{
                    alignItems: 'center',
                    borderRadius: 7,
                    color: 'var(--text2, #6b6b76)',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 9,
                    padding: '8px 9px',
                }}
            >
                <span style={{ display: 'flex', flex: 'none' }}>
                    <Settings />
                </span>
                Settings
            </div>
        </div>
    );
}
