// The two segmented controls in the list header: which layout the library is in
// (List / Cards / Table), and — for the two layouts with no standing detail
// column — where an item goes when it is opened (Drawer / Page).

import type { ReactNode } from 'react';

import type { OpenMode, ViewMode } from '../../store/types';

import { useStore } from '../../store/useStore';
import { OpenDrawer, OpenPage, ViewCards, ViewRows, ViewTable } from '../common/glyphs';

const AC = 'var(--ac, #5b5bd6)';

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
        <span style={{ alignItems: 'center', display: 'flex', gap: 7 }}>
            <span
                style={{
                    color: 'var(--faint, #a8a8b0)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                }}
            >
                Open in
            </span>
            <Track>
                {OPEN_MODES.map((mode) => (
                    <button
                        aria-pressed={openMode === mode.id}
                        key={mode.id}
                        onClick={() => setOpenMode(mode.id)}
                        style={{
                            ...segmentStyle(openMode === mode.id),
                            fontSize: 12,
                            gap: 5,
                            padding: '4px 9px',
                        }}
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
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    style={{ ...segmentStyle(viewMode === mode.id), height: 26, width: 30 }}
                    title={mode.label}
                    type="button"
                >
                    {mode.glyph}
                </button>
            ))}
        </Track>
    );
}

function segmentStyle(active: boolean): React.CSSProperties {
    return {
        alignItems: 'center',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        display: 'flex',
        fontFamily: 'inherit',
        justifyContent: 'center',
        ...(active
            ? {
                  background: 'var(--surface, #fff)',
                  boxShadow: 'var(--seg-shadow, 0 1px 2px rgba(0,0,0,.08))',
                  color: AC,
                  fontWeight: 590,
              }
            : { background: 'transparent', color: 'var(--text3, #9a9aa5)', fontWeight: 500 }),
    };
}

function Track({ children }: { children: ReactNode }) {
    return (
        <span
            style={{
                background: 'var(--surface3, #f1f1f3)',
                borderRadius: 8,
                display: 'flex',
                gap: 2,
                padding: 2,
            }}
        >
            {children}
        </span>
    );
}
