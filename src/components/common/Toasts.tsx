// Transient confirmations, stacked above the status bar.
//
// They exist for the actions whose effect the user cannot see happen — a copy
// to the clipboard changes nothing on screen, and a flag toggled from the
// context menu can move the item straight out of the view it was in.

import { useEffect } from 'react';

import type { Toast } from '../../store/types';

import { cn } from '../../lib/cn';
import { TOAST_MS } from '../../lib/motion';
import { useStore } from '../../store/useStore';

export function Toasts() {
    const toasts = useStore((s) => s.toasts);

    if (toasts.length === 0) return null;

    return (
        <div
            aria-live="polite"
            className="pointer-events-none absolute inset-x-0 bottom-[18px] z-40 flex flex-col items-center gap-[6px]"
        >
            {toasts.map((toast) => (
                <ToastChip key={toast.id} toast={toast} />
            ))}
        </div>
    );
}

function ToastChip({ toast }: { toast: Toast }) {
    const dismissToast = useStore((s) => s.dismissToast);
    const reduceMotion = useStore((s) => s.prefs.switches.motion);

    // The animation fades the chip out as it ends; this is what takes it off.
    useEffect(() => {
        const timer = setTimeout(() => dismissToast(toast.id), TOAST_MS);
        return () => clearTimeout(timer);
    }, [dismissToast, toast.id]);

    return (
        <div
            className={cn(
                'rounded-9 border border-border bg-surface2 px-[13px] py-[7px] text-body text-text shadow-float',
                !reduceMotion && 'animate-toast-life',
            )}
            role="status"
        >
            {toast.message}
        </div>
    );
}
