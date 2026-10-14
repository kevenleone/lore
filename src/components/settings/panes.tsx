// The settings panes from `Lore Settings.dc.html`, less the account and sync
// ones — Lore is offline, so neither has anything to show. Every control here
// writes app state that something outside this folder reads back: a row whose
// feature does not exist yet is not shown at all, because a switch that quietly
// does nothing is worse than a missing one.

import { useEffect, useMemo, useState } from 'react';

import type { AgentPart } from '../../ai/aiProvider';
import type { VaultSize } from '../../data/repository';
import type { Appearance } from '../../theme/tokens';

import { getAi } from '../../ai';
import { getRepository } from '../../data';
import { APP_LINKS, APP_VERSION, openExternal } from '../../lib/appInfo';
import { APP_MODE, captureShortcutKeys } from '../../lib/appMode';
import { type CliStatus, cliStatus, setCliInstalled } from '../../lib/cli';
import { cn } from '../../lib/cn';
import { formatBytes } from '../../lib/format';
import {
    formatHotkey,
    type HotkeyCommand,
    hotkeyFor,
    hotkeyKeys,
    HOTKEYS,
} from '../../lib/hotkeys';
import { revealPath, revealVaultFile } from '../../lib/reveal';
import { availableBuiltins } from '../../lib/templates';
import { workspaceName } from '../../lib/workspace';
import { TYPE_META } from '../../store/typeMeta';
import {
    type Accent,
    ACCENT_NAMES,
    ACCENTS,
    type AgentSetup,
    type AgentStatus,
    type AiBackendStatus,
    type BannerPlacement,
    type ConnectionTest,
    type Density,
    ITEM_TYPES,
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
const UNSPLASH_DEVELOPERS = 'https://unsplash.com/developers';

const ABOUT_LINK =
    'text-body rounded-lg border border-border bg-surface px-[10px] py-[6px] font-[inherit] text-text2 hover:bg-hover hover:text-text';

/** Options for "Default capture type", ahead of the collections list. */
const CAPTURE_TYPES: ChoiceOption<'auto' | ItemType>[] = [
    { label: 'Detect automatically', value: 'auto' },
    ...ITEM_TYPES.map((type) => ({ label: TYPE_META[type].label, value: type })),
];

export function GeneralPane() {
    const collections = useStore((state) => state.collections);
    const defaultCollection = useStore((state) => state.prefs.defaultCollection);
    const defaultCaptureType = useStore((state) => state.prefs.defaultCaptureType);
    const dailyNoteCollection = useStore((state) => state.prefs.dailyNoteCollection);
    const dailyNoteTemplate = useStore((state) => state.prefs.dailyNoteTemplate);
    const templates = useStore((state) => state.templates);
    const setPref = useStore((state) => state.setPref);

    // A collection deleted since the preference was set falls back to the
    // Inbox rather than leaving the chooser showing an id that no longer reads.
    const targets = useMemo<ChoiceOption<string>[]>(
        () => [
            { label: 'Inbox', value: INBOX_TARGET },
            ...collections.map((collection) => ({ label: collection.name, value: collection.id })),
        ],
        [collections],
    );
    const journalTargets = useMemo<ChoiceOption<string>[]>(
        () => [
            { label: 'No collection', value: ROOT_TARGET },
            ...collections.map((collection) => ({ label: collection.name, value: collection.id })),
        ],
        [collections],
    );
    const target = targets.some((target) => target.value === defaultCollection)
        ? (defaultCollection ?? INBOX_TARGET)
        : INBOX_TARGET;

    // Same fallback, and the same reason: the vault root is where a note with
    // nowhere to go lives.
    const journal = collections.some((entry) => entry.id === dailyNoteCollection)
        ? (dailyNoteCollection ?? ROOT_TARGET)
        : ROOT_TARGET;

    const choosable = useMemo(() => [...templates, ...availableBuiltins(templates)], [templates]);
    const templateOptions = useMemo<ChoiceOption<string>[]>(
        () => [
            { label: 'Blank', value: BLANK_TEMPLATE },
            ...choosable.map((template) => ({ label: template.name, value: template.name })),
        ],
        [choosable],
    );
    // A template deleted since the preference was set writes a blank note
    // rather than leaving the chooser naming a file that is not there.
    const journalTemplate = choosable.some((template) => template.name === dailyNoteTemplate)
        ? (dailyNoteTemplate ?? BLANK_TEMPLATE)
        : BLANK_TEMPLATE;

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
            <Row desc="Which tab the capture window opens on." title="Default capture type">
                <Chooser<'auto' | ItemType>
                    label="Default capture type"
                    onChange={(v) => setPref('defaultCaptureType', v)}
                    options={CAPTURE_TYPES}
                    value={defaultCaptureType}
                />
            </Row>
            <Row
                desc={`Where ${formatHotkey(hotkeyFor('daily-note'))} writes today's note. One note per day, named for the day.`}
                title="Keep today's note in"
            >
                <Chooser<string>
                    label="Keep today's note in"
                    onChange={(choice) =>
                        setPref('dailyNoteCollection', choice === ROOT_TARGET ? null : choice)
                    }
                    options={journalTargets}
                    value={journal}
                />
            </Row>
            <Row
                desc="What today's note starts with. Lore ships a few; your own go in .lore/templates."
                last
                title="Start today's note from"
            >
                <Chooser<string>
                    label="Start today's note from"
                    onChange={(choice) =>
                        setPref('dailyNoteTemplate', choice === BLANK_TEMPLATE ? null : choice)
                    }
                    options={templateOptions}
                    value={journalTemplate}
                />
            </Row>

            <CommandLineSection />
        </>
    );
}

function CommandLineSection() {
    const [status, setStatus] = useState<CliStatus | null>(null);
    const [error, setError] = useState<null | string>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let live = true;

        void cliStatus().then((found) => {
            if (live) {
                setStatus(found);
            }
        });

        return () => {
            live = false;
        };
    }, []);

    if (!status) {
        return null;
    }

    const title = `Install '${status.name}' command in PATH`;

    const toggle = async (): Promise<void> => {
        if (busy) {
            return;
        }

        setBusy(true);
        setError(null);

        try {
            setStatus(await setCliInstalled(!status.installed));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <SectionLabel>Terminal</SectionLabel>
            <Row
                desc={`Run “${status.name} .” to open a folder as the vault, or “${status.name} note.md” to open one file. macOS may ask for your password.`}
                last
                title={title}
            >
                <Toggle label={title} on={status.installed} onChange={() => void toggle()} />
            </Row>
            {error && (
                <div
                    className="pb-[13px] text-body leading-[1.5] whitespace-pre-wrap text-danger select-text"
                    role="alert"
                >
                    {error}
                </div>
            )}
        </>
    );
}

/**
 * The chooser's stand-in for "no collection". `null` cannot be a menu value,
 * and an id is never this string.
 */
const INBOX_TARGET = 'inbox';

/** The same stand-in for "no template". A name comes from a file stem, so it
 * can never contain a slash — unlike `blank`, which someone could call a file. */
const BLANK_TEMPLATE = '/blank';

/** The same stand-in for the vault root, which is not a collection either. */
const ROOT_TARGET = 'root';

export function VaultPane() {
    const workspacePath = useStore((state) => state.workspacePath);
    const openWorkspacePicker = useStore((state) => state.openWorkspacePicker);
    const setStep = useStore((state) => state.setOnboardingStep);
    const exportVault = useStore((state) => state.exportVault);
    const trashVault = useStore((state) => state.trashVault);
    const items = useStore((state) => state.items);
    const pushToast = useStore((state) => state.pushToast);
    const reindexVault = useStore((state) => state.reindexVault);
    const [confirming, setConfirming] = useState(false);
    const [reindexing, setReindexing] = useState(false);
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
                            if (!ok) {
                                pushToast('Could not open the vault in Finder.');
                            }
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
                desc="Lore follows the folder as you edit it. Rebuild if something you changed outside Lore has not shown up — the index is derived, so nothing you wrote is at stake."
                title="Rebuild the index"
            >
                <PillButton
                    className={cn(reindexing && 'cursor-default opacity-45')}
                    disabled={reindexing}
                    onClick={() => {
                        setReindexing(true);
                        void reindexVault().finally(() => setReindexing(false));
                    }}
                >
                    {reindexing ? 'Rebuilding…' : 'Rebuild'}
                </PillButton>
            </Row>
            <Row
                desc="Skeletons for new items, as Markdown files you edit like any other. Lore's own are in ⌘K already; a file here with the same name replaces one."
                title="Templates"
            >
                <PillButton
                    onClick={() => {
                        void revealVaultFile(workspacePath, '.lore/templates').then((ok) => {
                            if (!ok) {
                                pushToast('Could not open the templates folder in Finder.');
                            }
                        });
                    }}
                >
                    Reveal in Finder
                </PillButton>
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
                        onChange={(event) => setTyped(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                onCancel();
                            }

                            if (event.key === 'Enter' && matches) {
                                onConfirm();
                            }
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
    const on = useStore((state) => state.prefs.switches[key]);
    const toggle = useStore((state) => state.toggleSwitch);

    return { on, onChange: () => toggle(key) };
}

/**
 * The vault's weight on disk, or null before the engine has answered — and in
 * the browser preview, where there is no vault to weigh.
 */
function useVaultSize(): null | VaultSize {
    const [size, setSize] = useState<null | VaultSize>(null);
    const items = useStore((state) => state.items);

    useEffect(() => {
        let cancelled = false;
        const repo = getRepository();

        if (!repo.size) {
            return;
        }

        void repo
            .size()
            .then((result) => {
                if (!cancelled) {
                    setSize(result);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setSize(null);
                }
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
const BANNER_PLACEMENTS: BannerPlacement[] = ['inline', 'cover'];
const titleCase = (s: string): string => s[0].toUpperCase() + s.slice(1);

export function LookPane() {
    const appearance = useStore((state) => state.prefs.appearance);
    const setAppearance = useStore((state) => state.setAppearance);
    const accent = useStore((state) => state.prefs.accent);
    const darkTheme = useStore((state) => state.prefs.darkTheme);
    const lightTheme = useStore((state) => state.prefs.lightTheme);
    const setAccent = useStore((state) => state.setAccent);
    const density = useStore((state) => state.prefs.density);
    const textSize = useStore((state) => state.prefs.textSize);
    const setPref = useStore((state) => state.setPref);
    const viewMode = useStore((state) => state.prefs.viewMode);
    const setViewMode = useStore((state) => state.setViewMode);
    const openMode = useStore((state) => state.prefs.openMode);
    const setOpenMode = useStore((state) => state.setOpenMode);
    const bannerPlacement = useStore((state) => state.prefs.bannerPlacement);
    const flatCollections = useSwitch('flatCollections');
    const sidebarRails = useSwitch('sidebarRails');
    const counts = useSwitch('counts');
    const statusBar = useSwitch('statusBar');
    const blockEditor = useSwitch('blockEditor');
    const rawMarkdownDefault = useSwitch('rawMarkdownDefault');
    const motion = useSwitch('motion');
    const mode = effectiveTheme(appearance);
    const setTheme = useStore((state) => state.setTheme);
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
            <div className="mt-[10px]">
                <div className="grid grid-cols-4 gap-[10px]">
                    {themesFor(mode).map((themeDefinition) => {
                        const active = themeId === themeDefinition.id;

                        return (
                            <button
                                aria-pressed={active}
                                className={cn(
                                    'flex flex-col gap-[7px] rounded-xl border-[1.5px] p-[7px] font-[inherit] text-[inherit]',
                                    active
                                        ? 'border-accent bg-accent-tint'
                                        : 'border-border bg-transparent',
                                )}
                                key={themeDefinition.id}
                                onClick={() => setTheme(themeDefinition.id)}
                                type="button"
                            >
                                <ThemePreview theme={themeDefinition} />
                                <span
                                    className={cn(
                                        'truncate text-caption',
                                        active ? 'font-semibold' : 'font-medium text-text2',
                                    )}
                                >
                                    {themeDefinition.name}
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

            <Row
                desc="Cover runs the image full width above the title. Inline keeps the whole image, under the metadata."
                title="Thumbnail placement"
            >
                <Segmented<string>
                    onChange={(v) => setPref('bannerPlacement', v.toLowerCase() as BannerPlacement)}
                    options={BANNER_PLACEMENTS.map(titleCase)}
                    value={titleCase(bannerPlacement)}
                />
            </Row>
            <UnsplashKeyRow />

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
                        onChange={(event) => setPref('textSize', Number(event.target.value))}
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
                desc="Structured nests a collection inside its parent. Flat lists them all at the top level, each one labelled with its whole path."
                title="Collections in the sidebar"
            >
                <Segmented
                    onChange={(choice) => {
                        // The switch is a toggle, so picking the segment that is
                        // already on must not flip it off.
                        if ((choice === 'Flat') !== flatCollections.on) {
                            flatCollections.onChange();
                        }
                    }}
                    options={['Structured', 'Flat'] as const}
                    value={flatCollections.on ? 'Flat' : 'Structured'}
                />
            </Row>
            <Row
                desc="Hairlines down the left of collections inside collections, marking where a branch begins."
                title="Guide lines in the sidebar"
            >
                <Toggle
                    label="Guide lines in the sidebar"
                    on={sidebarRails.on}
                    onChange={sidebarRails.onChange}
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
 * Only chords that actually fire, from the same list the menu bar and the
 * renderer fire. Shortcuts are not rebindable yet, so nothing here claims to be.
 */
const SHORTCUT_GROUPS = [
    {
        name: 'Global',
        rows: [{ keys: captureShortcutKeys(), label: 'Quick capture, from any app' }],
    },
    { name: 'Main window', rows: shortcutRows('main') },
    { name: 'Views', rows: shortcutRows('views') },
    {
        name: 'Capture window',
        rows: [
            { keys: hotkeyKeys('Enter'), label: 'Save' },
            { keys: hotkeyKeys('Escape'), label: 'Dismiss' },
        ],
    },
];

export function AiPane() {
    return (
        <>
            <p className="mt-0 mb-4 text-body leading-[1.5] text-text3">
                Lore sends nothing to a model until you choose one below. Quick capture guesses a
                type from what you typed, and that guess is always made on this Mac.
            </p>

            <SectionLabel first>Assistant</SectionLabel>
            <AssistantRows />
            <SwitchRow
                desc="Asks the chosen model for tags while you type a capture, which sends it what you are typing. They are saved with the capture unless you click them away."
                name="aiSuggest"
                title="Suggest tags while capturing"
            />

            <SectionLabel>In the detail pane</SectionLabel>
            <SwitchRow
                desc="A note can carry a summary, key points and links in its own frontmatter. This is whether they are shown, and whether a note without a summary offers to have one written."
                last
                name="detailSections"
                title="Show a note’s summary and links"
            />

            <AgentsSection />
        </>
    );
}

function AgentRows({
    agent,
    busy,
    last,
    onChange,
}: {
    agent: AgentStatus;
    busy: null | string;
    last: boolean;
    onChange: (part: AgentPart, on: boolean) => void;
}) {
    const vaultTitle = `Use this vault in ${agent.label}`;
    const test = useConnectionTest(agent.mcp);
    const skillTitle = `Lore writing skill for ${agent.label}`;

    return (
        <>
            <Row
                desc={test.describe(
                    AGENT_MCP_NOTES[agent.mcp](agent),
                    `Starting ${agent.label}’s “${agent.server}” server…`,
                    (result) =>
                        `${agent.label}’s “${agent.server}” server started in ${seconds(result.ms)} and offers ${result.detail}.`,
                )}
                failed={test.failed}
                title={vaultTitle}
            >
                <div className="flex flex-none items-center gap-[10px]">
                    {agent.mcp !== 'off' && (
                        <PillButton
                            disabled={test.running}
                            onClick={() => test.run(() => getAi().testAgent(agent.id))}
                        >
                            {test.running ? 'Testing…' : 'Test'}
                        </PillButton>
                    )}
                    <AgentSwitch
                        busy={busy === `${agent.id}:mcp`}
                        label={vaultTitle}
                        onChange={(on) => onChange('mcp', on)}
                        setup={agent.mcp}
                    />
                </div>
            </Row>
            <Row desc={AGENT_SKILL_NOTES[agent.skill](agent)} last={last} title={skillTitle}>
                <AgentSwitch
                    busy={busy === `${agent.id}:skill`}
                    label={skillTitle}
                    onChange={(on) => onChange('skill', on)}
                    setup={agent.skill}
                />
            </Row>
        </>
    );
}

/**
 * Connects the agents installed on this Mac to the vault. The engine runs each
 * agent's own setup command; all this sends is which agent, and on or off.
 */
function AgentsSection() {
    const [agents, setAgents] = useState<AgentStatus[]>([]);
    const [busy, setBusy] = useState<null | string>(null);
    const [failure, setFailure] = useState<null | string>(null);

    useEffect(() => {
        let live = true;

        getAi()
            .agents()
            .then((found) => {
                if (live) {
                    setAgents(found);
                }
            })
            .catch(() => undefined);

        return () => {
            live = false;
        };
    }, []);

    const installed = agents.filter((agent) => agent.available);

    if (!agents.length) {
        return null;
    }

    const change = async (agent: AgentStatus, part: AgentPart, on: boolean): Promise<void> => {
        if (busy) {
            return;
        }

        setBusy(`${agent.id}:${part}`);
        setFailure(null);

        try {
            const updated = await getAi().setAgent(agent.id, part, on);

            setAgents((current) =>
                current.map((entry) => (entry.id === updated.id ? updated : entry)),
            );
        } catch (reason) {
            setFailure(reason instanceof Error ? reason.message : String(reason));
        } finally {
            setBusy(null);
        }
    };

    return (
        <>
            <SectionLabel>Agents</SectionLabel>
            <p className="mt-0 mb-1 text-body leading-[1.5] text-text3">
                {installed.length
                    ? 'Let an agent on this Mac work in this vault outside Lore: search and read it, create items, draw into sketches, and write files the way Lore expects. Start a new agent session after changing these.'
                    : `Lore can connect ${agents.map((agent) => agent.label).join(' or ')} to this vault once one is installed on this Mac.`}
            </p>
            {installed.map((agent, index) => (
                <AgentRows
                    agent={agent}
                    busy={busy}
                    key={agent.id}
                    last={index === installed.length - 1}
                    onChange={(part, on) => void change(agent, part, on)}
                />
            ))}
            {failure && (
                <div
                    className="pb-[13px] text-body leading-[1.5] whitespace-pre-wrap text-danger select-text"
                    role="alert"
                >
                    {failure}
                </div>
            )}
        </>
    );
}

function AgentSwitch({
    busy,
    label,
    onChange,
    setup,
}: {
    busy: boolean;
    label: string;
    onChange: (on: boolean) => void;
    setup: AgentSetup;
}) {
    return (
        <div className="flex flex-none items-center gap-[10px]">
            {setup === 'stale' && (
                <PillButton disabled={busy} onClick={() => onChange(true)}>
                    Update
                </PillButton>
            )}
            <Toggle label={label} on={setup !== 'off'} onChange={() => onChange(setup === 'off')} />
        </div>
    );
}

const AGENT_MCP_NOTES: Record<AgentSetup, (agent: AgentStatus) => string> = {
    off: (agent) =>
        `Adds a “${agent.server}” server to ${agent.label}, so it can search, read and change this vault.`,
    on: (agent) =>
        `${agent.label} reaches this vault through its “${agent.server}” server, and can change it as well as read it.`,
    stale: (agent) =>
        `${agent.label}’s “${agent.server}” server points at another vault or an older Lore. Update it to use this one.`,
};

const AGENT_SKILL_NOTES: Record<AgentSetup, (agent: AgentStatus) => string> = {
    off: (agent) =>
        `Installs the lore-docs skill, which teaches ${agent.label} how a Lore file is shaped.`,
    on: (agent) => `${agent.label} has the lore-docs skill from this version of Lore.`,
    stale: (agent) =>
        `${agent.label} has a different lore-docs skill. Update it to the one from this version of Lore.`,
};

const TEXT_FIELD =
    'w-[210px] flex-none rounded-lg border border-border bg-surface px-[9px] py-[6px] text-right font-mono text-body text-text outline-none focus:border-accent';

interface ConnectionTestState {
    describe(idle: string, running: string, passed: (result: ConnectionTest) => string): string;
    failed: boolean;
    run(work: () => Promise<ConnectionTest>): void;
    running: boolean;
}

export function KeysPane() {
    const [filter, setFilter] = useState('');

    const groups = useMemo(() => {
        const query = filter.trim().toLowerCase();

        if (!query) {
            return SHORTCUT_GROUPS;
        }

        return SHORTCUT_GROUPS.map((g) => ({
            ...g,
            rows: g.rows.filter(
                (row) =>
                    row.label.toLowerCase().includes(query) ||
                    row.keys.join('').toLowerCase().includes(query),
            ),
        })).filter((g) => g.rows.length > 0);
    }, [filter]);

    return (
        <>
            <label className="mb-5 flex items-center gap-2 rounded-lg bg-surface3 px-[10px] py-[7px] text-body text-text3">
                <SettingsIcon name="search" size={14} sw={1.9} />
                <input
                    className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-text outline-none"
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="Filter shortcuts"
                    value={filter}
                />
            </label>

            {groups.map((group) => (
                <div className="mb-[22px]" key={group.name}>
                    <SectionLabel first>{group.name}</SectionLabel>
                    {group.rows.map((row, index) => (
                        <div
                            className={cn(
                                'flex items-center gap-4 border-b border-border-soft py-[9px]',
                                index === group.rows.length - 1 && 'border-b-0',
                            )}
                            key={`${group.name}:${row.label}`}
                        >
                            <span className="min-w-0 flex-1 text-body-lg">{row.label}</span>
                            <span className="flex flex-none gap-1">
                                {row.keys.map((key, ki) => (
                                    <KeyCap key={ki}>{key}</KeyCap>
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
    const notifStyle = useStore((state) => state.prefs.notifStyle);
    const setPref = useStore((state) => state.setPref);
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

/**
 * Unlike the Unsplash key, this one is never held here: it is handed to the
 * engine, which keeps it in the system keychain, and all that comes back is
 * whether one is stored. So the field is for replacing a key, not showing it.
 */
function AiKeyRow({
    backend,
    onChange,
    optional,
}: {
    backend: AiBackendStatus;
    onChange: () => void;
    optional?: boolean;
}) {
    const baseUrl = useStore((state) => state.prefs.aiBaseUrl);
    const [draft, setDraft] = useState('');
    const [failure, setFailure] = useState<null | string>(null);

    const run = (work: Promise<void>) => {
        setFailure(null);
        work.then(() => {
            setDraft('');
            onChange();
        }).catch((error: unknown) => {
            setFailure(error instanceof Error ? error.message : 'The key could not be saved.');
        });
    };

    const save = () => {
        if (draft.trim()) {
            run(
                getAi().setKey(
                    backend.id,
                    draft.trim(),
                    backend.id === 'openai-compatible' ? baseUrl : undefined,
                ),
            );
        }
    };

    return (
        <Row
            desc={
                failure ??
                (optional
                    ? 'Only if the endpoint asks for one, and only ever sent to the endpoint above. Kept in the system keychain, never in the vault.'
                    : 'Kept in the system keychain on this Mac, never in the vault and never shown again.')
            }
            title="API key"
        >
            <div className="flex w-[210px] flex-none flex-col items-end gap-[6px]">
                <input
                    aria-label={`${backend.label} API key`}
                    className={cn(TEXT_FIELD, 'w-full')}
                    onBlur={save}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            save();
                        }
                    }}
                    placeholder={backend.hasKey ? 'Saved. Paste to replace' : 'Paste a key'}
                    spellCheck={false}
                    type="password"
                    value={draft}
                />
                {backend.hasKey && (
                    <button
                        className="border-none bg-transparent p-0 font-[inherit] text-body text-text3 underline"
                        onClick={() => run(getAi().clearKey(backend.id))}
                        type="button"
                    >
                        Remove key
                    </button>
                )}
            </div>
        </Row>
    );
}

function AssistantRows() {
    const chosen = useStore((state) => state.prefs.aiBackend);
    const setPref = useStore((state) => state.setPref);
    const [backends, setBackends] = useState<AiBackendStatus[]>([]);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        let cancelled = false;

        getAi()
            .status()
            .then((status) => {
                if (!cancelled) {
                    setBackends(status);
                }
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [revision]);

    const current = backends.find((backend) => backend.id === chosen);
    // An agent that is not installed cannot be picked, but one that was picked
    // and has since been removed still has to show as the choice it is.
    const options: ChoiceOption<string>[] = [
        { label: 'Off', value: '' },
        ...backends
            .filter((backend) => backend.available || backend.id === chosen)
            .map((backend) => ({
                label: backend.available ? backend.label : `${backend.label} (not installed)`,
                value: backend.id,
            })),
    ];

    return (
        <>
            <Row desc={privacyNote(current)} title="Model">
                <Chooser
                    label="Model"
                    onChange={(value) => {
                        setPref('aiBackend', value || null);
                        setPref('aiModel', '');
                    }}
                    options={options}
                    value={chosen ?? ''}
                />
            </Row>
            {current?.kind === 'api' && current.id !== 'openai-compatible' && (
                <AiKeyRow backend={current} onChange={() => setRevision((count) => count + 1)} />
            )}
            {current?.id === 'openai-compatible' && (
                <>
                    <PrefTextRow
                        desc="Where the endpoint listens, up to and including /v1. Ollama’s is http://localhost:11434/v1."
                        name="aiBaseUrl"
                        placeholder="http://localhost:11434/v1"
                        title="Endpoint URL"
                    />
                    <AiKeyRow
                        backend={current}
                        onChange={() => setRevision((count) => count + 1)}
                        optional
                    />
                </>
            )}
            {current && (
                <PrefTextRow
                    desc={
                        current.kind === 'harness'
                            ? `Leave empty to use ${current.label}’s own default.`
                            : current.defaultModel
                              ? `Leave empty to use ${current.defaultModel}.`
                              : 'The model’s id, exactly as the provider names it.'
                    }
                    name="aiModel"
                    placeholder={
                        current.defaultModel ??
                        (current.kind === 'harness' ? 'Default' : 'Model id')
                    }
                    title="Model name"
                />
            )}
            {current && <ModelTestRow label={current.label} />}
        </>
    );
}

/** Whether the chosen model answers, without opening Ask Lore to find out. */
function ModelTestRow({ label }: { label: string }) {
    const backend = useStore((state) => state.prefs.aiBackend);
    const model = useStore((state) => state.prefs.aiModel);
    const baseUrl = useStore((state) => state.prefs.aiBaseUrl);
    const test = useConnectionTest(`${backend}\0${model}\0${baseUrl}`);

    const run = (): void =>
        test.run(() =>
            getAi().testModel({
                backend: backend ?? '',
                baseUrl: baseUrl || undefined,
                model: model || undefined,
            }),
        );

    return (
        <Row
            desc={test.describe(
                `Asks ${label} for a one-word answer, the way Ask Lore would.`,
                `Waiting for ${label} to answer…`,
                (result) => `${label} answered in ${seconds(result.ms)}: “${result.detail}”`,
            )}
            failed={test.failed}
            title="Test the connection"
        >
            <PillButton disabled={test.running} onClick={run}>
                {test.running ? 'Testing…' : 'Test'}
            </PillButton>
        </Row>
    );
}

function PrefTextRow({
    desc,
    name,
    placeholder,
    title,
}: {
    desc: string;
    name: 'aiBaseUrl' | 'aiModel';
    placeholder: string;
    title: string;
}) {
    const saved = useStore((state) => state.prefs[name]);
    const setPref = useStore((state) => state.setPref);
    const [draft, setDraft] = useState(saved);

    useEffect(() => setDraft(saved), [saved]);

    const commit = () => {
        if (draft.trim() !== saved) {
            setPref(name, draft.trim());
        }
    };

    return (
        <Row desc={desc} title={title}>
            <input
                aria-label={title}
                className={TEXT_FIELD}
                onBlur={commit}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        commit();
                    }
                }}
                placeholder={placeholder}
                spellCheck={false}
                value={draft}
            />
        </Row>
    );
}

/** What choosing a backend means for where the user's notes go. */
function privacyNote(backend: AiBackendStatus | undefined): string {
    if (!backend) {
        return 'Off. Ask Lore and suggestions are unavailable, and nothing leaves this Mac.';
    }

    if (backend.kind === 'harness') {
        return `Runs ${backend.label} on this Mac with its own sign-in. Your question, and the notes it reads to answer, go to whichever provider ${backend.label} is set up with. It can only read the vault, never change it.`;
    }

    if (backend.id === 'openai-compatible') {
        return 'Your question, and the notes read to answer it, go to the endpoint below. Point it at a model running on this Mac and nothing leaves it.';
    }

    return `Your question, and the notes read to answer it, go to ${backend.label} under your own API key.`;
}

function seconds(ms: number): string {
    return `${(ms / 1000).toFixed(1)} s`;
}

function shortcutRows(group: HotkeyCommand['group']): { keys: string[]; label: string }[] {
    const commands: readonly HotkeyCommand[] = HOTKEYS;

    return commands
        .filter((command) => command.group === group)
        .map((command) => ({
            keys: hotkeyKeys(command.hotkey),
            label: command.label,
        }));
}

/**
 * The Access Key for the Properties panel's photo search. Stored with the rest
 * of the preferences, so it sits in this Mac's local storage rather than in the
 * vault — a key must not travel with a folder that gets synced or shared.
 */
function UnsplashKeyRow() {
    const saved = useStore((state) => state.prefs.unsplashKey);
    const setPref = useStore((state) => state.setPref);
    const [draft, setDraft] = useState(saved ?? '');

    // A key pasted in another window (or cleared) should show here too.
    useEffect(() => setDraft(saved ?? ''), [saved]);

    const commit = () => {
        const next = draft.trim();

        if (next !== (saved ?? '')) {
            setPref('unsplashKey', next || null);
        }
    };

    return (
        <Row
            desc="Paste a free Access Key from unsplash.com/developers to search photos from the thumbnail menu. Without one, that menu entry is simply not offered."
            title="Unsplash Access Key"
        >
            <div className="flex w-[210px] flex-none flex-col items-end gap-[6px]">
                <input
                    className="w-full rounded-lg border border-border bg-surface px-[9px] py-[6px] text-right font-mono text-body text-text outline-none focus:border-accent"
                    onBlur={commit}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            commit();
                        }
                    }}
                    placeholder="Access Key"
                    spellCheck={false}
                    // A key is a secret, and settings get opened over a shoulder.
                    type="password"
                    value={draft}
                />
                <button
                    className="border-none bg-transparent p-0 font-[inherit] text-body text-text3 underline"
                    onClick={() => openExternal(UNSPLASH_DEVELOPERS)}
                    type="button"
                >
                    Get a key
                </button>
            </div>
        </Row>
    );
}

/** A result is forgotten when `subject` changes, since it was about something else. */
function useConnectionTest(subject: string): ConnectionTestState {
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<ConnectionTest | null>(null);

    useEffect(() => setResult(null), [subject]);

    return {
        describe(idle, waiting, passed) {
            if (running) {
                return waiting;
            }

            if (!result) {
                return idle;
            }

            return result.ok
                ? passed(result)
                : `Failed after ${seconds(result.ms)}: ${result.detail}`;
        },
        failed: !running && result?.ok === false,
        run(work) {
            if (running) {
                return;
            }

            setRunning(true);
            work()
                .catch((error: unknown): ConnectionTest => ({
                    detail: error instanceof Error ? error.message : String(error),
                    ms: 0,
                    ok: false,
                }))
                .then((outcome) => {
                    setResult(outcome);
                    setRunning(false);
                });
        },
        running,
    };
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
    const weekStart = useStore((state) => state.prefs.weekStart);
    const setPref = useStore((state) => state.setPref);

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
    const durations = useStore((state) => state.prefs.durations);
    const bump = useStore((state) => state.bumpDuration);
    const longBreakAfter = useStore((state) => state.prefs.longBreakAfter);
    const setPref = useStore((state) => state.setPref);

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
    const items = useStore((state) => state.items);
    const workspacePath = useStore((state) => state.workspacePath);

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
