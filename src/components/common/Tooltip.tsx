// A hover label for icon-only chrome.
//
// The native `title` attribute is not usable here: it waits about a second and
// then paints an OS tooltip that belongs to no part of this window's chrome,
// which in a frameless, custom-drawn title bar reads as a bug. This draws the
// label in the app's own surface instead, after a short deliberate hover.

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { bubble } from './Tooltip.css';

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
            onBlur={hide}
            onFocus={() => setShown(true)}
            // A click is the answer to the question the tooltip was asking.
            onMouseDown={hide}
            onMouseEnter={() => {
                cancel();
                timer.current = setTimeout(() => setShown(true), DELAY_MS);
            }}
            onMouseLeave={hide}
            style={{ display: 'inline-flex', position: 'relative' }}
        >
            {children}
            {shown && (
                <span className={bubble} role="tooltip" style={{ padding: '5px 9px' }}>
                    {label}
                    {keys && (
                        <span
                            style={{
                                color: 'var(--text3, #9a9aa5)',
                                fontFamily: 'ui-monospace,Menlo,monospace',
                                fontSize: 11,
                                marginLeft: 7,
                            }}
                        >
                            {keys}
                        </span>
                    )}
                </span>
            )}
        </span>
    );
}
