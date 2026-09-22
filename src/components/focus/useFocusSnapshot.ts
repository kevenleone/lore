// Builds the popover's snapshot from the main window's store. Both hosts of
// `FocusPanelBody` render the same shape; only this one has a store to read.

import type { FocusSnapshot } from './focusSnapshot';

import { isTimerIdle, phaseSeconds } from '../../lib/focusTimer';
import { useStore } from '../../store/useStore';
import { queueItems } from '../../store/views';

export function useFocusSnapshot(): FocusSnapshot {
    const collections = useStore((state) => state.collections);
    const durations = useStore((state) => state.prefs.durations);
    const focus = useStore((state) => state.focus);
    const items = useStore((state) => state.items);
    const totalSessions = useStore((state) => state.prefs.longBreakAfter);

    // Ticked-off rows stay in the queue but are not something to work on.
    const queue = queueItems(items).filter((item) => !item.flags.done);
    const task = queue.find((item) => item.id === focus.taskId) ?? queue[0] ?? null;
    const collection = task
        ? collections.find((collection) => collection.id === task.collectionId)?.name
        : undefined;

    return {
        canStop: !isTimerIdle(focus, durations),
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
