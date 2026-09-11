// The strip along the bottom of the main window: what scopes the view (vault,
// version, Git) on the left, and the chrome that does not belong in any pane
// on the right.

import { useEffect, useState } from 'react';

import { APP_LINKS, APP_VERSION, openExternal } from '../../lib/appInfo';
import { cn } from '../../lib/cn';
import { isVaultTracked } from '../../lib/vaultGit';
import { workspaceName } from '../../lib/workspace';
import { useStore } from '../../store/useStore';
import { effectiveTheme } from '../../theme/tokens';
import { External, GitBranch, Moon, Settings, Sun } from '../common/glyphs';
import { Icon } from '../common/Icon';
import { SettingsIcon } from '../common/settingsGlyphs';
import { Tooltip } from '../common/Tooltip';

const DEFAULT_LABEL = 'Local vault';

const SEGMENT =
    'flex items-center gap-[5px] rounded-md border-none bg-transparent px-[6px] py-[3px] font-[inherit] text-caption text-text2 hover:bg-hover';

const ICON_SEGMENT = cn(SEGMENT, 'h-[22px] w-[22px] justify-center px-0');

export function StatusBar() {
    const workspacePath = useStore((s) => s.workspacePath);
    const appearance = useStore((s) => s.prefs.appearance);
    const openSettings = useStore((s) => s.openSettings);
    const setAppearance = useStore((s) => s.setAppearance);

    const tracked = useVaultTracked();
    const dark = effectiveTheme(appearance) === 'dark';

    return (
        <div
            className="flex flex-none items-center gap-[2px] border-t border-border bg-surface2 px-[8px] py-[3px]"
            role="contentinfo"
        >
            <button className={SEGMENT} onClick={() => openSettings('vault')} type="button">
                <Icon name="layers" size={12} />
                <span className="max-w-[220px] truncate">
                    {workspacePath ? workspaceName(workspacePath) : DEFAULT_LABEL}
                </span>
            </button>

            <Divider />

            <button className={SEGMENT} onClick={() => openSettings('about')} type="button">
                <SettingsIcon name="info" size={12} />
                <span>{APP_VERSION}</span>
            </button>

            {/*
             * The default vault has no path to hand the engine, so there is nothing
             * to ask about — the segment goes away rather than guessing an answer.
             */}
            {tracked !== null && (
                <>
                    <Divider />
                    <button className={SEGMENT} onClick={() => openSettings('vault')} type="button">
                        <GitBranch size={12} />
                        <span>{tracked ? 'Tracked by Git' : 'Not tracked'}</span>
                    </button>
                </>
            )}

            <div className="flex-1" />

            <button
                className={SEGMENT}
                onClick={() => void openExternal(APP_LINKS.issues)}
                type="button"
            >
                <External size={11} />
                <span>Contribute</span>
            </button>

            <button
                className={SEGMENT}
                onClick={() => void openExternal(APP_LINKS.readme)}
                type="button"
            >
                <External size={11} />
                <span>Documentation</span>
            </button>

            <Divider />

            <Tooltip align="end" label={dark ? 'Switch to light' : 'Switch to dark'} side="above">
                <button
                    aria-label={dark ? 'Switch to light' : 'Switch to dark'}
                    className={ICON_SEGMENT}
                    onClick={() => setAppearance(dark ? 'light' : 'dark')}
                    type="button"
                >
                    {dark ? <Sun size={13} /> : <Moon size={13} />}
                </button>
            </Tooltip>

            <Tooltip align="end" label="Settings" side="above">
                <button
                    aria-label="Settings"
                    className={ICON_SEGMENT}
                    onClick={() => openSettings()}
                    type="button"
                >
                    <Settings size={13} />
                </button>
            </Tooltip>
        </div>
    );
}

function Divider() {
    return <span className="mx-[2px] h-[13px] w-px flex-none bg-border" />;
}

function useVaultTracked(): boolean | null {
    const workspacePath = useStore((s) => s.workspacePath);
    const [tracked, setTracked] = useState<boolean | null>(null);

    useEffect(() => {
        if (!workspacePath) {
            setTracked(null);
            return;
        }
        let live = true;
        void isVaultTracked(workspacePath).then((result) => {
            if (live) setTracked(result);
        });
        return () => {
            live = false;
        };
    }, [workspacePath]);

    return tracked;
}
