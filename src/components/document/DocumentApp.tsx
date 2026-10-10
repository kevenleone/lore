import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import { IS_MAC, WINDOW_CONTROLS_WIDTH } from '../../lib/platform';
import {
    CHANGED_ON_DISK,
    joinFrontmatter,
    readDocument,
    splitFrontmatter,
    type StandaloneDocument,
    writeDocument,
} from '../../lib/standaloneDocument';
import { homeDirectory, tildePath } from '../../lib/workspace';
import { loadPersisted } from '../../store/persisted';
import { useStore } from '../../store/useStore';
import { ModeAccentBar, ModeBadge } from '../common/ModeBadge';
import { BodyEditor } from '../editor/BodyEditor';

interface OpenFile {
    body: string;
    name: string;
    path: string;
}

const BUTTON =
    'rounded-7 border border-border bg-surface px-[10px] py-[3px] text-body-sm text-text2 hover:bg-surface2';

export function DocumentApp(): React.JSX.Element {
    const dirty = useStore((state) => state.editorDirtyId !== null);

    const [file, setFile] = useState<null | OpenFile>(null);
    // Bumped to rebuild the editor from disk; the editor reads its body once.
    const [revision, setRevision] = useState(0);
    const [conflict, setConflict] = useState(false);
    const [error, setError] = useState<null | string>(null);
    const [raw, setRaw] = useState(false);
    const [home, setHome] = useState<null | string>(null);
    const [textSize] = useState(() => loadPersisted().prefs.textSize);

    const prefixRef = useRef('');
    const modifiedRef = useRef<null | number>(null);
    const bodyRef = useRef('');
    const conflictRef = useRef(false);
    // Reads and writes run one at a time: two saves in flight would have the
    // second one checked against a modified time the first is about to change.
    const queueRef = useRef<Promise<void>>(Promise.resolve());
    // Set while the editor is being replaced by what is on disk. Unmounting
    // flushes its draft, and that draft is the one the user chose to drop.
    const discardRef = useRef(false);

    const show = useCallback((read: StandaloneDocument) => {
        const { body, prefix } = splitFrontmatter(read.text);

        prefixRef.current = prefix;
        modifiedRef.current = read.modified;
        bodyRef.current = body;
        conflictRef.current = false;
        discardRef.current = true;

        setFile({ body, name: read.name, path: read.path });
        setRevision((current) => current + 1);
        setConflict(false);
        setError(null);
    }, []);

    const enqueue = useCallback((task: () => Promise<void>) => {
        queueRef.current = queueRef.current.then(task).catch((reason: unknown) => {
            setError(reason instanceof Error ? reason.message : String(reason));
        });
    }, []);

    const reload = useCallback(() => {
        enqueue(async () => show(await readDocument()));
    }, [enqueue, show]);

    const save = useCallback(
        (body: string, overwrite: boolean) => {
            enqueue(async () => {
                try {
                    modifiedRef.current = await writeDocument(
                        joinFrontmatter(prefixRef.current, body),
                        overwrite ? null : modifiedRef.current,
                    );
                    conflictRef.current = false;
                    setConflict(false);
                    setError(null);
                } catch (reason) {
                    if (reason !== CHANGED_ON_DISK) {
                        throw reason;
                    }

                    conflictRef.current = true;
                    setConflict(true);
                }
            });
        },
        [enqueue],
    );

    const commit = useCallback(
        (body: string) => {
            if (discardRef.current) {
                return;
            }

            bodyRef.current = body;
            save(body, false);
        },
        [save],
    );

    useEffect(() => {
        reload();
        void homeDirectory().then(setHome);
    }, [reload]);

    // After the commit that swapped the editor, so the old one's flush is past.
    useEffect(() => {
        discardRef.current = false;
    }, [revision]);

    // Picks up an edit made elsewhere, but never over unsaved typing: that case
    // is the conflict banner's, where the user chooses.
    useEffect(() => {
        const onFocus = (): void => {
            enqueue(async () => {
                if (conflictRef.current || useStore.getState().editorDirtyId !== null) {
                    return;
                }

                const read = await readDocument().catch(() => null);

                if (read && read.modified !== modifiedRef.current) {
                    show(read);
                }
            });
        };

        window.addEventListener('focus', onFocus);

        return () => window.removeEventListener('focus', onFocus);
    }, [enqueue, show]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent): void => {
            if (event.key !== '/' || !(event.metaKey || event.ctrlKey)) {
                return;
            }

            event.preventDefault();
            setRaw((current) => !current);
        };

        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    return (
        <div
            className="relative flex h-full flex-col bg-surface text-text"
            // The Text size preference, applied the way `App.tsx` applies it.
            style={{ zoom: textSize }}
        >
            <header
                className="relative flex h-[46px] flex-none items-center gap-[10px] border-b border-border bg-titlebar px-[14px] select-none"
                data-tauri-drag-region="deep"
            >
                <ModeAccentBar />
                {IS_MAC && (
                    <span
                        // A layout constant shared with AppKit, not a class: it is
                        // the span of buttons the system draws over this corner.
                        style={{ width: WINDOW_CONTROLS_WIDTH }}
                    />
                )}
                <ModeBadge />
                <span className="flex-none text-body font-[620] text-text">{file?.name}</span>
                <span className="min-w-0 flex-1 truncate text-body-sm text-faint">
                    {file ? tildePath(file.path, home) : null}
                </span>
                <span
                    aria-label={dirty ? 'Unsaved changes' : 'Saved'}
                    className={cn(
                        'size-[7px] flex-none rounded-full',
                        dirty ? 'bg-accent' : 'bg-transparent',
                    )}
                    role="status"
                />
                <button
                    aria-pressed={raw}
                    className={cn(BUTTON, raw && 'bg-surface2 text-text')}
                    onClick={() => setRaw((current) => !current)}
                    title="Edit the Markdown source (⌘/)"
                    type="button"
                >
                    Source
                </button>
            </header>

            {conflict && (
                <div
                    className="flex flex-none items-center gap-[10px] border-b border-border bg-accent-tint px-[14px] py-2 text-body text-text"
                    role="alert"
                >
                    <span className="min-w-0 flex-1">
                        This file changed on disk since it was opened. Your edits here are not saved
                        yet.
                    </span>
                    <button className={BUTTON} onClick={reload} type="button">
                        Reload from disk
                    </button>
                    <button
                        className={BUTTON}
                        onClick={() => save(bodyRef.current, true)}
                        type="button"
                    >
                        Keep mine
                    </button>
                </div>
            )}

            {error && (
                <div
                    className="flex-none border-b border-border px-[14px] py-2 text-body text-danger"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <main className="min-h-0 flex-1 overflow-y-auto">
                {file && (
                    <div className="mx-auto w-full max-w-[760px] px-10 pt-4 pb-24">
                        <BodyEditor
                            itemId={file.path}
                            key={revision}
                            onCommit={commit}
                            placeholder="Start writing…"
                            raw={raw}
                            value={file.body}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
