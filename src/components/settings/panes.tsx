// The ten settings panes from `Lore Settings.dc.html`. Controls backed by real
// app state (accent, appearance, density, AI location, the switch set) write
// through the store and persist; the rest render the design's copy against
// placeholder figures until there is a backend to read them from.

import type { Appearance } from '../../theme/tokens';

import {
    type Accent,
    ACCENT_NAMES,
    ACCENTS,
    type AiMode,
    type Density,
    type NotificationStyle,
    type Switches,
    type WeekStart,
} from '../../store/types';
import { useStore } from '../../store/useStore';
import { LoreMark } from '../common/LoreMark';
import { SettingsIcon, type SettingsIconName } from '../common/settingsGlyphs';
import { Chooser, KeyCap, PillButton, Row, SectionLabel, Segmented, Toggle } from './controls';
import { aboutLink, choiceCard, pillButton } from './SettingsModal.css';

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
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
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
                <div
                    style={{
                        alignItems: 'flex-start',
                        border: '1px dashed var(--dash, #d2d2dc)',
                        borderRadius: 12,
                        display: 'flex',
                        gap: 13,
                        padding: '16px 18px',
                    }}
                >
                    <span
                        style={{
                            color: 'var(--text2, #6b6b76)',
                            display: 'inline-flex',
                            marginTop: 2,
                        }}
                    >
                        <SettingsIcon name="lock" size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                            Local vault — no account
                        </div>
                        <div
                            style={{
                                color: 'var(--text3, #9a9aa5)',
                                fontSize: 12.5,
                                lineHeight: 1.5,
                                marginTop: 3,
                            }}
                        >
                            Signing in uploads this vault once. Nothing is re-entered, and
                            everything you have captured so far comes with you.
                        </div>
                    </div>
                </div>
                <div style={{ marginTop: 14 }}>
                    <PillButton
                        onClick={() => {
                            // Send the user back through the onboarding sheet's sign-in lane.
                            setStep('signin');
                            useStore.setState({ onboarded: false, settingsOpen: false });
                        }}
                        style={{ background: 'var(--ac)', borderColor: 'var(--ac)', color: '#fff' }}
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
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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
            <div
                style={{
                    alignItems: 'center',
                    border: '1px solid var(--border, #e4e4ea)',
                    borderRadius: 12,
                    display: 'flex',
                    gap: 14,
                    padding: '14px 16px',
                }}
            >
                <span
                    style={{
                        alignItems: 'center',
                        background: 'var(--ac)',
                        borderRadius: '50%',
                        color: '#fff',
                        display: 'flex',
                        flex: 'none',
                        fontSize: 15,
                        fontWeight: 640,
                        height: 42,
                        justifyContent: 'center',
                        width: 42,
                    }}
                >
                    {initials}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 640 }}>{name}</div>
                    <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12.5, marginTop: 1 }}>
                        {email}
                    </div>
                </div>
                <PillButton onClick={signOut}>Sign out</PillButton>
            </div>

            <div
                style={{
                    alignItems: 'center',
                    border: '1px solid var(--border, #e4e4ea)',
                    borderRadius: 12,
                    display: 'flex',
                    gap: 14,
                    marginTop: 10,
                    padding: '14px 16px',
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 640 }}>Lore Pro</span>
                        <span
                            style={{
                                background: '#e8f2ec',
                                borderRadius: 6,
                                color: '#4d855f',
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '2px 7px',
                            }}
                        >
                            Active
                        </span>
                    </div>
                    <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12.5, marginTop: 3 }}>
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
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
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
        <div
            style={{
                border: '1px solid var(--border, #e4e4ea)',
                borderRadius: 12,
                marginTop: 8,
                padding: '14px 16px',
            }}
        >
            <div
                style={{ alignItems: 'baseline', display: 'flex', justifyContent: 'space-between' }}
            >
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Local library</span>
                <span style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12.5 }}>
                    1.84 GB of 5 GB
                </span>
            </div>
            <div
                style={{
                    background: 'var(--surface3, #f1f1f3)',
                    borderRadius: 5,
                    display: 'flex',
                    gap: 2,
                    height: 8,
                    margin: '10px 0',
                    overflow: 'hidden',
                }}
            >
                {STORAGE_SEGMENTS.map((s) => (
                    <span key={s.label} style={{ background: s.color, flex: s.share }} />
                ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {STORAGE_SEGMENTS.map((s) => (
                    <span
                        key={s.label}
                        style={{
                            alignItems: 'center',
                            color: 'var(--text3, #9a9aa5)',
                            display: 'inline-flex',
                            fontSize: 12,
                            gap: 6,
                        }}
                    >
                        <span
                            style={{
                                background: s.color,
                                borderRadius: 3,
                                flex: 'none',
                                height: 8,
                                width: 8,
                            }}
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

export function LookPane() {
    const appearance = useStore((s) => s.prefs.appearance);
    const setAppearance = useStore((s) => s.setAppearance);
    const accent = useStore((s) => s.prefs.accent);
    const setAccent = useStore((s) => s.setAccent);
    const density = useStore((s) => s.prefs.density);
    const textSize = useStore((s) => s.prefs.textSize);
    const setPref = useStore((s) => s.setPref);
    const counts = useSwitch('counts');
    const motion = useSwitch('motion');

    return (
        <>
            <SectionLabel first>Appearance</SectionLabel>
            <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                {APPEARANCES.map((a) => {
                    const active = appearance === a.id;
                    return (
                        <button
                            aria-pressed={active}
                            key={a.id}
                            onClick={() => setAppearance(a.id)}
                            style={{
                                background: active ? 'var(--ac-tint, #eeeef2)' : 'transparent',
                                border: `1.5px solid ${active ? 'var(--ac)' : 'var(--border, #e4e4ea)'}`,
                                borderRadius: 12,
                                color: 'inherit',
                                cursor: 'pointer',
                                display: 'flex',
                                flex: 1,
                                flexDirection: 'column',
                                fontFamily: 'inherit',
                                gap: 9,
                                padding: 11,
                            }}
                            type="button"
                        >
                            <span
                                style={{
                                    background: a.swatch,
                                    border: '1px solid var(--swatch-border, rgba(0,0,0,.07))',
                                    borderRadius: 8,
                                    height: 52,
                                }}
                            />
                            <span style={{ fontSize: 12.5, fontWeight: active ? 600 : 500 }}>
                                {a.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            <SectionLabel>Accent</SectionLabel>
            <div style={{ alignItems: 'center', display: 'flex', gap: 10, marginBottom: 4 }}>
                {ACCENTS.map((hex) => {
                    const active = accent === hex;
                    return (
                        <button
                            aria-label={ACCENT_NAMES[hex]}
                            aria-pressed={active}
                            key={hex}
                            onClick={() => setAccent(hex as Accent)}
                            style={{
                                alignItems: 'center',
                                background: 'transparent',
                                border: `1.5px solid ${active ? hex : 'transparent'}`,
                                borderRadius: '50%',
                                boxShadow: 'inset 0 0 0 2px var(--surface, #fff)',
                                cursor: 'pointer',
                                display: 'flex',
                                flex: 'none',
                                height: 28,
                                justifyContent: 'center',
                                padding: 0,
                                width: 28,
                            }}
                            type="button"
                        >
                            <span
                                style={{
                                    background: hex,
                                    borderRadius: '50%',
                                    height: 20,
                                    width: 20,
                                }}
                            />
                        </button>
                    );
                })}
                <span style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12.5, marginLeft: 4 }}>
                    {ACCENT_NAMES[accent]}
                </span>
            </div>

            <SectionLabel>Density &amp; text</SectionLabel>
            <Row desc="Compact hides the tag row until hover." title="List density">
                <Segmented<Density>
                    onChange={(v) => setPref('density', v)}
                    options={['Cozy', 'Compact', 'Roomy']}
                    value={density}
                />
            </Row>
            <Row title="Text size">
                <div style={{ alignItems: 'center', display: 'flex', flex: 'none', gap: 10 }}>
                    <span style={{ color: 'var(--text3, #9a9aa5)', fontSize: 11 }}>A</span>
                    <input
                        aria-label="Text size"
                        max={1.2}
                        min={0.9}
                        onChange={(e) => setPref('textSize', Number(e.target.value))}
                        step={0.05}
                        style={{ accentColor: 'var(--ac)', width: 120 }}
                        type="range"
                        value={textSize}
                    />
                    <span style={{ color: 'var(--text3, #9a9aa5)', fontSize: 16 }}>A</span>
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
            { keys: ['⌥', 'Space'], label: 'Quick capture' },
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
            { keys: ['⌘', 'D'], label: 'Flag item' },
            { keys: ['⌘', '⇧', 'C'], label: 'Share' },
            { keys: ['↑', '↓'], label: 'Next / previous item' },
            { keys: ['⌘', '3'], label: 'Calendar view' },
        ],
    },
];

export function KeysPane() {
    return (
        <>
            <div style={{ alignItems: 'center', display: 'flex', gap: 10, marginBottom: 20 }}>
                <div
                    style={{
                        alignItems: 'center',
                        background: 'var(--surface3, #f1f1f3)',
                        borderRadius: 8,
                        color: 'var(--text3, #9a9aa5)',
                        display: 'flex',
                        flex: 1,
                        fontSize: 12.5,
                        gap: 8,
                        padding: '7px 10px',
                    }}
                >
                    <SettingsIcon name="search" size={14} sw={1.9} />
                    <span>Filter shortcuts</span>
                </div>
                <PillButton>Restore defaults</PillButton>
            </div>

            {SHORTCUT_GROUPS.map((g) => (
                <div key={g.name} style={{ marginBottom: 22 }}>
                    <SectionLabel first>{g.name}</SectionLabel>
                    {g.rows.map((r, i) => (
                        <div
                            key={r.label}
                            style={{
                                alignItems: 'center',
                                borderBottom:
                                    i === g.rows.length - 1
                                        ? 'none'
                                        : '1px solid var(--border-soft, #f0f0f2)',
                                display: 'flex',
                                gap: 16,
                                padding: '9px 0',
                            }}
                        >
                            <span style={{ flex: 1, fontSize: 13, minWidth: 0 }}>{r.label}</span>
                            <span style={{ display: 'flex', flex: 'none', gap: 4 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {AI_MODES.map((m) => {
                    const active = aiMode === m.id;
                    return (
                        <button
                            aria-pressed={active}
                            className={choiceCard}
                            key={m.id}
                            onClick={() => setPref('aiMode', m.id)}
                            style={{
                                alignItems: 'flex-start',
                                background: active ? 'var(--ac-tint, #eeeef2)' : 'transparent',
                                border: `1.5px solid ${active ? 'var(--ac)' : 'var(--border, #e4e4ea)'}`,
                                color: 'inherit',
                            }}
                            type="button"
                        >
                            <span
                                style={{
                                    alignItems: 'center',
                                    border: `1.5px solid ${active ? 'var(--ac)' : 'var(--dash, #d2d2dc)'}`,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    flex: 'none',
                                    height: 17,
                                    justifyContent: 'center',
                                    marginTop: 1,
                                    width: 17,
                                }}
                            >
                                <span
                                    style={{
                                        background: active ? 'var(--ac)' : 'transparent',
                                        borderRadius: '50%',
                                        height: 9,
                                        width: 9,
                                    }}
                                />
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>
                                    {m.label}
                                </span>
                                <span
                                    style={{
                                        color: 'var(--text3, #9a9aa5)',
                                        display: 'block',
                                        fontSize: 12.5,
                                        lineHeight: 1.5,
                                        marginTop: 2,
                                    }}
                                >
                                    {m.desc}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <div style={{ marginTop: 8 }}>
                <Row desc="Unlimited on Pro." last title="Summaries used this month">
                    <span
                        style={{
                            fontSize: 13.5,
                            fontVariantNumeric: 'tabular-nums',
                            fontWeight: 640,
                        }}
                    >
                        412
                    </span>
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
            <div
                style={{
                    alignItems: 'flex-start',
                    border: '1px dashed var(--dash, #d2d2dc)',
                    borderRadius: 12,
                    display: 'flex',
                    gap: 13,
                    padding: '16px 18px',
                }}
            >
                <span
                    style={{ color: 'var(--text2, #6b6b76)', display: 'inline-flex', marginTop: 2 }}
                >
                    <SettingsIcon name="noSync" size={18} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>Sync is off</div>
                    <div
                        style={{
                            color: 'var(--text3, #9a9aa5)',
                            fontSize: 12.5,
                            lineHeight: 1.5,
                            marginTop: 3,
                        }}
                    >
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
            <div
                style={{
                    alignItems: 'center',
                    border: '1px solid var(--border, #e4e4ea)',
                    borderRadius: 12,
                    display: 'flex',
                    gap: 13,
                    padding: '14px 16px',
                }}
            >
                <span
                    style={{
                        alignItems: 'center',
                        background: '#e8f2ec',
                        borderRadius: '50%',
                        color: '#4d855f',
                        display: 'flex',
                        flex: 'none',
                        height: 32,
                        justifyContent: 'center',
                        width: 32,
                    }}
                >
                    <SettingsIcon name="check" size={16} sw={2.2} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 640 }}>Everything is synced</div>
                    <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12.5, marginTop: 1 }}>
                        Last checked 40 seconds ago · {items.length} items
                    </div>
                </div>
                <PillButton>Sync now</PillButton>
            </div>

            <SectionLabel>Devices</SectionLabel>
            {DEVICES.map((d) => (
                <div
                    key={d.name}
                    style={{
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-soft, #f0f0f2)',
                        display: 'flex',
                        gap: 12,
                        padding: '11px 0',
                    }}
                >
                    <span
                        style={{
                            alignItems: 'center',
                            background: 'var(--surface3, #f1f1f3)',
                            borderRadius: 8,
                            color: 'var(--text2, #6b6b76)',
                            display: 'flex',
                            flex: 'none',
                            height: 30,
                            justifyContent: 'center',
                            width: 30,
                        }}
                    >
                        <SettingsIcon name={d.icon} size={16} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                        <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12, marginTop: 1 }}>
                            {d.meta}
                        </div>
                    </div>
                    <span
                        style={{
                            borderRadius: 7,
                            flex: 'none',
                            fontSize: 12,
                            padding: '3px 9px',
                            ...(d.on
                                ? { background: '#e8f2ec', color: '#4d855f' }
                                : {
                                      background: 'var(--surface3, #f1f1f3)',
                                      color: 'var(--text3, #9a9aa5)',
                                  }),
                        }}
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

export function FocusPane() {
    const durations = useStore((s) => s.prefs.durations);
    const bump = useStore((s) => s.bumpDuration);
    const longBreakAfter = useStore((s) => s.prefs.longBreakAfter);
    const setPref = useStore((s) => s.setPref);

    return (
        <>
            <p
                style={{
                    color: 'var(--text3, #9a9aa5)',
                    fontSize: 12.5,
                    lineHeight: 1.5,
                    margin: '0 0 16px',
                }}
            >
                The timer itself lives in the menu bar. These are its defaults.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
                {DURATION_LABELS.map((d) => (
                    <div
                        key={d.key}
                        style={{
                            border: '1px solid var(--border, #e4e4ea)',
                            borderRadius: 12,
                            flex: 1,
                            padding: '13px 14px',
                        }}
                    >
                        <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12.5 }}>
                            {d.label}
                        </div>
                        <div
                            style={{
                                alignItems: 'center',
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginTop: 6,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 24,
                                    fontVariantNumeric: 'tabular-nums',
                                    fontWeight: 620,
                                }}
                            >
                                {durations[d.key]}
                                <span
                                    style={{
                                        color: 'var(--text3, #9a9aa5)',
                                        fontSize: 12,
                                        fontWeight: 500,
                                        marginLeft: 4,
                                    }}
                                >
                                    min
                                </span>
                            </span>
                            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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

function StepButton({ label, onClick, up }: { label: string; onClick: () => void; up?: boolean }) {
    return (
        <button
            aria-label={label}
            className={pillButton}
            onClick={onClick}
            style={{ padding: '2px 6px' }}
            type="button"
        >
            <SettingsIcon name={up ? 'chevronUp' : 'chevronDown'} size={11} sw={2.6} />
        </button>
    );
}

/* ------------------------------------------------------------------ *
 * Calendar
 * ------------------------------------------------------------------ */

const CALENDAR_ACCOUNTS: { color: string; key: keyof Switches; meta: string; name: string }[] = [
    {
        color: '#8a92b8',
        key: 'calWork',
        meta: 'rowan@shaw.studio · 4 calendars',
        name: 'Work — Google',
    },
    {
        color: '#a88f6e',
        key: 'calPersonal',
        meta: 'rowan@icloud.com · 2 calendars',
        name: 'Personal — iCloud',
    },
    { color: '#82a896', key: 'calShared', meta: 'Read-only invite', name: 'Studio shared' },
];

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
                    key={c.key}
                    style={{
                        alignItems: 'center',
                        borderBottom: '1px solid var(--border-soft, #f0f0f2)',
                        display: 'flex',
                        gap: 12,
                        padding: '11px 0',
                    }}
                >
                    <span
                        style={{
                            background: c.color,
                            borderRadius: 3,
                            flex: 'none',
                            height: 10,
                            width: 10,
                        }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12, marginTop: 1 }}>
                            {c.meta}
                        </div>
                    </div>
                    <Toggle label={c.name} on={switches[c.key]} onChange={() => toggle(c.key)} />
                </div>
            ))}
            <div style={{ marginTop: 12 }}>
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
            <div style={{ padding: '8px 0 22px', textAlign: 'center' }}>
                <span style={{ color: 'var(--text, #1a1a1f)', display: 'inline-flex' }}>
                    <LoreMark size={58} />
                </span>
                <div style={{ fontSize: 17, fontWeight: 660, marginTop: 12 }}>Lore</div>
                <div style={{ color: 'var(--text3, #9a9aa5)', fontSize: 12.5, marginTop: 3 }}>
                    Version 2.4.1 (build 2418) · Apple silicon
                </div>
                <div
                    style={{
                        alignItems: 'center',
                        background: '#e8f2ec',
                        borderRadius: 8,
                        color: '#4d855f',
                        display: 'inline-flex',
                        fontSize: 12.5,
                        gap: 6,
                        marginTop: 10,
                        padding: '4px 10px',
                    }}
                >
                    <SettingsIcon name="check" size={13} sw={2.4} />
                    You&rsquo;re up to date
                </div>
                <p
                    style={{
                        color: 'var(--text2, #6b6b76)',
                        fontSize: 12.5,
                        lineHeight: 1.6,
                        margin: '16px auto 0',
                        maxWidth: 420,
                    }}
                >
                    Lore is made by a team of four in Lisbon and Copenhagen. It keeps your library
                    on your own machine and syncs it encrypted.
                </p>
            </div>

            <div
                style={{
                    borderBottom: '1px solid var(--border-soft, #f0f0f2)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    justifyContent: 'center',
                    paddingBottom: 22,
                }}
            >
                {ABOUT_LINKS.map((l) => (
                    <button className={aboutLink} key={l} type="button">
                        {l}
                    </button>
                ))}
            </div>

            <div style={{ paddingTop: 8 }}>
                {meta.map((m) => (
                    <div
                        key={m.k}
                        style={{
                            borderBottom: '1px solid var(--border-soft, #f0f0f2)',
                            display: 'flex',
                            fontSize: 12.5,
                            gap: 16,
                            padding: '9px 0',
                        }}
                    >
                        <span style={{ color: 'var(--text3, #9a9aa5)', flex: 'none', width: 130 }}>
                            {m.k}
                        </span>
                        <span style={{ flex: 1, minWidth: 0 }}>{m.v}</span>
                    </div>
                ))}
            </div>
        </>
    );
}
