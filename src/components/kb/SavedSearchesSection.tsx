// Sidebar "Saved" section: the vault's named searches, and the only place they
// can be removed. Saving one happens where a search is built — the filter bar.

import { useState } from 'react';

import type { SavedSearch } from '../../store/types';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { savedSearchMatches } from '../../store/views';
import { Close, Search, Trash } from '../common/glyphs';

const ROW_BASE = 'text-subhead flex items-center gap-[9px] rounded-7 px-[9px] py-[6px]';

const BARE_BUTTON = 'border-none bg-transparent p-0 font-[inherit] text-[inherit]';

/** Revealed by hover *and* focus, for the reason `CollectionsSection` explains. */
const ROW_ACTIONS =
    'absolute inset-y-0 right-[9px] flex items-center gap-2 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100';

const SECTION_LABEL =
    'text-caption px-[9px] pt-[15px] pb-[5px] font-[680] tracking-[.06em] text-faint uppercase';

export function SavedSearchesSection() {
    const savedSearches = useStore((state) => state.savedSearches);
    const applySavedSearch = useStore((state) => state.applySavedSearch);
    const deleteSavedSearch = useStore((state) => state.deleteSavedSearch);
    const filters = useStore((state) => state.filters);
    const search = useStore((state) => state.search);
    const view = useStore((state) => state.view);

    const [confirmId, setConfirmId] = useState<null | string>(null);

    // A vault with no saved searches gets no heading either: an empty section is
    // a promise the sidebar cannot keep yet.
    if (savedSearches.length === 0) {
        return null;
    }

    return (
        <>
            <div className={SECTION_LABEL}>Saved</div>
            {savedSearches.map((saved) => (
                <Row
                    active={savedSearchMatches(saved, view, filters, search)}
                    confirming={confirmId === saved.id}
                    key={saved.id}
                    onApply={() => applySavedSearch(saved.id)}
                    onCancel={() => setConfirmId(null)}
                    onConfirm={() => {
                        setConfirmId(null);
                        void deleteSavedSearch(saved.id);
                    }}
                    onRemove={() => setConfirmId(saved.id)}
                    saved={saved}
                />
            ))}
        </>
    );
}

function Row({
    active,
    confirming,
    onApply,
    onCancel,
    onConfirm,
    onRemove,
    saved,
}: {
    active: boolean;
    confirming: boolean;
    onApply: () => void;
    onCancel: () => void;
    onConfirm: () => void;
    onRemove: () => void;
    saved: SavedSearch;
}) {
    if (confirming) {
        return (
            <div className={cn(ROW_BASE, 'justify-between text-body text-text2')}>
                <span className="min-w-0 truncate">Remove “{saved.name}”?</span>
                <span className="flex flex-none items-center gap-2">
                    <button
                        aria-label={`Remove ${saved.name}`}
                        className={cn(BARE_BUTTON, 'text-danger')}
                        onClick={onConfirm}
                        type="button"
                    >
                        <Trash size={13} />
                    </button>
                    <button
                        aria-label="Cancel"
                        className={cn(BARE_BUTTON, 'text-text3')}
                        onClick={onCancel}
                        type="button"
                    >
                        <Close size={13} />
                    </button>
                </span>
            </div>
        );
    }

    return (
        <div className="group relative">
            <button
                aria-current={active ? 'page' : undefined}
                className={cn(
                    ROW_BASE,
                    'w-full border-none bg-transparent text-left font-[inherit]',
                    active ? 'bg-accent-tint font-[590] text-accent' : 'text-text2 hover:bg-hover',
                )}
                onClick={onApply}
                type="button"
            >
                <span className="flex flex-none opacity-60">
                    <Search size={13} />
                </span>
                {/* Room for the actions, which sit above the row rather than in it. */}
                <span className="min-w-0 flex-1 truncate pr-6">{saved.name}</span>
            </button>
            <span className={ROW_ACTIONS}>
                <button
                    aria-label={`Remove ${saved.name}`}
                    className={cn(BARE_BUTTON, 'text-text3 hover:text-danger')}
                    onClick={onRemove}
                    type="button"
                >
                    <Trash size={13} />
                </button>
            </span>
        </div>
    );
}
