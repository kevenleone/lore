// The title bar's timer control, mirroring the menu bar: the countdown while a
// session is under way — running or paused — and a bare clock face once it is
// stopped. Click opens the popover (frame 1e); ⌥-click opens Focus mode (1f).

import { formatClock, isTimerIdle } from '../../lib/focusTimer';
import { useStore } from '../../store/useStore';
import { Timer } from '../common/glyphs';
import { focusChip } from './Focus.css';

export function FocusChip() {
    const focus = useStore((s) => s.focus);
    // Matches the menu bar: a paused session still shows its time, and only
    // stopping puts the chip back to a bare clock face.
    const idle = useStore((s) => isTimerIdle(s.focus, s.prefs.durations));
    const open = useStore((s) => s.focusPopoverOpen);
    const togglePopover = useStore((s) => s.toggleFocusPopover);
    const toggleMode = useStore((s) => s.toggleFocusMode);

    return (
        <button
            aria-expanded={open}
            aria-label="Focus timer"
            className={focusChip}
            onClick={(e) => (e.altKey ? toggleMode() : togglePopover())}
            style={
                focus.running
                    ? { background: 'var(--ac)', color: '#fff' }
                    : idle
                      ? { color: open ? 'var(--ac)' : 'var(--text2, #6b6b76)' }
                      : { background: 'var(--ac-tint, #eeeef2)', color: 'var(--ac)' }
            }
            type="button"
        >
            <Timer size={13} />
            {!idle && formatClock(focus.remainingSec)}
        </button>
    );
}
