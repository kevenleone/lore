// The ten settings panes from `Lore Settings.dc.html`. Controls backed by real
// app state (accent, appearance, density, AI location, the switch set) write
// through the store and persist; the rest render the design's copy against
// placeholder figures until there is a backend to read them from.

import type { Appearance } from '../../theme/tokens';

import { cn } from '../../lib/cn';
import {
    type Accent,
    ACCENT_NAMES,
    ACCENTS,
    type AiMode,
    type Density,
    type NotificationStyle,
    type OpenMode,
    type Switches,
    type ViewMode,
    type WeekStart,
} from '../../store/types';
import { useStore } from '../../store/useStore';
import { LoreMark } from '../common/LoreMark';
import { SettingsIcon, type SettingsIconName } from '../common/settingsGlyphs';
import { CALENDAR_ACCOUNTS } from './calendarAccounts';
import {
    Chooser,
    KeyCap,
    PILL_BUTTON,
    PillButton,
    Row,
    SectionLabel,
    Segmented,
    Toggle,
} from './controls';

/** Card-shaped radio (appearance swatches, AI location). */
const CHOICE_CARD =
    'flex cursor-pointer gap-3 rounded-xl bg-transparent px-[14px] py-[13px] text-left font-[inherit] hover:bg-hover';

/** The About pane's link list. */
const ABOUT_LINK =
    'text-body cursor-pointer rounded-lg border border-border bg-surface px-[10px] py-[6px] font-[inherit] text-text2 hover:bg-hover hover:text-text';

/** The bordered cards the Account and Storage panes are built from. */
const CARD = 'rounded-xl border border-border px-4 py-[14px]';

export function GeneralPane() {
    const collections = useStore((s) => s.collections);
    const clip = useSwitch('clip');

    // "File new captures into" offers Inbox plus every real collection.
    const targets = ['Inbox', ...collections.map((c) => c.name)];

    return (
        <>
            <SectionLabel first>Startup</SectionLabel>
            <SwitchRow
                desc="Lore starts quietly in the menu bar when you sign in."
                name="launch"
                title="Launch at login"
            />
            <SwitchRow
                desc="Hiding it leaves ⌥Space as the only way in."
                name="menubar"
                title="Show icon in the menu bar"
            />
            <SwitchRow last name="dock" title="Show icon in the Dock" />

            <SectionLabel>Defaults</SectionLabel>
            <Row
                desc="Used when the AI can't confidently pick a collection."
                title="File new captures into"
            >
                <Chooser options={targets} value={targets[0]} />
            </Row>
            <Row title="Default capture type">
                <Chooser
                    options={['Detect automatically', 'Link', 'Note', 'Task', 'Code']}
                    value="Detect automatically"
                />
            </Row>
            <Row
                desc="Lore reads a copied link to prefill the field."
                last
                title="Keep the clipboard after capture"
            >
                <Toggle
                    label="Keep the clipboard after capture"
                    on={clip.on}
                    onChange={clip.onChange}
                />
            </Row>

            <SectionLabel>Storage</SectionLabel>
            <StorageMeter />
            <div className="mt-[14px] flex gap-2">
                <PillButton>Reveal library in Finder</PillButton>
                <PillButton>Clear snapshot cache</PillButton>
            </div>
        </>
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

/* ------------------------------------------------------------------ *
 * General
 * ------------------------------------------------------------------ */

/** Binds a switch key to the store so panes stay declarative. */
function useSwitch(key: keyof Switches) {
    const on = useStore((s) => s.prefs.switches[key]);
    const toggle = useStore((s) => s.toggleSwitch);
    return { on, onChange: () => toggle(key) };
}

const STORAGE_SEGMENTS = [
    { color: 'var(--ac)', label: 'Files', share: 0.51, size: '940 MB' },
    { color: '#8a92b8', label: 'Page snapshots', share: 0.3, size: '560 MB' },
    { color: '#c9c9d2', label: 'Search index', share: 0.19, size: '340 MB' },
];

export function AccountPane() {
    const auth = useStore((s) => s.auth);
    const signOut = useStore((s) => s.signOut);
    const setStep = useStore((s) => s.setOnboardingStep);
    const touchid = useSwitch('touchid');

    // Anonymous installs get the upgrade path instead of an account card.
    if (auth.mode !== 'account') {
        return (
            <>
                <div className="flex items-start gap-[13px] rounded-xl border border-dashed border-dash px-[18px] py-4">
                    <span className="mt-[2px] inline-flex text-text2">
                        <SettingsIcon name="lock" size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="text-subhead font-semibold">Local vault — no account</div>
                        <div className="mt-[3px] text-body leading-[1.5] text-text3">
                            Signing in uploads this vault once. Nothing is re-entered, and
                            everything you have captured so far comes with you.
                        </div>
                    </div>
                </div>
                <div className="mt-[14px]">
                    <PillButton
                        className="border-accent bg-accent text-white"
                        onClick={() => {
                            // Send the user back through the onboarding sheet's sign-in lane.
                            setStep('signin');
                            useStore.setState({ onboarded: false, settingsOpen: false });
                        }}
                    >
                        Sign in and sync this vault
                    </PillButton>
                </div>

                <SectionLabel>Security</SectionLabel>
                <Row
                    desc="Applies after five minutes of inactivity."
                    title="Require Touch ID to open Lore"
                >
                    <Toggle label="Require Touch ID" on={touchid.on} onChange={touchid.onChange} />
                </Row>

                <SectionLabel>Your data</SectionLabel>
                <div className="mt-2 flex gap-2">
                    <PillButton>Export everything as Markdown</PillButton>
                    <PillButton tone="danger">Delete local vault</PillButton>
                </div>
            </>
        );
    }

    const email = auth.email ?? 'rowan@shaw.studio';
    const name = auth.name ?? 'Rowan Shaw';
    const initials = name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <>
            <div className={cn(CARD, 'flex items-center gap-[14px]')}>
                <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-accent text-title-lg font-[640] text-white">
                    {initials}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="text-title font-[640]">{name}</div>
                    <div className="mt-px text-body text-text3">{email}</div>
                </div>
                <PillButton onClick={signOut}>Sign out</PillButton>
            </div>

            <div className={cn(CARD, 'mt-[10px] flex items-center gap-[14px]')}>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-subhead font-[640]">Lore Pro</span>
                        <span className="rounded-md bg-type-task-bg px-[7px] py-[2px] text-caption font-semibold text-type-task-fg">
                            Active
                        </span>
                    </div>
                    <div className="mt-[3px] text-body text-text3">
                        $8/month · renews 14 October 2026 · unlimited AI summaries, 5 devices
                    </div>
                </div>
                <PillButton>Change plan</PillButton>
            </div>

            <SectionLabel>Security</SectionLabel>
            <Row
                desc="Applies after five minutes of inactivity."
                title="Require Touch ID to open Lore"
            >
                <Toggle label="Require Touch ID" on={touchid.on} onChange={touchid.onChange} />
            </Row>
            <Row last title="Two-factor authentication">
                <PillButton>
                    <SettingsIcon name="check" size={13} sw={2.4} />
                    On · authenticator app
                </PillButton>
            </Row>

            <SectionLabel>Your data</SectionLabel>
            <div className="mt-2 flex gap-2">
                <PillButton>Export everything as Markdown</PillButton>
                <PillButton tone="danger">Delete account</PillButton>
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ *
 * Account
 * ------------------------------------------------------------------ */

function StorageMeter() {
    return (
        <div className={cn(CARD, 'mt-2')}>
            <div className="flex items-baseline justify-between">
                <span className="text-subhead font-semibold">Local library</span>
                <span className="text-body text-text3">1.84 GB of 5 GB</span>
            </div>
            <div className="my-[10px] flex h-2 gap-[2px] overflow-hidden rounded-5 bg-surface3">
                {STORAGE_SEGMENTS.map((s) => (
                    // Each segment's colour and share are data, not design.
                    <span key={s.label} style={{ background: s.color, flex: s.share }} />
                ))}
            </div>
            <div className="flex flex-wrap gap-4">
                {STORAGE_SEGMENTS.map((s) => (
                    <span
                        className="inline-flex items-center gap-[6px] text-body-sm text-text3"
                        key={s.label}
                    >
                        <span
                            className="h-2 w-2 flex-none rounded-[3px]"
                            style={{ background: s.color }}
                        />
                        {s.label} {s.size}
                    </span>
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ *
 * Look & Feel
 * ------------------------------------------------------------------ */

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
    const setAccent = useStore((s) => s.setAccent);
    const density = useStore((s) => s.prefs.density);
    const textSize = useStore((s) => s.prefs.textSize);
    const setPref = useStore((s) => s.setPref);
    const viewMode = useStore((s) => s.prefs.viewMode);
    const setViewMode = useStore((s) => s.setViewMode);
    const openMode = useStore((s) => s.prefs.openMode);
    const setOpenMode = useStore((s) => s.setOpenMode);
    const counts = useSwitch('counts');
    const motion = useSwitch('motion');

    return (
        <>
            <SectionLabel first>Appearance</SectionLabel>
            <div className="mb-1 flex gap-[10px]">
                {APPEARANCES.map((a) => {
                    const active = appearance === a.id;
                    return (
                        <button
                            aria-pressed={active}
                            className={cn(
                                'flex flex-1 cursor-pointer flex-col gap-[9px] rounded-xl border-[1.5px] p-[11px] font-[inherit] text-[inherit]',
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

            <SectionLabel>Accent</SectionLabel>
            <div className="mb-1 flex items-center gap-[10px]">
                {ACCENTS.map((hex) => {
                    const active = accent === hex;
                    return (
                        <button
                            aria-label={ACCENT_NAMES[hex]}
                            aria-pressed={active}
                            className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-full border-[1.5px] bg-transparent p-0 shadow-[inset_0_0_0_2px_var(--surface)]"
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
            <Row desc="The capture balloon appears without the spring." last title="Reduce motion">
                <Toggle label="Reduce motion" on={motion.on} onChange={motion.onChange} />
            </Row>
        </>
    );
}

/* ------------------------------------------------------------------ *
 * Keyboard shortcuts
 * ------------------------------------------------------------------ */

const SHORTCUT_GROUPS = [
    {
        name: 'Global',
        rows: [
            { keys: ['⌥', 'Space'], label: 'Quick capture (from any app)' },
            { keys: ['⌥', '⇧', 'C'], label: 'Capture the current browser tab' },
            { keys: ['⌥', '⇧', 'S'], label: 'Capture selected text' },
            { keys: ['⌥', '⇧', 'F'], label: 'Start or pause a focus session' },
            { keys: ['⌥', '⇧', 'L'], label: 'Open the knowledge base' },
        ],
    },
    {
        name: 'Capture window',
        rows: [
            { keys: ['⏎'], label: 'Save' },
            { keys: ['⌘', '⏎'], label: 'Save and keep going' },
            { keys: ['⇥'], label: 'Cycle capture type' },
            { keys: ['#'], label: 'Add a tag' },
            { keys: ['⌘', 'L'], label: 'Pick a collection' },
            { keys: ['esc'], label: 'Dismiss' },
        ],
    },
    {
        name: 'Knowledge base',
        rows: [
            { keys: ['⌘', 'K'], label: 'Search everything' },
            { keys: ['⌘', 'J'], label: 'Ask Lore' },
            { keys: ['⌘', '⌥', 'S'], label: 'Toggle the sidebar' },
            { keys: ['⌘', '⌥', 'I'], label: 'Toggle the properties panel' },
            { keys: ['⌘', 'D'], label: 'Flag item' },
            { keys: ['⌘', '⇧', 'C'], label: 'Share' },
            { keys: ['↑', '↓'], label: 'Next / previous item' },
            { keys: ['⌘', '3'], label: 'Calendar view' },
            { keys: ['⌘', 'N'], label: 'Capture drawer' },
        ],
    },
];

export function KeysPane() {
    return (
        <>
            <div className="mb-5 flex items-center gap-[10px]">
                <div className="flex flex-1 items-center gap-2 rounded-lg bg-surface3 px-[10px] py-[7px] text-body text-text3">
                    <SettingsIcon name="search" size={14} sw={1.9} />
                    <span>Filter shortcuts</span>
                </div>
                <PillButton>Restore defaults</PillButton>
            </div>

            {SHORTCUT_GROUPS.map((g) => (
                <div className="mb-[22px]" key={g.name}>
                    <SectionLabel first>{g.name}</SectionLabel>
                    {g.rows.map((r, i) => (
                        <div
                            className={cn(
                                'flex items-center gap-4 border-b border-border-soft py-[9px]',
                                i === g.rows.length - 1 && 'border-b-0',
                            )}
                            key={r.label}
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
        </>
    );
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

export function NotifPane() {
    const digest = useSwitch('digest');
    const notifStyle = useStore((s) => s.prefs.notifStyle);
    const setPref = useStore((s) => s.setPref);
    const sounds = useSwitch('sounds');

    return (
        <>
            <SectionLabel first>Send me</SectionLabel>
            <Row desc="Three things worth revisiting, chosen by the AI." title="Weekly digest">
                <Chooser options={['Mondays, 08:00']} value="Mondays, 08:00" />
                <Toggle label="Weekly digest" on={digest.on} onChange={digest.onChange} />
            </Row>
            <SwitchRow
                desc="Due-date alerts for captured tasks."
                name="dueTasks"
                title="Task reminders"
            />
            <SwitchRow name="focusEnd" title="Focus session end" />
            <SwitchRow
                desc="Only when something needs your attention."
                last
                name="syncErr"
                title="Sync problems"
            />

            <SectionLabel>Delivery</SectionLabel>
            <Row title="Style">
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
                desc="22:00 – 07:30 · nothing but sync problems gets through."
                last
                name="quiet"
                title="Quiet hours"
            />
        </>
    );
}

/* ------------------------------------------------------------------ *
 * Capture & AI
 * ------------------------------------------------------------------ */

const AI_MODES: { desc: string; id: AiMode; label: string }[] = [
    {
        desc: 'Fastest and most accurate. Text is sent for processing and never retained.',
        id: 'cloud',
        label: 'Lore Cloud',
    },
    {
        desc: 'Runs a small local model. Slower, works offline, nothing leaves the machine.',
        id: 'local',
        label: 'On this Mac',
    },
];

export function CapturePane() {
    const aiMode = useStore((s) => s.prefs.aiMode);
    const setPref = useStore((s) => s.setPref);

    return (
        <>
            <SectionLabel first>Automatic work</SectionLabel>
            <SwitchRow
                desc="A short abstract plus key points, written after the item lands."
                name="autoSum"
                title="Summarize what I save"
            />
            <SwitchRow
                desc="Suggestions stay dashed until you accept them."
                name="autoTag"
                title="Suggest tags"
            />
            <SwitchRow name="preview" title="Fetch link previews and snapshots" />
            <SwitchRow last name="dupe" title="Warn me about duplicates" />

            <SectionLabel>Where the AI runs</SectionLabel>
            <div className="mt-2 flex flex-col gap-2">
                {AI_MODES.map((m) => {
                    const active = aiMode === m.id;
                    return (
                        <button
                            aria-pressed={active}
                            className={cn(
                                CHOICE_CARD,
                                'items-start border-[1.5px] text-[inherit]',
                                active
                                    ? 'border-accent bg-accent-tint'
                                    : 'border-border bg-transparent',
                            )}
                            key={m.id}
                            onClick={() => setPref('aiMode', m.id)}
                            type="button"
                        >
                            <span
                                className={cn(
                                    'mt-px flex h-[17px] w-[17px] flex-none items-center justify-center rounded-full border-[1.5px]',
                                    active ? 'border-accent' : 'border-dash',
                                )}
                            >
                                <span
                                    className={cn(
                                        'h-[9px] w-[9px] rounded-full',
                                        active ? 'bg-accent' : 'bg-transparent',
                                    )}
                                />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-subhead font-semibold">{m.label}</span>
                                <span className="mt-[2px] block text-body leading-[1.5] text-text3">
                                    {m.desc}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="mt-2">
                <Row desc="Unlimited on Pro." last title="Summaries used this month">
                    <span className="text-subhead font-[640] tabular-nums">412</span>
                </Row>
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ *
 * Sync
 * ------------------------------------------------------------------ */

const DEVICES: { icon: SettingsIconName; meta: string; name: string; on: boolean; tag: string }[] =
    [
        {
            icon: 'laptop',
            meta: 'This Mac · macOS 15.4 · synced just now',
            name: 'Rowan’s MacBook Pro',
            on: true,
            tag: 'Current',
        },
        {
            icon: 'phone',
            meta: 'Lore 2.4.1 · synced 12 minutes ago',
            name: 'iPhone 16 Pro',
            on: false,
            tag: 'Active',
        },
        {
            icon: 'globe',
            meta: 'Web session · signed in 3 days ago',
            name: 'lore.app on Safari',
            on: false,
            tag: 'Sign out',
        },
    ];

export function SyncPane() {
    const items = useStore((s) => s.items);
    const anonymous = useStore((s) => s.auth.mode !== 'account');
    const e2e = useSwitch('e2e');
    const wifi = useSwitch('wifi');

    if (anonymous) {
        return (
            <div className="flex items-start gap-[13px] rounded-xl border border-dashed border-dash px-[18px] py-4">
                <span className="mt-[2px] inline-flex text-text2">
                    <SettingsIcon name="noSync" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="text-subhead font-semibold">Sync is off</div>
                    <div className="mt-[3px] text-body leading-[1.5] text-text3">
                        This vault lives only on this Mac. Sign in from the Account pane to sync it
                        to web and mobile — the {items.length} item{items.length === 1 ? '' : 's'}{' '}
                        you already have upload once and nothing is re-entered.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={cn(CARD, 'flex items-center gap-[13px]')}>
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-type-task-bg text-type-task-fg">
                    <SettingsIcon name="check" size={16} sw={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="text-subhead font-[640]">Everything is synced</div>
                    <div className="mt-px text-body text-text3">
                        Last checked 40 seconds ago · {items.length} items
                    </div>
                </div>
                <PillButton>Sync now</PillButton>
            </div>

            <SectionLabel>Devices</SectionLabel>
            {DEVICES.map((d) => (
                <div
                    className="flex items-center gap-3 border-b border-border-soft py-[11px]"
                    key={d.name}
                >
                    <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg bg-surface3 text-text2">
                        <SettingsIcon name={d.icon} size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="text-body-lg font-semibold">{d.name}</div>
                        <div className="mt-px text-body-sm text-text3">{d.meta}</div>
                    </div>
                    <span
                        className={cn(
                            'flex-none rounded-7 px-[9px] py-[3px] text-body-sm',
                            d.on ? 'bg-type-task-bg text-type-task-fg' : 'bg-surface3 text-text3',
                        )}
                    >
                        {d.tag}
                    </span>
                </div>
            ))}

            <SectionLabel>Options</SectionLabel>
            <Row
                desc="Summaries are generated before upload, so search still works."
                title="End-to-end encryption"
            >
                <Toggle label="End-to-end encryption" on={e2e.on} onChange={e2e.onChange} />
            </Row>
            <Row last title="Sync files on Wi-Fi only">
                <Toggle label="Sync files on Wi-Fi only" on={wifi.on} onChange={wifi.onChange} />
            </Row>
        </>
    );
}

/* ------------------------------------------------------------------ *
 * Focus & Timer
 * ------------------------------------------------------------------ */

const DURATION_LABELS = [
    { key: 'focus', label: 'Focus' },
    { key: 'short', label: 'Short break' },
    { key: 'long', label: 'Long break' },
] as const;

export function CalendarPane() {
    const switches = useStore((s) => s.prefs.switches);
    const toggle = useStore((s) => s.toggleSwitch);
    const weekStart = useStore((s) => s.prefs.weekStart);
    const setPref = useStore((s) => s.setPref);

    return (
        <>
            <SectionLabel first>Connected calendars</SectionLabel>
            {CALENDAR_ACCOUNTS.map((c) => (
                <div
                    className="flex items-center gap-3 border-b border-border-soft py-[11px]"
                    key={c.key}
                >
                    <span
                        className="h-[10px] w-[10px] flex-none rounded-[3px]"
                        // The calendar's own colour, as the provider reports it.
                        style={{ background: c.color }}
                    />
                    <div className="min-w-0 flex-1">
                        <div className="text-body-lg font-semibold">{c.name}</div>
                        <div className="mt-px text-body-sm text-text3">{c.meta}</div>
                    </div>
                    <Toggle label={c.name} on={switches[c.key]} onChange={() => toggle(c.key)} />
                </div>
            ))}
            <div className="mt-3">
                <PillButton>
                    <SettingsIcon name="plus" size={13} sw={2.2} />
                    Add a calendar account
                </PillButton>
            </div>

            <SectionLabel>In the calendar view</SectionLabel>
            <SwitchRow
                desc="Tasks with due dates appear as all-day chips."
                name="showTasks"
                title="Show captured tasks alongside events"
            />
            <SwitchRow name="showFocus" title="Show focus sessions" />
            <Row title="Week starts on">
                <Chooser<WeekStart>
                    onChange={(v) => setPref('weekStart', v)}
                    options={['Monday', 'Sunday']}
                    value={weekStart}
                />
            </Row>
            <SwitchRow
                desc="Notes captured during an event get filed to it."
                last
                name="attachNotes"
                title="Attach meeting notes automatically"
            />
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
                desc="Quick capture still works — nothing interrupts you."
                name="dnd"
                title="Turn on Do Not Disturb"
            />
            <SwitchRow name="autoBreak" title="Start breaks automatically" />
            <SwitchRow name="chime" title="Chime at the end of each interval" />
            <Row title="Long break after">
                <Chooser
                    onChange={(v) => setPref('longBreakAfter', parseInt(String(v), 10))}
                    options={['2 sessions', '3 sessions', '4 sessions', '5 sessions']}
                    value={`${longBreakAfter} sessions`}
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

/* ------------------------------------------------------------------ *
 * Calendar
 * ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ *
 * About
 * ------------------------------------------------------------------ */

const ABOUT_LINKS = [
    'Release notes',
    'Keyboard cheat sheet',
    'Privacy policy',
    'Contact support',
    'Acknowledgements',
];

export function AboutPane() {
    const items = useStore((s) => s.items);
    const auth = useStore((s) => s.auth);
    const aiMode = useStore((s) => s.prefs.aiMode);

    const meta = [
        { k: 'Library', v: `~/Library/Lore · ${items.length} items` },
        {
            k: 'Sync account',
            v: auth.mode === 'account' ? (auth.email ?? '—') : 'Local vault (no account)',
        },
        {
            k: 'Local model',
            v: aiMode === 'local' ? 'lore-summarize-3b (1.9 GB)' : 'Not downloaded',
        },
        { k: 'Licence', v: auth.mode === 'account' ? 'Pro · seat 1 of 1' : 'Free · local only' },
    ];

    return (
        <>
            <div className="pt-2 pb-[22px] text-center">
                <span className="inline-flex text-text">
                    <LoreMark size={58} />
                </span>
                <div className="mt-3 text-[17px] font-[660]">Lore</div>
                <div className="mt-[3px] text-body text-text3">
                    Version 2.4.1 (build 2418) · Apple silicon
                </div>
                <div className="mt-[10px] inline-flex items-center gap-[6px] rounded-lg bg-type-task-bg px-[10px] py-1 text-body text-type-task-fg">
                    <SettingsIcon name="check" size={13} sw={2.4} />
                    You&rsquo;re up to date
                </div>
                <p className="mx-auto mt-4 mb-0 max-w-[420px] text-body leading-[1.6] text-text2">
                    Lore is made by a team of four in Lisbon and Copenhagen. It keeps your library
                    on your own machine and syncs it encrypted.
                </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 border-b border-border-soft pb-[22px]">
                {ABOUT_LINKS.map((l) => (
                    <button className={ABOUT_LINK} key={l} type="button">
                        {l}
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
