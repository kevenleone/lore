// `Lore Onboarding.dc.html` — the first-launch sheet. Lore is offline: there is
// no account, no sign-in and nothing to connect, so the only decision is which
// folder on this Mac holds the vault. Three states share one card: the picker,
// the new-vault form (with the optional Git toggle), and the list of folders
// this Mac has opened before.
//
// The card floats over a scrim covering the whole window, so nothing behind it
// is reachable until a vault is chosen.

import { useEffect, useState } from 'react';

import type { SettingsIconName } from '../common/settingsGlyphs';

import { cn } from '../../lib/cn';
import { isVaultTracked } from '../../lib/vaultGit';
import {
    homeDirectory,
    pickWorkspaceFolder,
    suggestedVaultPath,
    tildePath,
} from '../../lib/workspace';
import { useStore } from '../../store/useStore';
import { LoreMark, WORDMARK_FONT } from '../common/LoreMark';
import { SettingsIcon } from '../common/settingsGlyphs';

const BUTTON_BASE =
    'text-title flex h-[42px] w-full cursor-pointer items-center justify-center gap-2 rounded-10 font-[inherit]';

/** Accent-filled call to action. */
const PRIMARY_BUTTON = cn(
    BUTTON_BASE,
    'border-none bg-accent font-semibold text-white not-disabled:hover:brightness-[1.18] disabled:cursor-not-allowed disabled:opacity-45',
);

/** Outlined secondary action — "Browse for a folder…". */
const GHOST_BUTTON = cn(
    BUTTON_BASE,
    'border border-dash bg-surface font-[560] text-text hover:bg-surface2',
);

/** Text-only "back" affordance under the primary action. */
const QUIET_BUTTON =
    'text-subhead mt-[6px] flex h-[38px] w-full cursor-pointer items-center justify-center rounded-10 border-none bg-transparent font-[inherit] text-text2 hover:bg-sel hover:text-text';

const COPY = {
    create: {
        body: 'Lore creates the folder structure and index. You can move the folder later.',
        title: 'New vault',
    },
    open: {
        body: 'Point Lore at a folder you already have. Existing notes are indexed in place.',
        title: 'Open a vault',
    },
    pick: {
        body: 'Pick a folder to hold your vault. Everything lives there as plain files on this Mac.',
        title: 'Welcome to Lore',
    },
} as const;

interface Lane {
    body: string;
    /** The chip's colours, as the design's own violet / blue / green. */
    chip: string;
    icon: SettingsIconName;
    starter: boolean;
    step: 'create' | 'open';
    title: string;
}

/** The three ways in, in the order the design lists them. */
const LANES: Lane[] = [
    {
        body: 'A small set of notes and folders that shows how Lore is organised.',
        chip: 'bg-lane-starter-bg text-lane-starter-fg',
        icon: 'unpack',
        starter: true,
        step: 'create',
        title: 'Start from a starter vault',
    },
    {
        body: 'A new folder with Lore defaults and nothing else in it.',
        chip: 'bg-lane-empty-bg text-lane-empty-fg',
        icon: 'plus',
        starter: false,
        step: 'create',
        title: 'Create an empty vault',
    },
    {
        body: 'Choose a folder of files you already keep on this Mac.',
        chip: 'bg-lane-open-bg text-lane-open-fg',
        icon: 'folder',
        starter: false,
        step: 'open',
        title: 'Open an existing vault',
    },
];

export function Onboarding() {
    const step = useStore((s) => s.onboardingStep);
    const setStep = useStore((s) => s.setOnboardingStep);
    const finish = useStore((s) => s.finishOnboarding);
    const recents = useStore((s) => s.recentWorkspaces);
    const workspaceError = useStore((s) => s.workspaceError);

    const [home, setHome] = useState<null | string>(null);
    const [path, setPath] = useState<null | string>(null);
    const [starter, setStarter] = useState(false);
    const [git, setGit] = useState(false);
    const [busy, setBusy] = useState(false);

    // The suggested location is `~/Documents/Lore Vault`; both resolve to null
    // in the browser preview, where the card is a mock with no vault behind it.
    useEffect(() => {
        let live = true;
        void (async () => {
            const [resolvedHome, suggested] = await Promise.all([
                homeDirectory(),
                suggestedVaultPath(),
            ]);
            if (!live) return;
            setHome(resolvedHome);
            setPath((current) => current ?? suggested);
        })();
        return () => {
            live = false;
        };
    }, []);

    const enter = (lane: Lane) => {
        setStarter(lane.starter);
        setStep(lane.step);
    };

    const commit = async (setup: { git: boolean; path: null | string; starter: boolean }) => {
        setBusy(true);
        try {
            await finish(setup);
        } finally {
            setBusy(false);
        }
    };

    const copy = COPY[step];

    return (
        <div className="absolute inset-0 z-100 flex items-center justify-center bg-[radial-gradient(125%_120%_at_72%_8%,#dadce6_0%,#c8cad7_46%,#b9bbcb_100%)]">
            <div
                aria-label="Choose a vault"
                aria-modal="true"
                className="max-h-[calc(100%-60px)] w-[452px] overflow-y-auto rounded-2xl border border-border bg-surface text-text shadow-float"
                role="dialog"
            >
                <div className="px-[34px] pt-[26px] pb-[30px]">
                    <div className="flex justify-center text-accent">
                        <LoreMark size={34} />
                    </div>
                    <h2
                        className="mt-4 mb-0 text-center text-[31px] leading-[1.15] font-normal tracking-[-.01em]"
                        // The wordmark's face is the mark's own, not the UI font.
                        style={{ fontFamily: WORDMARK_FONT }}
                    >
                        {copy.title}
                    </h2>
                    <p className="mt-[9px] mb-0 text-center text-subhead leading-[1.55] text-pretty text-text2">
                        {copy.body}
                    </p>

                    {step === 'pick' && <PickCard onEnter={enter} />}

                    {step === 'create' && (
                        <CreateCard
                            busy={busy}
                            git={git}
                            home={home}
                            onBack={() => setStep('pick')}
                            onChoose={async () => {
                                const picked = await pickWorkspaceFolder();
                                if (picked) setPath(picked);
                            }}
                            onCreate={() => void commit({ git, path, starter })}
                            onToggleGit={() => setGit((on) => !on)}
                            path={path}
                        />
                    )}

                    {step === 'open' && (
                        <OpenCard
                            busy={busy}
                            home={home}
                            onBack={() => setStep('pick')}
                            onBrowse={async () => {
                                const picked = await pickWorkspaceFolder();
                                if (picked)
                                    await commit({ git: false, path: picked, starter: false });
                            }}
                            onOpen={(recentPath) =>
                                void commit({ git: false, path: recentPath, starter: false })
                            }
                            recents={recents}
                        />
                    )}

                    {workspaceError !== null && (
                        <p className="mt-[14px] mb-0 text-center text-body leading-[1.5] text-pretty text-danger">
                            {workspaceError}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ *
 * State 1 — the vault picker
 * ------------------------------------------------------------------ */

function CreateCard({
    busy,
    git,
    home,
    onBack,
    onChoose,
    onCreate,
    onToggleGit,
    path,
}: {
    busy: boolean;
    git: boolean;
    home: null | string;
    onBack: () => void;
    onChoose: () => void;
    onCreate: () => void;
    onToggleGit: () => void;
    path: null | string;
}) {
    return (
        <div className="mt-[22px]">
            <div className="text-label font-[680] tracking-[.07em] text-faint uppercase">
                Vault location
            </div>
            <div className="mt-2 flex h-[42px] items-center gap-[10px] rounded-10 border border-dash pr-[6px] pl-[13px]">
                <span className="inline-flex text-text3">
                    <SettingsIcon name="folder" size={17} sw={1.7} />
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-body-sm text-text">
                    {path === null
                        ? 'The default vault, beside Lore’s own data'
                        : tildePath(path, home)}
                </span>
                <button
                    className="inline-flex h-[30px] cursor-pointer items-center rounded-lg border border-border bg-sel px-3 font-[inherit] text-body font-[560] text-text hover:bg-hover"
                    onClick={onChoose}
                    type="button"
                >
                    Choose…
                </button>
            </div>

            <button
                aria-pressed={git}
                className={cn(
                    'mt-[14px] flex w-full cursor-pointer items-start gap-3 rounded-xl border px-[14px] py-[13px] text-left font-[inherit]',
                    git ? 'border-accent bg-surface2' : 'border-border bg-surface',
                )}
                onClick={onToggleGit}
                type="button"
            >
                <span
                    className={cn(
                        'mt-px inline-flex h-[22px] w-[38px] flex-none justify-start rounded-full p-[2px]',
                        git ? 'justify-end bg-accent' : 'justify-start bg-track-off',
                    )}
                >
                    <span className="h-[18px] w-[18px] rounded-full bg-knob shadow-[0_1px_2px_rgba(0,0,0,.2)]" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-subhead font-semibold">
                        Track this vault with Git
                    </span>
                    <span className="mt-[2px] block text-body leading-[1.45] text-text3">
                        {git
                            ? 'Lore will run git init here and write a .gitignore for its index.'
                            : 'Optional. Version history in the vault folder, no remote required.'}
                    </span>
                </span>
            </button>

            <button
                className={cn(PRIMARY_BUTTON, 'mt-4')}
                disabled={busy}
                onClick={onCreate}
                type="button"
            >
                {busy ? 'Creating…' : 'Create vault'}
            </button>
            <button className={QUIET_BUTTON} disabled={busy} onClick={onBack} type="button">
                Back
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ *
 * State 2 — create a vault
 * ------------------------------------------------------------------ */

function OpenCard({
    busy,
    home,
    onBack,
    onBrowse,
    onOpen,
    recents,
}: {
    busy: boolean;
    home: null | string;
    onBack: () => void;
    onBrowse: () => void;
    onOpen: (path: string) => void;
    recents: readonly { name: string; path: string }[];
}) {
    const tracked = useTrackedVaults(recents);

    return (
        <>
            {recents.length > 0 && (
                <div className="mt-[22px] flex flex-col gap-px overflow-hidden rounded-xl border border-border">
                    {recents.map((recent) => (
                        <button
                            className="flex cursor-pointer items-start gap-[11px] border-b border-border-soft bg-surface2 px-[15px] py-[13px] text-left font-[inherit] hover:bg-hover"
                            disabled={busy}
                            key={recent.path}
                            onClick={() => onOpen(recent.path)}
                            type="button"
                        >
                            <span className="mt-[2px] inline-flex text-text3">
                                <SettingsIcon name="folder" size={17} sw={1.7} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-body-lg font-semibold">
                                    {recent.name}
                                </span>
                                <span className="mt-[3px] block truncate font-mono text-label text-text3">
                                    {tildePath(recent.path, home)}
                                </span>
                            </span>
                            <span
                                className={cn(
                                    'mt-[2px] flex-none rounded-full px-2 py-[3px] text-caption font-[620] tracking-[.03em]',
                                    tracked[recent.path]
                                        ? 'bg-type-task-bg text-type-task-fg'
                                        : 'bg-sel text-text3',
                                )}
                            >
                                {tracked[recent.path] ? 'Git' : 'Plain'}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <button
                className={cn(GHOST_BUTTON, 'mt-4')}
                disabled={busy}
                onClick={onBrowse}
                type="button"
            >
                Browse for a folder…
            </button>
            <button className={QUIET_BUTTON} disabled={busy} onClick={onBack} type="button">
                Back
            </button>
        </>
    );
}

/* ------------------------------------------------------------------ *
 * State 3 — open an existing vault
 * ------------------------------------------------------------------ */

function PickCard({ onEnter }: { onEnter: (lane: Lane) => void }) {
    return (
        <>
            <div className="mt-[22px] mb-[18px] h-px bg-border-soft" />
            <div className="flex flex-col gap-[9px]">
                {LANES.map((lane, index) => (
                    <button
                        className={cn(
                            'flex w-full cursor-pointer items-start gap-[13px] rounded-xl border px-[14px] py-[13px] text-left font-[inherit] hover:border-accent-border hover:bg-surface2',
                            // The design rests on the first lane, which is the one
                            // most people want.
                            index === 0 ? 'border-border bg-surface2' : 'border-border bg-surface',
                        )}
                        key={lane.title}
                        onClick={() => onEnter(lane)}
                        type="button"
                    >
                        <span
                            className={cn(
                                'inline-flex h-[38px] w-[38px] flex-none items-center justify-center rounded-10',
                                lane.chip,
                            )}
                        >
                            <SettingsIcon name={lane.icon} size={18} sw={1.7} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-subhead font-[620]">{lane.title}</span>
                            <span className="mt-[2px] block text-body leading-[1.45] text-text3">
                                {lane.body}
                            </span>
                        </span>
                        <span className="mt-[9px] inline-flex text-dash">
                            <SettingsIcon name="chevronRight" size={15} sw={1.7} />
                        </span>
                    </button>
                ))}
            </div>
            <p className="mt-5 mb-0 text-center text-body leading-[1.5] text-faint">
                New to Lore?{' '}
                <a className="text-text2 no-underline hover:text-text" href="#guide">
                    Read the vault primer ↗
                </a>
            </p>
        </>
    );
}

/**
 * Which recent folders are already Git repositories, so the rows can say so.
 *
 * Answered by looking for `.git` on disk rather than by remembering what Lore
 * itself set up: a vault the user put under version control on their own is
 * tracked too, and the row would otherwise lie about it.
 */
function useTrackedVaults(recents: readonly { path: string }[]): Record<string, boolean> {
    const [tracked, setTracked] = useState<Record<string, boolean>>({});

    const paths = recents.map((r) => r.path).join('\n');

    useEffect(() => {
        let live = true;
        void (async () => {
            const entries = await Promise.all(
                paths
                    .split('\n')
                    .filter(Boolean)
                    .map(async (path) => [path, await isVaultTracked(path)] as const),
            );
            if (live) setTracked(Object.fromEntries(entries));
        })();
        return () => {
            live = false;
        };
    }, [paths]);

    return tracked;
}
