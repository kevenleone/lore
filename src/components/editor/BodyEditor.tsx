// Owns when a body is written to disk.
//
// The old textarea was click-to-edit and committed on blur, which made the save
// policy invisible: there was exactly one moment a write could happen. A
// block editor is always on, and clicking a menu blurs it, so blur is no longer
// a safe trigger. Instead: debounce while typing, and flush on the events that
// mean the user is done — the item changing, and unmount.

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { RawMarkdownEditor } from './RawMarkdownEditor';

// ProseMirror and the Markdown stack are a third of the main bundle and only a
// note body needs them. Raw mode, quick capture and the focus window must not
// pay for the editor they never show.
const BlockEditor = lazy(async () => ({
    default: (await import('./BlockEditor')).BlockEditor,
}));

/** How long typing pauses before the body is written. */
const AUTOSAVE_MS = 600;

interface BodyEditorProps {
    /** Vault item id. Changing it flushes the previous body and reloads. */
    itemId: string;
    onCommit: (markdown: string) => void;
    placeholder?: string;
    value: string;
}

export function BodyEditor({
    itemId,
    onCommit,
    placeholder,
    value,
}: BodyEditorProps): React.JSX.Element {
    const rawDefault = useStore((s) => s.prefs.switches.rawMarkdownDefault);
    const setEditorDirty = useStore((s) => s.setEditorDirty);

    const [raw, setRaw] = useState(rawDefault);
    // The live body. `value` seeds it; after that this component is the truth
    // until a commit lands, which is what the store's dirty guard protects.
    const [draft, setDraft] = useState(value);

    // Bumped whenever the editor is re-seeded, so the block editor rebuilds
    // from the new body instead of keeping the document it was born with.
    const [seed, setSeed] = useState(0);
    // The body this editor was seeded from, and whether it still holds exactly
    // that. Once the user has typed, their draft outranks any later arrival.
    const seededRef = useRef(value);
    const pristineRef = useRef(true);

    const draftRef = useRef(draft);
    const committedRef = useRef(value);
    const timerRef = useRef<null | ReturnType<typeof setTimeout>>(null);
    // Read inside the unmount effect, which must not re-run when they change.
    const commitRef = useRef(onCommit);
    const dirtyRef = useRef(setEditorDirty);
    commitRef.current = onCommit;
    dirtyRef.current = setEditorDirty;

    const flush = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        const next = draftRef.current;
        dirtyRef.current(null);
        if (next === committedRef.current) return;
        committedRef.current = next;
        commitRef.current(next);
    }, []);

    const change = useCallback(
        (markdown: string) => {
            pristineRef.current = false;
            draftRef.current = markdown;
            setDraft(markdown);
            if (markdown === committedRef.current) return;

            setEditorDirty(itemId);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(flush, AUTOSAVE_MS);
        },
        [flush, itemId, setEditorDirty],
    );

    // A different item: write the old body before the new one replaces it.
    useEffect(() => {
        draftRef.current = value;
        committedRef.current = value;
        seededRef.current = value;
        pristineRef.current = true;
        setDraft(value);
        setRaw(rawDefault);
        setSeed((current) => current + 1);
        return flush;
    }, [itemId]);

    // The body arriving late, or changing on disk before anything was typed.
    // Only while pristine: after the first keystroke this would throw away what
    // the user is writing, and after a save it would remount on our own echo
    // and drop the caret mid-sentence.
    useEffect(() => {
        if (!pristineRef.current || value === seededRef.current) return;
        draftRef.current = value;
        committedRef.current = value;
        seededRef.current = value;
        setDraft(value);
        setSeed((current) => current + 1);
    }, [value]);

    const shared = { onChange: change, placeholder, value: draft };

    return (
        <div className="mt-4">
            <div className="mb-2 flex items-center gap-[2px]">
                <ModeButton active={!raw} label="Editor" onClick={() => setRaw(false)} />
                <ModeButton active={raw} label="Raw" onClick={() => setRaw(true)} />
            </div>
            {raw ? (
                <RawMarkdownEditor {...shared} />
            ) : (
                // Remounting per item is deliberate: swapping a document under a
                // live cursor loses the selection.
                <Suspense fallback={<div className="mt-5 min-h-[240px]" />}>
                    <BlockEditor key={`${itemId}:${seed}`} {...shared} />
                </Suspense>
            )}
        </div>
    );
}

function ModeButton({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}): React.JSX.Element {
    return (
        <button
            className={cn(
                'cursor-pointer rounded-md border-none px-[7px] py-[3px] font-[inherit] text-caption',
                active ? 'bg-hover text-text' : 'bg-transparent text-text3 hover:text-text2',
            )}
            onClick={onClick}
            type="button"
        >
            {label}
        </button>
    );
}
