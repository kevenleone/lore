// The title bar's timer control. Shows the countdown while an interval runs and
// the plain clock face when it does not; click opens the popover (frame 1e),
// ⌥-click (or the ⌘⇧F row in the shortcuts list) opens the full surface (1f).

import { formatClock } from '../../lib/focusTimer';
import { useStore } from '../../store/useStore';
import { Timer } from '../common/glyphs';
import { focusChip } from './Focus.css';

export function FocusChip() {
    const focus = useStore((s) => s.focus);
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
                    : { color: open ? 'var(--ac)' : 'var(--text2, #6b6b76)' }
            }
            type="button"
        >
            <Timer size={13} />
            {focus.running && formatClock(focus.remainingSec)}
        </button>
    );
}
