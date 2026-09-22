// The title bar's timer control, mirroring the menu bar: the countdown while an
// interval runs, and a bare clock face the moment it is paused or stopped.
// Click opens the popover (frame 1e); ⌥-click opens Focus mode (1f).

import { cn } from '../../lib/cn';
import { formatClock } from '../../lib/focusTimer';
import { useStore } from '../../store/useStore';
import { Timer } from '../common/glyphs';

export function FocusChip() {
    const focus = useStore((state) => state.focus);
    const open = useStore((state) => state.focusPopoverOpen);
    const togglePopover = useStore((state) => state.toggleFocusPopover);
    const toggleMode = useStore((state) => state.toggleFocusMode);

    return (
        <button
            aria-expanded={open}
            aria-label="Focus timer"
            className={cn(
                'inline-flex h-[30px] items-center gap-[6px] rounded-lg border-none px-[9px] font-[inherit] text-body-sm font-[640] tabular-nums hover:bg-hover',
                focus.running
                    ? 'bg-accent text-white'
                    : cn('bg-transparent', open ? 'text-accent' : 'text-text2'),
            )}
            onClick={(event) => (event.altKey ? toggleMode() : togglePopover())}
            type="button"
        >
            <Timer size={13} />
            {focus.running && formatClock(focus.remainingSec)}
        </button>
    );
}
