// The settings panes from `Lore Settings.dc.html`, less the account and sync
// ones — Lore is offline, so neither has anything to show. Every control here
// writes app state that something outside this folder reads back: a row whose
// feature does not exist yet is not shown at all, because a switch that quietly
// does nothing is worse than a missing one.

import { useEffect, useMemo, useState } from 'react';

import type { VaultSize } from '../../data/repository';
import type { Appearance } from '../../theme/tokens';

import { getRepository } from '../../data';
import { APP_LINKS, APP_VERSION, openExternal } from '../../lib/appInfo';
import { APP_MODE, captureShortcutKeys } from '../../lib/appMode';
import { cn } from '../../lib/cn';
import { formatBytes } from '../../lib/format';
import { revealPath } from '../../lib/reveal';
import { workspaceName } from '../../lib/workspace';
import {
    type Accent,
    ACCENT_NAMES,
    ACCENTS,
    type Density,
    type ItemType,
    type NotificationStyle,
    type OpenMode,
    type Switches,
    type ViewMode,
    type WeekStart,
} from '../../store/types';
import { useStore } from '../../store/useStore';
import { themesFor } from '../../theme/themes';
import { effectiveTheme } from '../../theme/tokens';
import { LoreMark } from '../common/LoreMark';
import { SettingsIcon } from '../common/settingsGlyphs';
import {
    type ChoiceOption,
    Chooser,
    KeyCap,
    PILL_BUTTON,
    PillButton,
    Row,
    SectionLabel,
    Segmented,
    Toggle,
} from './controls';
import { ThemePreview } from './ThemePreview';

/** The About pane's link list. */
const ABOUT_LINK =
    'text-body rounded-lg border border-border bg-surface px-[10px] py-[6px] font-[inherit] text-text2 hover:bg-hover hover:text-text';

/** Options for "Default capture type", ahead of the collections list. */
const CAPTURE_TYPES: ChoiceOption<'auto' | ItemType>[] = [
    { label: 'Detect automatically', value: 'auto' },
    { label: 'Link', value: 'link' },
    { label: 'Note', value: 'note' },
    { label: 'Task', value: 'task' },
    { label: 'Code', value: 'code' },
    { label: 'Image', value: 'image' },
];

export function GeneralPane() {
    const collections = useStore((s) => s.collections);
    const defaultCollection = useStore((s) => s.prefs.defaultCollection);
    const defaultCaptureType = useStore((s) => s.prefs.defaultCaptureType);
    const setPref = useStore((s) => s.setPref);

    // A collection deleted since the preference was set falls back to the
    // Inbox rather than leaving the chooser showing an id that no longer reads.
    const targets = useMemo<ChoiceOption<string>[]>(
        () => [
            { label: 'Inbox', value: INBOX_TARGET },
            ...collections.map((c) => ({ label: c.name, value: c.id })),
        ],
        [collections],
    );
    const target = targets.some((t) => t.value === defaultCollection)
        ? (defaultCollection ?? INBOX_TARGET)
        : INBOX_TARGET;

    return (
        <>
            <SectionLabel first>Startup</SectionLabel>
            <SwitchRow
                desc="Lore starts quietly in the menu bar when you sign in."
                name="launchAtLogin"
                title="Launch at login"
            />
            <SwitchRow
                desc={`Lore stays in the Dock either way; hiding this leaves ${captureShortcutKeys().join('')} and the Dock.`}
                last
                name="menuBarIcon"
                title="Show icon in the menu bar"
            />

            <SectionLabel>Captures</SectionLabel>
            <Row
                desc="Where quick capture files an item unless you pick somewhere else."
                title="File new captures into"
            >
                <Chooser<string>
                    label="File new captures into"
                    onChange={(v) => setPref('defaultCollection', v === INBOX_TARGET ? null : v)}
                    options={targets}
                    value={target}
                />
            </Row>
            <Row desc="Which tab the capture window opens on." last title="Default capture type">
                <Chooser<'auto' | ItemType>
                    label="Default capture type"
                    onChange={(v) => setPref('defaultCaptureType', v)}
                    options={CAPTURE_TYPES}
                    value={defaultCaptureType}
                />
            </Row>
        </>
    );
}

/**
 * The chooser's stand-in for "no collection". `null` cannot be a menu value,
 * and an id is never this string.
 */
const INBOX_TARGET = 'inbox';

export function VaultPane() {
    const workspacePath = useStore((s) => s.workspacePath);
    const openWorkspacePicker = useStore((s) => s.openWorkspacePicker);
    const setStep = useStore((s) => s.setOnboardingStep);
    const exportVault = useStore((s) => s.exportVault);
    const trashVault = useStore((s) => s.trashVault);
    const items = useStore((s) => s.items);
    const pushToast = useStore((s) => s.pushToast);
    const [confirming, setConfirming] = useState(false);
    const size = useVaultSize();

    return (
        <>
            <div className="flex items-start gap-[13px] rounded-xl border border-dashed border-dash px-[18px] py-4">
                <span className="mt-[2px] inline-flex text-text2">
                    <SettingsIcon name="folder" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="text-subhead font-semibold">Local vault — no account</div>
                    <div className="mt-[3px] text-body leading-[1.5] text-text3">
                        Lore runs entirely on this Mac. There is nothing to sign into: the vault is
                        a folder of files you own, and nothing leaves the device.
                    </div>
                    <div className="mt-[10px] truncate font-mono text-body-sm text-text2">
                        {workspacePath ?? 'The default vault, beside Lore’s own data'}
                    </div>
                    <div className="mt-[6px] text-body-sm text-text3">
                        {items.length} {items.length === 1 ? 'item' : 'items'}
                        {size && ` · ${formatBytes(size.content)} of Markdown`}
                        {size && size.derived > 0 && ` · ${formatBytes(size.derived)} of index`}
                    </div>
                </div>
            </div>
            <div className="mt-[14px] flex flex-wrap gap-2">
                <PillButton onClick={() => void openWorkspacePicker()}>
                    Open another folder…
                </PillButton>
                <PillButton
                    onClick={() => {
                        // Back through the onboarding sheet, at its vault picker.
                        setStep('pick');
                        useStore.setState({ onboarded: false, settingsOpen: false });
                    }}
                >
                    Set up a new vault
                </PillButton>
                <PillButton
                    onClick={() => {
                        void revealPath(workspacePath).then((ok) => {
                            if (!ok) pushToast('Could not open the vault in Finder.');
                        });
                    }}
                >
                    Reveal in Finder
                </PillButton>
            </div>

            <SectionLabel>Your data</SectionLabel>
            <Row
                desc="A copy of every note, exactly as it sits on disk. The index is left behind — it rebuilds itself."
                title="Export as Markdown"
            >
                <PillButton onClick={() => void exportVault()}>Choose a folder…</PillButton>
            </Row>
            <Row
                desc="Moves the whole folder to the Trash, where it stays until you empty it. Lore starts over with a new vault."
                last
                title="Delete this vault"
            >
                <PillButton onClick={() => setConfirming(true)} tone="danger">
                    Delete…
                </PillButton>
            </Row>

            {confirming && (
                <ConfirmDelete
                    name={workspacePath ? workspaceName(workspacePath) : 'Lore Vault'}
                    onCancel={() => setConfirming(false)}
                    onConfirm={() => {
                        setConfirming(false);
                        void trashVault();
                    }}
                />
            )}
        </>
    );
}

/**
 * Deleting the vault is the one thing in Settings that cannot be undone from
 * inside Lore, so it asks for the folder's name rather than for a click: the
 * name has to be read off the screen, which is the same act as checking that it
 * is the folder you meant.
 */
function ConfirmDelete({
    name,
    onCancel,
    onConfirm,
}: {
    name: string;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const [typed, setTyped] = useState('');
    const matches = typed.trim() === name;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-6">
            <div
                aria-labelledby="confirm-delete-title"
                aria-modal="true"
                className="w-[min(420px,100%)] rounded-2xl border border-border bg-surface p-5 shadow-sheet"
                role="dialog"
            >
                <div className="text-subhead font-semibold" id="confirm-delete-title">
                    Move “{name}” to the Trash?
                </div>
                <p className="mt-2 mb-0 text-body leading-[1.5] text-text3">
                    Every note in it goes with it. The folder stays in the Trash until you empty it,
                    and Lore will ask you to set up a new vault.
                </p>
                <label className="mt-4 block text-body text-text2">
                    Type <span className="font-mono text-text">{name}</span> to confirm
                    <input
                        autoFocus
                        className="mt-[6px] w-full rounded-lg border border-border bg-surface2 px-[10px] py-[7px] font-[inherit] text-text outline-none focus-visible:border-accent"
                        onChange={(e) => setTyped(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') onCancel();
                            if (e.key === 'Enter' && matches) onConfirm();
                        }}
                        value={typed}
                    />
                </label>
                <div className="mt-4 flex justify-end gap-2">
                    <PillButton onClick={onCancel}>Cancel</PillButton>
                    <PillButton
                        className={cn(!matches && 'cursor-default opacity-45')}
                        disabled={!matches}
                        onClick={onConfirm}
                        tone="danger"
                    >
                        Move to Trash
                    </PillButton>
                </div>
            </div>
        </div>
    );
}

function SwitchRow({
    desc,
    last,
    name,
    title,
}: {
    desc?: string;
    last?: boolean;
    name: keyof Switches;
    title: string;
}) {
    const sw = useSwitch(name);
    return (
        <Row desc={desc} last={last} title={title}>
            <Toggle label={title} on={sw.on} onChange={sw.onChange} />
        </Row>
    );
}

/** Binds a switch key to the store so panes stay declarative. */
function useSwitch(key: keyof Switches) {
    const on = useStore((s) => s.prefs.switches[key]);
    const toggle = useStore((s) => s.toggleSwitch);
    return { on, onChange: () => toggle(key) };
}

/**
 * The vault's weight on disk, or null before the engine has answered — and in
 * the browser preview, where there is no vault to weigh.
 */
function useVaultSize(): null | VaultSize {
    const [size, setSize] = useState<null | VaultSize>(null);
    const items = useStore((s) => s.items);

    useEffect(() => {
        let cancelled = false;
        const repo = getRepository();
        if (!repo.size) return;
        void repo
            .size()
            .then((result) => {
                if (!cancelled) setSize(result);
            })
            .catch(() => {
                if (!cancelled) setSize(null);
            });
        return () => {
            cancelled = true;
        };
        // Re-measured whenever the library changes, so the figure is never a
        // stale one left over from the pane's first open.
    }, [items]);

    return size;
}

const APPEARANCES: { id: Appearance; label: string; swatch: string }[] = [
    { id: 'light', label: 'Light', swatch: '#f4f4f6' },
    { id: 'dark', label: 'Dark', swatch: '#26262d' },
    { id: 'auto', label: 'Auto', swatch: 'linear-gradient(135deg,#f4f4f6 50%,#26262d 50%)' },
];

/** The ids double as their own labels once capitalised, so one map covers both. */
const VIEW_MODES: ViewMode[] = ['list', 'cards', 'table'];
const OPEN_MODES: OpenMode[] = ['drawer', 'page'];
const titleCase = (s: string): string => s[0].toUpperCase() + s.slice(1);

export function LookPane() {
    const appearance = useStore((s) => s.prefs.appearance);
    const setAppearance = useStore((s) => s.setAppearance);
    const accent = useStore((s) => s.prefs.accent);
    const darkTheme = useStore((s) => s.prefs.darkTheme);
    const lightTheme = useStore((s) => s.prefs.lightTheme);
    const setAccent = useStore((s) => s.setAccent);
    const density = useStore((s) => s.prefs.density);
    const textSize = useStore((s) => s.prefs.textSize);
    const setPref = useStore((s) => s.setPref);
    const viewMode = useStore((s) => s.prefs.viewMode);
    const setViewMode = useStore((s) => s.setViewMode);
    const openMode = useStore((s) => s.prefs.openMode);
    const setOpenMode = useStore((s) => s.setOpenMode);
    const counts = useSwitch('counts');
    const statusBar = useSwitch('statusBar');
    const blockEditor = useSwitch('blockEditor');
    const rawMarkdownDefault = useSwitch('rawMarkdownDefault');
    const motion = useSwitch('motion');
    const mode = effectiveTheme(appearance);
    const setTheme = useStore((s) => s.setTheme);
    const themeId = mode === 'dark' ? darkTheme : lightTheme;

    return (
        <>
            <SectionLabel first>Color mode</SectionLabel>
            <div className="mb-1 flex gap-[10px]">
                {APPEARANCES.map((a) => {
                    const active = appearance === a.id;
                    return (
                        <button
                            aria-pressed={active}
                            className={cn(
                                'flex flex-1 flex-col gap-[9px] rounded-xl border-[1.5px] p-[11px] font-[inherit] text-[inherit]',
                                active
                                    ? 'border-accent bg-accent-tint'
                                    : 'border-border bg-transparent',
                            )}
                            key={a.id}
                            onClick={() => setAppearance(a.id)}
                            type="button"
                        >
                            <span
                                className="h-[52px] rounded-lg border border-swatch-border"
                                // The swatch previews the theme itself, so it is a
                                // literal colour rather than a token.
                                style={{ background: a.swatch }}
                            />
                            <span
                                className={cn(
                                    'text-body',
                                    active ? 'font-semibold' : 'font-medium',
                                )}
                            >
                                {a.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            <SectionLabel>Theme style</SectionLabel>
            <div className="mb-1 text-body leading-[1.5] text-text3">
                The colours used throughout Lore. Light and dark keep separate picks.
            </div>
            <div className="mt-[10px] max-h-[300px] overflow-y-auto pr-1">
                <div className="grid grid-cols-4 gap-[10px]">
                    {themesFor(mode).map((t) => {
                        const active = themeId === t.id;
                        return (
                            <button
                                aria-pressed={active}
                                className={cn(
                                    'flex flex-col gap-[7px] rounded-xl border-[1.5px] p-[7px] font-[inherit] text-[inherit]',
                                    active
                                        ? 'border-accent bg-accent-tint'
                                        : 'border-border bg-transparent',
                                )}
                                key={t.id}
                                onClick={() => setTheme(t.id)}
                                type="button"
                            >
                                <ThemePreview theme={t} />
                                <span
                                    className={cn(
                                        'truncate text-caption',
                                        active ? 'font-semibold' : 'font-medium text-text2',
                                    )}
                                >
                                    {t.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <SectionLabel>Accent</SectionLabel>
            <div className="mb-1 flex items-center gap-[10px]">
                {ACCENTS.map((hex) => {
                    const active = accent === hex;
                    return (
                        <button
                            aria-label={ACCENT_NAMES[hex]}
                            aria-pressed={active}
                            className="flex h-7 w-7 flex-none items-center justify-center rounded-full border-[1.5px] bg-transparent p-0 shadow-[inset_0_0_0_2px_var(--surface)]"
                            key={hex}
                            onClick={() => setAccent(hex as Accent)}
                            // The ring and the dot are the accent being offered,
                            // so both are literal colours.
                            style={{ borderColor: active ? hex : 'transparent' }}
                            type="button"
                        >
                            <span className="h-5 w-5 rounded-full" style={{ background: hex }} />
                        </button>
                    );
                })}
                <span className="ml-1 text-body text-text3">{ACCENT_NAMES[accent]}</span>
            </div>

            <SectionLabel>Library</SectionLabel>
            <Row desc="Also switchable from the list header." title="Item layout">
                <Segmented<string>
                    onChange={(v) => setViewMode(v.toLowerCase() as ViewMode)}
                    options={VIEW_MODES.map(titleCase)}
                    value={titleCase(viewMode)}
                />
            </Row>
            <Row
                desc="Cards and Table have no detail column, so an item opens over or instead of them."
                title="Open items in"
            >
                <Segmented<string>
                    onChange={(v) => setOpenMode(v.toLowerCase() as OpenMode)}
                    options={OPEN_MODES.map(titleCase)}
                    value={titleCase(openMode)}
                />
            </Row>

            <SectionLabel>Density &amp; text</SectionLabel>
            <Row desc="Compact hides the tag row until hover." title="List density">
                <Segmented<Density>
                    onChange={(v) => setPref('density', v)}
                    options={['Cozy', 'Compact', 'Roomy']}
                    value={density}
                />
            </Row>
            <Row title="Text size">
                <div className="flex flex-none items-center gap-[10px]">
                    <span className="text-caption text-text3">A</span>
                    <input
                        aria-label="Text size"
                        className="w-[120px] accent-accent"
                        max={1.2}
                        min={0.9}
                        onChange={(e) => setPref('textSize', Number(e.target.value))}
                        step={0.05}
                        type="range"
                        value={textSize}
                    />
                    <span className="text-[16px] text-text3">A</span>
                </div>
            </Row>
            <Row title="Show counts in the sidebar">
                <Toggle
                    label="Show counts in the sidebar"
                    on={counts.on}
                    onChange={counts.onChange}
                />
            </Row>
            <Row
                desc="Vault, version and Git along the bottom of the window."
                title="Show the status bar"
            >
                <Toggle
                    label="Show the status bar"
                    on={statusBar.on}
                    onChange={statusBar.onChange}
                />
            </Row>
            <Row desc="The capture balloon appears without the spring." title="Reduce motion">
                <Toggle label="Reduce motion" on={motion.on} onChange={motion.onChange} />
            </Row>

            <SectionLabel>Editing</SectionLabel>
            <Row
                desc="Notes open in a formatted editor. Type / for headings, lists, quotes and more."
                title="Block editor for notes"
            >
                <Toggle
                    label="Block editor for notes"
                    on={blockEditor.on}
                    onChange={blockEditor.onChange}
                />
            </Row>
            <Row
                desc="Start in the raw text instead of the formatted view."
                last
                title="Open notes in Markdown"
            >
                <Toggle
                    label="Open notes in Markdown"
                    on={rawMarkdownDefault.on}
                    onChange={rawMarkdownDefault.onChange}
                />
            </Row>
        </>
    );
}

/**
 * Only chords that actually fire. The main-window and view rows are the menu
 * bar's accelerators in `app_menu.rs`; ⌥⇧F and Escape are `App.tsx`'s, and the
 * global row is the one shortcut Rust registers. Shortcuts are not rebindable
 * yet, so nothing here claims to be.
 */
const SHORTCUT_GROUPS = [
    {
        name: 'Global',
        rows: [{ keys: captureShortcutKeys(), label: 'Quick capture, from any app' }],
    },
    {
        name: 'Main window',
        rows: [
            { keys: ['⌘', 'K'], label: 'Search everything' },
            { keys: ['⌘', 'N'], label: 'Capture drawer' },
            { keys: ['⌥', '⇧', 'F'], label: 'Start or pause a focus session' },
            { keys: ['⌘', 'B'], label: 'Toggle the sidebar' },
            { keys: ['⌘', 'L'], label: 'Toggle the properties panel' },
            { keys: ['⌘', ','], label: 'Open Settings' },
            { keys: ['esc'], label: 'Close the capture drawer or the open item' },
        ],
    },
    {
        name: 'Views',
        rows: [
            { keys: ['⌘', '1'], label: 'All Items' },
            { keys: ['⌘', '2'], label: 'Inbox' },
            { keys: ['⌘', '3'], label: 'Today' },
            { keys: ['⌘', '4'], label: 'Starred' },
            { keys: ['⌘', '5'], label: 'Calendar' },
        ],
    },
    {
        name: 'Capture window',
        rows: [
            { keys: ['⏎'], label: 'Save' },
            { keys: ['esc'], label: 'Dismiss' },
        ],
    },
];

export function CapturePane() {
    return (
        <>
            <p className="mt-0 mb-4 text-body leading-[1.5] text-text3">
                Lore&rsquo;s AI runs on this Mac, against a placeholder model — no key, no account,
                nothing sent anywhere. Tag suggestions and duplicate detection land when it is
                replaced with the real one.
            </p>

            <SectionLabel first>Automatic work</SectionLabel>
            <SwitchRow
                desc="A short abstract plus key points, shown on the item after it lands."
                last
                name="autoSum"
                title="Summarize what I save"
            />
        </>
    );
}

export function KeysPane() {
    const [filter, setFilter] = useState('');

    const groups = useMemo(() => {
        const query = filter.trim().toLowerCase();
        if (!query) return SHORTCUT_GROUPS;
        return SHORTCUT_GROUPS.map((g) => ({
            ...g,
            rows: g.rows.filter(
                (r) =>
                    r.label.toLowerCase().includes(query) ||
                    r.keys.join('').toLowerCase().includes(query),
            ),
        })).filter((g) => g.rows.length > 0);
    }, [filter]);

    return (
        <>
            <label className="mb-5 flex items-center gap-2 rounded-lg bg-surface3 px-[10px] py-[7px] text-body text-text3">
                <SettingsIcon name="search" size={14} sw={1.9} />
                <input
                    className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-text outline-none"
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filter shortcuts"
                    value={filter}
                />
            </label>

            {groups.map((g) => (
                <div className="mb-[22px]" key={g.name}>
                    <SectionLabel first>{g.name}</SectionLabel>
                    {g.rows.map((r, i) => (
                        <div
                            className={cn(
                                'flex items-center gap-4 border-b border-border-soft py-[9px]',
                                i === g.rows.length - 1 && 'border-b-0',
                            )}
                            key={`${g.name}:${r.label}`}
                        >
                            <span className="min-w-0 flex-1 text-body-lg">{r.label}</span>
                            <span className="flex flex-none gap-1">
                                {r.keys.map((k, ki) => (
                                    <KeyCap key={ki}>{k}</KeyCap>
                                ))}
                            </span>
                        </div>
                    ))}
                </div>
            ))}
            {groups.length === 0 && (
                <div className="text-body text-text3">No shortcut matches “{filter}”.</div>
            )}
        </>
    );
}

export function NotifPane() {
    const notifStyle = useStore((s) => s.prefs.notifStyle);
    const setPref = useStore((s) => s.setPref);
    const sounds = useSwitch('sounds');

    return (
        <>
            <p className="mt-0 mb-4 text-body leading-[1.5] text-text3">
                The focus timer is the only thing that notifies you today. Due-date reminders and
                the weekly digest arrive with the features behind them.
            </p>

            <SectionLabel first>Send me</SectionLabel>
            <SwitchRow
                desc="When a focus interval or a break runs out."
                last
                name="focusEnd"
                title="Focus session end"
            />

            <SectionLabel>Delivery</SectionLabel>
            <Row desc="An alert stays on screen until dismissed." title="Style">
                <Segmented<NotificationStyle>
                    onChange={(v) => setPref('notifStyle', v)}
                    options={['Banner', 'Alert']}
                    value={notifStyle}
                />
            </Row>
            <Row title="Play a sound">
                <Toggle label="Play a sound" on={sounds.on} onChange={sounds.onChange} />
            </Row>
            <SwitchRow
                desc="22:00 – 07:30 · nothing gets through."
                last
                name="quiet"
                title="Quiet hours"
            />
        </>
    );
}

/** How many focus intervals precede the long break. */
const LONG_BREAK_OPTIONS: ChoiceOption<number>[] = [2, 3, 4, 5].map((n) => ({
    label: `${n} sessions`,
    value: n,
}));

const DURATION_LABELS = [
    { key: 'focus', label: 'Focus' },
    { key: 'short', label: 'Short break' },
    { key: 'long', label: 'Long break' },
] as const;

export function CalendarPane() {
    const weekStart = useStore((s) => s.prefs.weekStart);
    const setPref = useStore((s) => s.setPref);

    return (
        <>
            <p className="mt-0 mb-4 text-body leading-[1.5] text-text3">
                The calendar draws what Lore already knows about: tasks you gave a due date, and
                focus sessions you ran. Connecting an outside calendar is not built yet.
            </p>

            <SectionLabel first>In the calendar view</SectionLabel>
            <SwitchRow
                desc="Tasks with due dates appear as all-day chips."
                name="showTasks"
                title="Show captured tasks"
            />
            <SwitchRow name="showFocus" title="Show focus sessions" />
            <Row last title="Week starts on">
                <Chooser<WeekStart>
                    label="Week starts on"
                    onChange={(v) => setPref('weekStart', v)}
                    options={[
                        { label: 'Monday', value: 'Monday' },
                        { label: 'Sunday', value: 'Sunday' },
                    ]}
                    value={weekStart}
                />
            </Row>
        </>
    );
}

export function FocusPane() {
    const durations = useStore((s) => s.prefs.durations);
    const bump = useStore((s) => s.bumpDuration);
    const longBreakAfter = useStore((s) => s.prefs.longBreakAfter);
    const setPref = useStore((s) => s.setPref);

    return (
        <>
            <p className="mt-0 mb-4 text-body leading-[1.5] text-text3">
                The timer itself lives in the menu bar. These are its defaults.
            </p>

            <div className="flex gap-[10px]">
                {DURATION_LABELS.map((d) => (
                    <div
                        className="flex-1 rounded-xl border border-border px-[14px] py-[13px]"
                        key={d.key}
                    >
                        <div className="text-body text-text3">{d.label}</div>
                        <div className="mt-[6px] flex items-center justify-between">
                            <span className="text-[24px] font-[620] tabular-nums">
                                {durations[d.key]}
                                <span className="ml-1 text-body-sm font-medium text-text3">
                                    min
                                </span>
                            </span>
                            <span className="flex flex-col gap-[2px]">
                                <StepButton
                                    label={`Increase ${d.label}`}
                                    onClick={() => bump(d.key, 1)}
                                    up
                                />
                                <StepButton
                                    label={`Decrease ${d.label}`}
                                    onClick={() => bump(d.key, -1)}
                                />
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <SectionLabel>During a session</SectionLabel>
            <SwitchRow
                desc="A break begins the moment a focus interval ends."
                name="autoBreak"
                title="Start breaks automatically"
            />
            <Row desc="Then the long one, instead of another short break." title="Long break after">
                <Chooser<number>
                    label="Long break after"
                    onChange={(v) => setPref('longBreakAfter', v)}
                    options={LONG_BREAK_OPTIONS}
                    value={longBreakAfter}
                />
            </Row>
            <SwitchRow
                desc="One note a day, with what you worked on and what you captured."
                last
                name="logFocus"
                title="Log sessions to my knowledge base"
            />
        </>
    );
}

function StepButton({ label, onClick, up }: { label: string; onClick: () => void; up?: boolean }) {
    return (
        <button
            aria-label={label}
            className={cn(PILL_BUTTON, 'px-[6px] py-[2px]')}
            onClick={onClick}
            type="button"
        >
            <SettingsIcon name={up ? 'chevronUp' : 'chevronDown'} size={11} sw={2.6} />
        </button>
    );
}

const ABOUT_LINKS: { href: string; label: string }[] = [
    { href: APP_LINKS.readme, label: 'Source on GitHub' },
    { href: APP_LINKS.releaseNotes, label: 'Release notes' },
    { href: APP_LINKS.issues, label: 'Report an issue' },
];

export function AboutPane() {
    const items = useStore((s) => s.items);
    const workspacePath = useStore((s) => s.workspacePath);

    const meta = [
        // Which Lore this is, and the vault it opened — the pair that settles
        // "am I looking at the instance I think I am".
        { k: 'Build', v: `${APP_MODE.productName} · ${APP_MODE.mode}` },
        { k: 'Vault', v: `${workspacePath ?? 'The default vault'} · ${items.length} items` },
        { k: 'Format', v: 'Markdown files with YAML frontmatter' },
        { k: 'Account', v: 'None — Lore never asks for one' },
        { k: 'Telemetry', v: 'None' },
        { k: 'Built with', v: 'Tauri 2 · React 19 · TypeScript' },
    ];

    return (
        <>
            <div className="pt-2 pb-[22px] text-center">
                <span className="inline-flex text-text">
                    <LoreMark color={APP_MODE.accent ?? undefined} size={58} />
                </span>
                <div className="mt-3 text-[17px] font-[660]">{APP_MODE.productName}</div>
                <div className="mt-[3px] text-body text-text3">Version {APP_VERSION}</div>
                <p className="mx-auto mt-4 mb-0 max-w-[420px] text-body leading-[1.6] text-text2">
                    Lore is a solo project, built in the open. It keeps your library on your own
                    machine as plain Markdown files &mdash; no account, no sync service, no
                    telemetry.
                </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 border-b border-border-soft pb-[22px]">
                {ABOUT_LINKS.map((l) => (
                    <button
                        className={ABOUT_LINK}
                        key={l.label}
                        onClick={() => void openExternal(l.href)}
                        type="button"
                    >
                        {l.label}
                    </button>
                ))}
            </div>

            <div className="pt-2">
                {meta.map((m) => (
                    <div
                        className="flex gap-4 border-b border-border-soft py-[9px] text-body"
                        key={m.k}
                    >
                        <span className="w-[130px] flex-none text-text3">{m.k}</span>
                        <span className="min-w-0 flex-1">{m.v}</span>
                    </div>
                ))}
            </div>
        </>
    );
}
