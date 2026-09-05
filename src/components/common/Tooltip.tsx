// A hover label for icon-only chrome.
//
// The native `title` attribute is not usable here: it waits about a second and
// then paints an OS tooltip that belongs to no part of this window's chrome,
// which in a frameless, custom-drawn title bar reads as a bug. This draws the
// label in the app's own surface instead, after a short deliberate hover.

import { type ReactNode, useEffect, useRef, useState } from 'react';

export interface TooltipProps {
    children: ReactNode;
    /** Shortcut for the action, drawn as a key cap after the label. */
    keys?: string;
    label: string;
}

/** Long enough that crossing the toolbar does not trail labels behind it. */
const DELAY_MS = 320;

export function Tooltip({ children, keys, label }: TooltipProps) {
    const [shown, setShown] = useState(false);
    const timer = useRef<null | ReturnType<typeof setTimeout>>(null);

    const cancel = () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = null;
    };

    useEffect(() => cancel, []);

    const hide = () => {
        cancel();
        setShown(false);
    };

    return (
        <span
            className="relative inline-flex"
            onBlur={hide}
            onFocus={() => setShown(true)}
            // A click is the answer to the question the tooltip was asking.
            onMouseDown={hide}
            onMouseEnter={() => {
                cancel();
                timer.current = setTimeout(() => setShown(true), DELAY_MS);
            }}
            onMouseLeave={hide}
        >
            {children}
            {shown && (
                <span
                    // The bubble hangs outside its trigger; anything it covers must stay
                    // clickable, or a tooltip under the pointer would swallow the click.
                    //
                    // The centring stays in `transform` rather than Tailwind's
                    // `-translate-x-1/2`, which compiles to the `translate` property and
                    // would compose with the keyframe's own transform instead of
                    // replacing it.
                    className="pointer-events-none absolute top-[calc(100%+7px)] left-1/2 z-[60] [transform:translateX(-50%)] animate-tooltip-in rounded-lg border border-border bg-surface px-[9px] py-[5px] text-body-sm font-medium whitespace-nowrap text-text shadow-float"
                    role="tooltip"
                >
                    {label}
                    {keys && (
                        <span className="ml-[7px] font-mono text-caption text-text3">{keys}</span>
                    )}
                </span>
            )}
        </span>
    );
}
