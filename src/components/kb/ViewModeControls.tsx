// The two segmented controls in the list header: which layout the library is in
// (List / Cards / Table), and — for the two layouts with no standing detail
// column — where an item goes when it is opened (Drawer / Page).

import type { ReactNode } from 'react';

import type { OpenMode, ViewMode } from '../../store/types';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { OpenDrawer, OpenPage, ViewCards, ViewRows, ViewTable } from '../common/glyphs';

const VIEW_MODES: { glyph: ReactNode; id: ViewMode; label: string }[] = [
    { glyph: <ViewRows />, id: 'list', label: 'List' },
    { glyph: <ViewCards />, id: 'cards', label: 'Cards' },
    { glyph: <ViewTable />, id: 'table', label: 'Table' },
];

const OPEN_MODES: { glyph: ReactNode; id: OpenMode; label: string }[] = [
    { glyph: <OpenDrawer />, id: 'drawer', label: 'Drawer' },
    { glyph: <OpenPage />, id: 'page', label: 'Page' },
];

export function OpenModePicker() {
    const openMode = useStore((s) => s.prefs.openMode);
    const setOpenMode = useStore((s) => s.setOpenMode);

    return (
        <span className="flex items-center gap-[7px]">
            <span className="text-caption font-semibold tracking-[.05em] text-faint uppercase">
                Open in
            </span>
            <Track>
                {OPEN_MODES.map((mode) => (
                    <button
                        aria-pressed={openMode === mode.id}
                        className={cn(
                            segmentClass(openMode === mode.id),
                            'gap-[5px] px-[9px] py-1 text-body-sm',
                        )}
                        key={mode.id}
                        onClick={() => setOpenMode(mode.id)}
                        type="button"
                    >
                        {mode.glyph}
                        {mode.label}
                    </button>
                ))}
            </Track>
        </span>
    );
}

export function ViewModePicker() {
    const viewMode = useStore((s) => s.prefs.viewMode);
    const setViewMode = useStore((s) => s.setViewMode);

    return (
        <Track>
            {VIEW_MODES.map((mode) => (
                <button
                    aria-label={mode.label}
                    aria-pressed={viewMode === mode.id}
                    className={cn(segmentClass(viewMode === mode.id), 'h-[26px] w-[30px]')}
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    title={mode.label}
                    type="button"
                >
                    {mode.glyph}
                </button>
            ))}
        </Track>
    );
}

function segmentClass(active: boolean): string {
    return cn(
        'flex cursor-pointer items-center justify-center rounded-md border-none font-[inherit]',
        active
            ? 'bg-surface font-[590] text-accent shadow-seg'
            : 'bg-transparent font-medium text-text3',
    );
}

function Track({ children }: { children: ReactNode }) {
    return <span className="flex gap-[2px] rounded-lg bg-surface3 p-[2px]">{children}</span>;
}
