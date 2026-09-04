// The in-window twin of the menu-bar popover, hanging off the title bar's timer
// chip. It shares its body with the tray panel (frame 1e); this host reads the
// store directly, since it runs inside the main window.

import { useEffect, useRef } from 'react';

import { useStore } from '../../store/useStore';
import { popover } from './Focus.css';
import { FocusPanelBody } from './FocusPanelBody';
import { useFocusSnapshot } from './useFocusSnapshot';

export function FocusPopover() {
    const close = useStore((s) => s.toggleFocusPopover);
    const cycleFocusTask = useStore((s) => s.cycleFocusTask);
    const openFocusMode = useStore((s) => s.toggleFocusMode);
    const remainingSec = useStore((s) => s.focus.remainingSec);
    const reset = useStore((s) => s.resetFocusInterval);
    const skip = useStore((s) => s.skipFocusInterval);
    const toggle = useStore((s) => s.toggleFocus);
    const snapshot = useFocusSnapshot();
    const ref = useRef<HTMLDivElement>(null);

    // A click anywhere else dismisses it, the way a menu-bar popover does.
    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) close();
        };
        // Deferred: the click that opened the popover is still being dispatched.
        const id = setTimeout(() => document.addEventListener('mousedown', onDown));
        return () => {
            clearTimeout(id);
            document.removeEventListener('mousedown', onDown);
        };
    }, [close]);

    return (
        <div className={popover} ref={ref}>
            <FocusPanelBody
                actions={{
                    onNextTask: cycleFocusTask,
                    onOpenFocusMode: () => {
                        close();
                        openFocusMode();
                    },
                    onReset: reset,
                    onSkip: skip,
                    onToggle: toggle,
                }}
                remainingSec={remainingSec}
                snapshot={snapshot}
            />
        </div>
    );
}
