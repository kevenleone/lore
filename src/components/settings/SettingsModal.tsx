// `Lore Settings.dc.html` frame 1a — settings as a modal sheet over the
// knowledge-base window: a scrim, a 232px pane rail on the left, and the active
// pane on the right. Esc and the scrim both dismiss it.

import { useEffect, useMemo, useRef, useState } from 'react';

import type { SettingsPane } from '../../store/types';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { LoreMark } from '../common/LoreMark';
import { SettingsIcon, type SettingsIconName } from '../common/settingsGlyphs';
import { ICON_BUTTON } from './controls';
import {
    AboutPane,
    AccountPane,
    CalendarPane,
    CapturePane,
    FocusPane,
    GeneralPane,
    KeysPane,
    LookPane,
    NotifPane,
    SyncPane,
} from './panes';

/** A pane entry in the left rail. */
const NAV_ITEM =
    'text-body-lg flex w-full cursor-pointer items-center gap-[10px] rounded-lg border-none bg-transparent px-2 py-[6px] text-left font-[inherit] hover:bg-hover';

interface PaneDef {
    Body: () => React.JSX.Element;
    icon: SettingsIconName;
    id: SettingsPane;
    label: string;
}

const PANES: PaneDef[] = [
    { Body: GeneralPane, icon: 'gear', id: 'general', label: 'General' },
    { Body: AccountPane, icon: 'user', id: 'account', label: 'Account' },
    { Body: LookPane, icon: 'palette', id: 'look', label: 'Look & Feel' },
    { Body: KeysPane, icon: 'keyboard', id: 'keys', label: 'Keyboard Shortcuts' },
    { Body: NotifPane, icon: 'bell', id: 'notif', label: 'Notifications' },
    { Body: CapturePane, icon: 'sparkle', id: 'capture', label: 'Capture & AI' },
    { Body: SyncPane, icon: 'cloud', id: 'sync', label: 'Sync' },
    { Body: FocusPane, icon: 'timer', id: 'focus', label: 'Focus & Timer' },
    { Body: CalendarPane, icon: 'calendar', id: 'cal', label: 'Calendar' },
    { Body: AboutPane, icon: 'info', id: 'about', label: 'About' },
];

export function SettingsModal() {
    const pane = useStore((s) => s.settingsPane);
    const setPane = useStore((s) => s.setSettingsPane);
    const close = useStore((s) => s.closeSettings);
    const [filter, setFilter] = useState('');
    const sheetRef = useRef<HTMLDivElement>(null);

    // Esc closes; focus moves into the sheet so keyboard users land inside it.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                close();
            }
        };
        window.addEventListener('keydown', onKey);
        sheetRef.current?.focus();
        return () => window.removeEventListener('keydown', onKey);
    }, [close]);

    const visible = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return q ? PANES.filter((p) => p.label.toLowerCase().includes(q)) : PANES;
    }, [filter]);

    const active = PANES.find((p) => p.id === pane) ?? PANES[0];

    return (
        <>
            <div
                className="absolute inset-0 z-20 animate-scrim-fade-in bg-scrim backdrop-blur-[2px]"
                onClick={close}
            />
            <div
                aria-label="Lore settings"
                aria-modal="true"
                // The centring stays in `transform` so the entrance keyframe,
                // which animates the same property, replaces it rather than
                // composing with a `translate` utility.
                className="absolute top-1/2 left-1/2 z-30 flex h-[min(700px,calc(100%-64px))] w-[min(1000px,calc(100%-64px))] [transform:translate(-50%,-50%)] animate-sheet-in overflow-hidden rounded-2xl border border-border bg-surface text-text shadow-sheet"
                ref={sheetRef}
                role="dialog"
                tabIndex={-1}
            >
                {/* ---- rail ---- */}
                <div className="flex w-[232px] flex-none flex-col border-r border-border bg-surface2 px-[10px] pt-[14px] pb-[10px]">
                    <label className="mb-3 flex items-center gap-2 rounded-lg bg-surface3 px-[9px] py-[6px] text-body text-text3">
                        <SettingsIcon name="search" size={14} sw={1.9} />
                        <input
                            className="min-w-0 flex-1 border-none bg-transparent font-[inherit] text-text outline-none"
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Search settings"
                            value={filter}
                        />
                    </label>

                    <div className="flex flex-col gap-px overflow-auto">
                        {visible.map((p) => {
                            const on = p.id === pane;
                            return (
                                <button
                                    aria-current={on ? 'page' : undefined}
                                    className={cn(
                                        NAV_ITEM,
                                        on
                                            ? 'bg-accent-tint font-semibold text-accent'
                                            : 'text-text2',
                                    )}
                                    key={p.id}
                                    onClick={() => setPane(p.id)}
                                    type="button"
                                >
                                    <span
                                        className={cn(
                                            'flex h-6 w-6 flex-none items-center justify-center rounded-7',
                                            on ? 'bg-accent text-white' : 'bg-surface3 text-text2',
                                        )}
                                    >
                                        <SettingsIcon name={p.icon} size={15} />
                                    </span>
                                    <span className="flex-1">{p.label}</span>
                                </button>
                            );
                        })}
                        {visible.length === 0 && (
                            <div className="px-[9px] py-2 text-body text-text3">
                                No matching settings.
                            </div>
                        )}
                    </div>

                    <div className="min-h-3 flex-1" />
                    <div className="flex items-center gap-[9px] border-t border-border px-[10px] py-[9px] text-label text-text3">
                        <span className="inline-flex text-text2">
                            <LoreMark size={13} />
                        </span>
                        <span>Lore 2.4.1 · up to date</span>
                    </div>
                </div>

                {/* ---- pane ---- */}
                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex h-[52px] flex-none items-center gap-3 border-b border-border pr-5 pl-[26px]">
                        <span className="text-title font-[680] tracking-[-.005em]">
                            {active.label}
                        </span>
                        <button
                            aria-label="Close settings"
                            className={cn(ICON_BUTTON, 'ml-auto h-7 w-7')}
                            onClick={close}
                            type="button"
                        >
                            <SettingsIcon name="close" size={17} sw={1.9} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-auto px-[26px] pt-6 pb-[30px]">
                        <active.Body />
                    </div>
                </div>
            </div>
        </>
    );
}
