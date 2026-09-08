import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import { useStore } from '../../store/useStore';
import { RawMarkdownEditor } from './RawMarkdownEditor';

// A third of the main bundle, and only a rich-mode note body needs it.
const BlockEditor = lazy(async () => ({
    default: (await import('./BlockEditor')).BlockEditor,
}));

const AUTOSAVE_MS = 600;

interface BodyEditorProps {
    /** Changing it flushes the previous body and reloads. */
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
    const [draft, setDraft] = useState(value);

    // Bumped on re-seed so the block editor rebuilds from the new body.
    const [seed, setSeed] = useState(0);
    const seededRef = useRef(value);
    const pristineRef = useRef(true);

    const draftRef = useRef(draft);
    const committedRef = useRef(value);
    const timerRef = useRef<null | ReturnType<typeof setTimeout>>(null);
    // Read from the unmount effect, which must not re-run when they change.
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

    // Write the old body before a different item replaces it.
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

    // The body arriving after mount, since list rows carry none. Pristine only:
    // later it would discard what is being typed, or remount on a save's own
    // echo and drop the caret.
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
