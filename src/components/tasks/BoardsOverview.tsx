// The Board tab's other state: every board at once, one card per collection
// that holds a task plus the Unfiled bucket. A board *is* a collection — the
// vault files an item by its parent folder — so this is also the list of
// projects, which is why it can show progress across all of them.

import { formatDueDay } from '../../lib/format';
import { boardRollups } from '../../store/tasks';
import { UNFILED_BOARD } from '../../store/types';
import { useStore } from '../../store/useStore';

export function BoardsOverview({ today }: { today: string }) {
    const items = useStore((state) => state.items);
    const collections = useStore((state) => state.collections);
    const openBoard = useStore((state) => state.openBoard);

    const rollups = boardRollups(items, collections);

    if (rollups.length === 0) {
        return (
            <div className="flex flex-1 items-center justify-center p-6 text-body text-text3">
                No tasks in any collection yet.
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-[10px] overflow-auto px-5 py-[18px]">
            {rollups.map((project) => (
                <div
                    className="rounded-xl border border-border bg-surface px-[18px] py-4"
                    key={project.collectionId ?? 'unfiled'}
                >
                    <div className="flex items-center gap-[11px]">
                        <span
                            className="h-[11px] w-[11px] flex-none rounded-xs"
                            // The collection's own colour, which the user picks.
                            style={{ background: project.color }}
                        />
                        <span className="min-w-0 truncate text-title-lg font-[640]">
                            {project.parent && (
                                <span className="font-[440] text-text3">{project.parent}/</span>
                            )}
                            {project.name}
                        </span>
                        <span className="ml-auto text-body text-text3 tabular-nums">
                            {project.open} open · {project.done} done
                        </span>
                    </div>
                    <div className="mt-3 h-[6px] overflow-hidden rounded-sm bg-surface3">
                        <span
                            className="block h-full rounded-sm"
                            // Both the width and the colour are data: the share
                            // completed, in the collection's own colour.
                            style={{ background: project.color, width: `${project.percent}%` }}
                        />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-[18px]">
                        <span className="text-body text-text3">
                            {project.nextDue
                                ? `Next due ${formatDueDay(project.nextDue, today)}`
                                : 'Nothing dated'}
                        </span>
                        <button
                            className="ml-auto border-none bg-transparent p-0 font-[inherit] text-body text-accent"
                            onClick={() => openBoard(project.collectionId ?? UNFILED_BOARD)}
                            type="button"
                        >
                            Open board ↗
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
