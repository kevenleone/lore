// Builds the popover's snapshot from the main window's store. Both hosts of
// `FocusPanelBody` render the same shape; only this one has a store to read.

import type { FocusSnapshot } from './focusSnapshot';

import { isTimerIdle, phaseSeconds } from '../../lib/focusTimer';
import { useStore } from '../../store/useStore';
import { queueItems } from '../../store/views';

export function useFocusSnapshot(): FocusSnapshot {
    const collections = useStore((s) => s.collections);
    const durations = useStore((s) => s.prefs.durations);
    const dnd = useStore((s) => s.prefs.switches.dnd);
    const focus = useStore((s) => s.focus);
    const items = useStore((s) => s.items);
    const totalSessions = useStore((s) => s.prefs.longBreakAfter);

    // Ticked-off rows stay in the queue but are not something to work on.
    const queue = queueItems(items).filter((i) => !i.flags.done);
    const task = queue.find((i) => i.id === focus.taskId) ?? queue[0] ?? null;
    const collection = task ? collections.find((c) => c.id === task.collectionId)?.name : undefined;

    return {
        canStop: !isTimerIdle(focus, durations),
        dnd,
        endsAt: focus.endsAt,
        phase: focus.phase,
        queueCount: queue.length,
        remainingSec: focus.running ? 0 : focus.remainingSec,
        running: focus.running,
        sessionIndex: focus.sessionIndex,
        taskMeta: task
            ? [collection, task.flags.today ? 'due today' : null].filter(Boolean).join(' · ') ||
              'Task'
            : null,
        taskTitle: task?.title ?? null,
        totalSec: phaseSeconds(focus.phase, durations),
        totalSessions,
    };
}
