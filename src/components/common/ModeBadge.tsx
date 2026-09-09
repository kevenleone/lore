// The build-mode markers: which Lore this window belongs to.
//
// Both render nothing in production — `APP_MODE.label` is statically `null`
// there, so the whole marker drops out of the bundle.

import { APP_MODE } from '../../lib/appMode';
import { cn } from '../../lib/cn';

/**
 * A hairline of the mode's colour along the top of a window, so a Lore that is
 * half-covered by another still says which one it is.
 */
export function ModeAccentBar() {
    if (!APP_MODE.accent) {
        return null;
    }

    return (
        <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-50 h-[2px]"
            // A fixed brand colour for the mode, not a theme token: it must read
            // the same in both themes, and must not follow the user's accent.
            style={{ backgroundColor: APP_MODE.accent }}
        />
    );
}

/** `DEV` / `AGENT` beside the app's own chrome. */
export function ModeBadge({ className }: { className?: string }) {
    if (!APP_MODE.label) {
        return null;
    }

    return (
        <span
            className={cn(
                'flex-none rounded-[5px] px-[5px] py-px text-[10px] leading-[14px] font-[720] tracking-[0.08em] text-white',
                className,
            )}
            // See `ModeAccentBar` — a build constant, not a theme token.
            style={{ backgroundColor: APP_MODE.accent ?? undefined }}
        >
            {APP_MODE.label}
        </span>
    );
}
