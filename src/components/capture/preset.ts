// How a capture surface's preset lands on the item being saved.
//
// Only a task has a board column — `status` means nothing on a link or a note —
// and a column that completes the task hands it over already done. Without that
// last part `boardColumnFor` reads the new task as open, sees it sitting in the
// completing column, and puts it back in the board's first one: from the
// outside, the Done column simply refuses new tasks.

import type { NewItem } from '../../data/repository';
import type { CapturePreset } from '../../store/types';

export function applyCapturePreset(input: NewItem, preset: CapturePreset | null): NewItem {
    if (!preset?.status || input.type !== 'task') {
        return input;
    }

    return {
        ...input,
        flags: { ...input.flags, done: preset.done ? true : input.flags.done },
        status: preset.status,
    };
}
