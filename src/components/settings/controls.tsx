// The repeating pieces every settings pane is built from: section labels,
// label/description rows with a trailing control, the pill toggle, segmented
// controls, and the menu the choosers open.

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import { SettingsIcon } from '../common/settingsGlyphs';

/**
 * Outlined pill: actions and the menu-shaped choosers. Exported because the
 * panes build a few one-off buttons that have to match these exactly.
 */
export const PILL_BUTTON =
    'text-body inline-flex flex-none items-center gap-[7px] rounded-lg border border-border bg-surface px-[10px] py-[6px] font-[inherit] text-text2 disabled:cursor-default not-disabled:hover:bg-hover';

/** Square icon-only button: pane headers, the notice's dismiss. */
export const ICON_BUTTON =
    'flex items-center justify-center rounded-lg border-none bg-transparent text-text2 hover:bg-hover';

/** One option inside a segmented control. */
const SEG_ITEM = 'text-body rounded-7 border-none bg-transparent px-[11px] py-[5px] font-[inherit]';

/** Slide durations for the toggle; `ease` rather than a Tailwind easing token. */
const SWITCH_TRANSITION = 'duration-[160ms] ease-[ease]';

/** One option in a `Chooser`: the value written, and the text the row reads. */
export interface ChoiceOption<T> {
    label: string;
    value: T;
}

/**
 * A pill that opens a menu of its options. Every chooser in the sheet writes a
 * preference, so there is no disabled variant — a row with nothing behind it
 * does not belong in Settings at all.
 */
export function Chooser<T extends number | string>({
    label,
    onChange,
    options,
    value,
}: {
    /** Names the control for assistive tech; the trigger only shows the value. */
    label: string;
    onChange: (v: T) => void;
    options: readonly ChoiceOption<T>[];
    value: T;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const current = options.find((o) => o.value === value);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        // Capture, and stop there: the settings sheet closes on a bubbling Esc,
        // and dismissing a menu must not take the whole sheet with it.
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            setOpen(false);
        };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey, true);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey, true);
        };
    }, [open]);

    return (
        <div className="relative flex-none" ref={ref}>
            <button
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label={label}
                className={PILL_BUTTON}
                onClick={() => setOpen((o) => !o)}
                type="button"
            >
                {current?.label ?? value}
                <SettingsIcon name="chevronDown" size={13} sw={2} />
            </button>
            {open && (
                <div
                    className="absolute top-[calc(100%+4px)] right-0 z-40 max-h-[260px] min-w-[180px] overflow-y-auto rounded-10 border border-border bg-surface p-[5px] shadow-sheet"
                    role="listbox"
                >
                    {options.map((o) => (
                        <button
                            aria-selected={o.value === value}
                            className={cn(
                                'flex w-full items-center gap-2 rounded-7 border-none bg-transparent px-2 py-[6px] text-left font-[inherit] text-body hover:bg-hover',
                                o.value === value ? 'font-[590] text-accent' : 'text-text2',
                            )}
                            key={o.value}
                            onClick={() => {
                                onChange(o.value);
                                setOpen(false);
                            }}
                            role="option"
                            type="button"
                        >
                            <span className="min-w-0 flex-1 truncate">{o.label}</span>
                            {o.value === value && <SettingsIcon name="check" size={13} sw={2.4} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/** A ⌘/⇧/K key cap in the shortcuts pane. */
export function KeyCap({ children }: { children: ReactNode }) {
    return (
        <span className="min-w-[22px] rounded-md border border-b-2 border-kbd-border bg-kbd-bg px-[6px] py-[2px] text-center font-mono text-label text-text2">
            {children}
        </span>
    );
}

/** Outlined action button (Reveal in Finder, Export as Markdown…). */
export function PillButton({
    children,
    className,
    onClick,
    style,
    tone = 'neutral',
}: {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    style?: CSSProperties;
    tone?: 'danger' | 'neutral';
}) {
    return (
        <button
            className={cn(PILL_BUTTON, tone === 'danger' && 'text-danger', className)}
            onClick={onClick}
            style={style}
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
        <div
            className={cn(
                'flex items-start gap-4 border-b border-border-soft py-[13px]',
                last && 'border-b-0',
            )}
        >
            <div className="min-w-0 flex-1">
                <div className="text-subhead font-semibold">{title}</div>
                {desc && <div className="mt-[2px] text-body leading-[1.5] text-text3">{desc}</div>}
            </div>
            {children}
        </div>
    );
}

export function SectionLabel({ children, first }: { children: ReactNode; first?: boolean }) {
    return (
        <div
            className={cn(
                'mb-1 text-caption font-[680] tracking-[.07em] text-faint uppercase',
                first ? 'mt-0' : 'mt-[26px]',
            )}
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
        <div className="flex flex-none gap-[2px] rounded-9 bg-surface3 p-[3px]">
            {options.map((o) => (
                <button
                    aria-pressed={o === value}
                    className={cn(
                        SEG_ITEM,
                        o === value
                            ? 'bg-surface font-semibold text-text shadow-seg'
                            : 'text-text2',
                    )}
                    key={o}
                    onClick={() => onChange(o)}
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
            className={cn(
                'relative h-[22px] w-[38px] flex-none rounded-xl border-none p-0 transition-[background]',
                SWITCH_TRANSITION,
                on ? 'bg-accent' : 'bg-track-off',
            )}
            onClick={onChange}
            role="switch"
            type="button"
        >
            <span
                className={cn(
                    'absolute top-[2px] h-[18px] w-[18px] rounded-full bg-knob shadow-[0_1px_3px_rgba(0,0,0,.22)] transition-[left]',
                    SWITCH_TRANSITION,
                    on ? 'left-[18px]' : 'left-[2px]',
                )}
            />
        </button>
    );
}
