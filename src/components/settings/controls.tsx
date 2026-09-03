// The repeating pieces every settings pane is built from: section labels,
// label/description rows with a trailing control, the pill toggle, segmented
// controls, and the "value + chevron" stand-in for a menu that has no backend
// behind it yet.

import type { CSSProperties, ReactNode } from 'react';

import { SettingsIcon } from '../common/settingsGlyphs';
import { pillButton, segItem, settingsRow } from './SettingsModal.css';

/**
 * A menu-shaped control whose options need a backend that does not exist yet
 * (calendars to file into, digest schedules, week start). It renders the
 * current value and cycles through `options` on click so the row is not dead.
 */
export function Chooser<T extends number | string>({
    leading,
    onChange,
    options,
    value,
}: {
    leading?: ReactNode;
    onChange?: (v: T) => void;
    options: readonly T[];
    value: T;
}) {
    const next = () => {
        if (!onChange) return;
        const i = options.indexOf(value);
        onChange(options[(i + 1) % options.length]);
    };
    return (
        <button className={pillButton} disabled={!onChange} onClick={next} type="button">
            {leading}
            {value}
            <SettingsIcon name="chevronDown" size={13} sw={2} />
        </button>
    );
}

/** A ⌘/⇧/K key cap in the shortcuts pane. */
export function KeyCap({ children }: { children: ReactNode }) {
    return (
        <span
            style={{
                background: 'var(--kbd-bg, #fff)',
                border: '1px solid var(--kbd-border, #e2e2e7)',
                borderBottomWidth: 2,
                borderRadius: 6,
                color: 'var(--text2, #6b6b76)',
                fontFamily: 'ui-monospace,Menlo,monospace',
                fontSize: 11.5,
                minWidth: 22,
                padding: '2px 6px',
                textAlign: 'center',
            }}
        >
            {children}
        </span>
    );
}

/** Outlined action button (Sync now, Change plan, Reveal in Finder…). */
export function PillButton({
    children,
    onClick,
    style,
    tone = 'neutral',
}: {
    children: ReactNode;
    onClick?: () => void;
    style?: CSSProperties;
    tone?: 'danger' | 'neutral';
}) {
    return (
        <button
            className={pillButton}
            onClick={onClick}
            style={{ ...(tone === 'danger' ? { color: '#b4442f' } : null), ...style }}
            type="button"
        >
            {children}
        </button>
    );
}

/** A settings line: title, optional description, and whatever control follows. */
export function Row({
    children,
    desc,
    last,
    title,
}: {
    children?: ReactNode;
    desc?: string;
    last?: boolean;
    title: string;
}) {
    return (
        <div className={settingsRow} style={last ? { borderBottom: 'none' } : undefined}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div>
                {desc && (
                    <div
                        style={{
                            color: 'var(--text3, #9a9aa5)',
                            fontSize: 12.5,
                            lineHeight: 1.5,
                            marginTop: 2,
                        }}
                    >
                        {desc}
                    </div>
                )}
            </div>
            {children}
        </div>
    );
}

export function SectionLabel({ children, first }: { children: ReactNode; first?: boolean }) {
    return (
        <div
            style={{
                color: 'var(--faint, #a8a8b0)',
                fontSize: 11,
                fontWeight: 680,
                letterSpacing: '.07em',
                margin: first ? '0 0 4px' : '26px 0 4px',
                textTransform: 'uppercase',
            }}
        >
            {children}
        </div>
    );
}

/** Segmented control (Cozy/Compact/Roomy, Banner/Alert, Day/Week/Month). */
export function Segmented<T extends string>({
    onChange,
    options,
    value,
}: {
    onChange: (v: T) => void;
    options: readonly T[];
    value: T;
}) {
    return (
        <div
            style={{
                background: 'var(--surface3, #f1f1f3)',
                borderRadius: 9,
                display: 'flex',
                flex: 'none',
                gap: 2,
                padding: 3,
            }}
        >
            {options.map((o) => (
                <button
                    aria-pressed={o === value}
                    className={segItem}
                    key={o}
                    onClick={() => onChange(o)}
                    style={
                        o === value
                            ? {
                                  background: 'var(--surface, #fff)',
                                  boxShadow: 'var(--seg-shadow, 0 1px 2px rgba(0,0,0,.08))',
                                  color: 'var(--text, #1a1a1f)',
                                  fontWeight: 600,
                              }
                            : { color: 'var(--text2, #6b6b76)' }
                    }
                    type="button"
                >
                    {o}
                </button>
            ))}
        </div>
    );
}

/** The 38x22 pill switch used across every pane. */
export function Toggle({
    label,
    on,
    onChange,
}: {
    label: string;
    on: boolean;
    onChange: () => void;
}) {
    return (
        <button
            aria-checked={on}
            aria-label={label}
            onClick={onChange}
            role="switch"
            style={{
                background: on ? 'var(--ac)' : 'var(--track-off, #d9d9e0)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                flex: 'none',
                height: 22,
                padding: 0,
                position: 'relative',
                transition: 'background .16s ease',
                width: 38,
            }}
            type="button"
        >
            <span
                style={{
                    background: 'var(--knob, #fff)',
                    borderRadius: '50%',
                    boxShadow: '0 1px 3px rgba(0,0,0,.22)',
                    height: 18,
                    left: on ? 18 : 2,
                    position: 'absolute',
                    top: 2,
                    transition: 'left .16s ease',
                    width: 18,
                }}
            />
        </button>
    );
}
