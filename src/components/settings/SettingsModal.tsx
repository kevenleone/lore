// `Lore Settings.dc.html` frame 1a — settings as a modal sheet over the
// knowledge-base window: a scrim, a 232px pane rail on the left, and the active
// pane on the right. Esc and the scrim both dismiss it.

import { useEffect, useMemo, useRef, useState } from 'react';

import type { SettingsPane } from '../../store/types';

import { useStore } from '../../store/useStore';
import { LoreMark } from '../common/LoreMark';
import { SettingsIcon, type SettingsIconName } from '../common/settingsGlyphs';
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
import { iconButton, navItem, scrim, sheet } from './SettingsModal.css';

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
            <div className={scrim} onClick={close} />
            <div
                aria-label="Lore settings"
                aria-modal="true"
                className={sheet}
                ref={sheetRef}
                role="dialog"
                tabIndex={-1}
            >
                {/* ---- rail ---- */}
                <div
                    style={{
                        background: 'var(--surface2, #fafafa)',
                        borderRight: '1px solid var(--border, #ececef)',
                        display: 'flex',
                        flex: 'none',
                        flexDirection: 'column',
                        padding: '14px 10px 10px',
                        width: 232,
                    }}
                >
                    <label
                        style={{
                            alignItems: 'center',
                            background: 'var(--surface3, #f1f1f3)',
                            borderRadius: 8,
                            color: 'var(--text3, #9a9aa5)',
                            display: 'flex',
                            fontSize: 12.5,
                            gap: 8,
                            marginBottom: 12,
                            padding: '6px 9px',
                        }}
                    >
                        <SettingsIcon name="search" size={14} sw={1.9} />
                        <input
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder="Search settings"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text, #1a1a1f)',
                                flex: 1,
                                font: 'inherit',
                                minWidth: 0,
                                outline: 'none',
                            }}
                            value={filter}
                        />
                    </label>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1,
                            overflow: 'auto',
                        }}
                    >
                        {visible.map((p) => {
                            const on = p.id === pane;
                            return (
                                <button
                                    aria-current={on ? 'page' : undefined}
                                    className={navItem}
                                    key={p.id}
                                    onClick={() => setPane(p.id)}
                                    style={
                                        on
                                            ? {
                                                  background: 'var(--ac-tint, #eeeef2)',
                                                  color: 'var(--ac)',
                                                  fontWeight: 600,
                                              }
                                            : { color: 'var(--text2, #3b3b44)' }
                                    }
                                    type="button"
                                >
                                    <span
                                        style={{
                                            alignItems: 'center',
                                            borderRadius: 7,
                                            display: 'flex',
                                            flex: 'none',
                                            height: 24,
                                            justifyContent: 'center',
                                            width: 24,
                                            ...(on
                                                ? { background: 'var(--ac)', color: '#fff' }
                                                : {
                                                      background: 'var(--surface3, #f1f1f3)',
                                                      color: 'var(--text2, #6b6b76)',
                                                  }),
                                        }}
                                    >
                                        <SettingsIcon name={p.icon} size={15} />
                                    </span>
                                    <span style={{ flex: 1 }}>{p.label}</span>
                                </button>
                            );
                        })}
                        {visible.length === 0 && (
                            <div
                                style={{
                                    color: 'var(--text3, #9a9aa5)',
                                    fontSize: 12.5,
                                    padding: '8px 9px',
                                }}
                            >
                                No matching settings.
                            </div>
                        )}
                    </div>

                    <div style={{ flex: 1, minHeight: 12 }} />
                    <div
                        style={{
                            alignItems: 'center',
                            borderTop: '1px solid var(--border, #ececef)',
                            color: 'var(--text3, #9a9aa5)',
                            display: 'flex',
                            fontSize: 11.5,
                            gap: 9,
                            padding: '9px 10px',
                        }}
                    >
                        <span style={{ color: 'var(--text2, #6b6b76)', display: 'inline-flex' }}>
                            <LoreMark size={13} />
                        </span>
                        <span>Lore 2.4.1 · up to date</span>
                    </div>
                </div>

                {/* ---- pane ---- */}
                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', minWidth: 0 }}>
                    <div
                        style={{
                            alignItems: 'center',
                            borderBottom: '1px solid var(--border, #ececef)',
                            display: 'flex',
                            flex: 'none',
                            gap: 12,
                            height: 52,
                            padding: '0 20px 0 26px',
                        }}
                    >
                        <span style={{ fontSize: 14, fontWeight: 680, letterSpacing: '-.005em' }}>
                            {active.label}
                        </span>
                        <button
                            aria-label="Close settings"
                            className={iconButton}
                            onClick={close}
                            style={{ marginLeft: 'auto' }}
                            type="button"
                        >
                            <SettingsIcon name="close" size={17} sw={1.9} />
                        </button>
                    </div>

                    <div style={{ flex: 1, overflow: 'auto', padding: '24px 26px 30px' }}>
                        <active.Body />
                    </div>
                </div>
            </div>
        </>
    );
}
