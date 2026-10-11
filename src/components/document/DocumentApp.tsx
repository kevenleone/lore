import { useEffect, useState, useSyncExternalStore } from 'react';

import type { DocumentRepository } from '../../data/documentRepository';

import { cn } from '../../lib/cn';
import { hotkeyFor, matchesHotkey } from '../../lib/hotkeys';
import { IS_MAC, WINDOW_CONTROLS_WIDTH } from '../../lib/platform';
import { homeDirectory, tildePath } from '../../lib/workspace';
import { useStore } from '../../store/useStore';
import { ModeAccentBar, ModeBadge } from '../common/ModeBadge';
import { DetailPane } from '../kb/DetailPane';
import { PROPERTIES_WIDTH, PropertiesPanel } from '../kb/PropertiesPanel';
import { StandaloneContext } from './standalone';

const BUTTON =
    'rounded-7 border border-border bg-surface px-[10px] py-[3px] text-body-sm text-text2 hover:bg-surface2';

export function DocumentApp({ repository }: { repository: DocumentRepository }): React.JSX.Element {
    const status = useSyncExternalStore(repository.subscribe, () => repository.status);
    const dirty = useStore((state) => state.editorDirtyId !== null);
    const loaded = useStore((state) => state.items.length > 0);
    const propertiesOpen = useStore((state) => state.prefs.propertiesOpen);
    const textSize = useStore((state) => state.prefs.textSize);
    const reduceMotion = useStore((state) => state.prefs.switches.motion);

    const [home, setHome] = useState<null | string>(null);

    useEffect(() => {
        let revision = repository.status.revision;

        // In the listener, not an effect: the store has to hold the file just
        // read before the pane that shows it is rebuilt.
        const stop = repository.subscribe(() => {
            if (repository.status.revision === revision) {
                return;
            }

            revision = repository.status.revision;
            show(repository);
        });

        void repository.reload().catch(() => undefined);
        void homeDirectory().then(setHome);

        return stop;
    }, [repository]);

    // After the commit that swapped the pane, so the old editor's flush is past.
    useEffect(() => {
        repository.discarding = false;
    }, [repository, status.revision]);

    useEffect(() => {
        const onFocus = (): void => {
            void repository.reloadIfChanged(() => useStore.getState().editorDirtyId !== null);
        };

        const onKey = (event: KeyboardEvent): void => {
            if (matchesHotkey(event, hotkeyFor('properties'))) {
                event.preventDefault();
                useStore.getState().toggleProperties();
            }
        };

        window.addEventListener('focus', onFocus);
        window.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('keydown', onKey);
        };
    }, [repository]);

    return (
        <StandaloneContext.Provider value>
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
                    <span className="flex-none text-body font-[620] text-text">
                        {status.file?.name}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-body-sm text-faint">
                        {status.file ? tildePath(status.file.path, home) : null}
                    </span>
                    <span
                        aria-label={dirty ? 'Unsaved changes' : 'Saved'}
                        className={cn(
                            'size-[7px] flex-none rounded-full',
                            dirty ? 'bg-accent' : 'bg-transparent',
                        )}
                        role="status"
                    />
                </header>

                {status.conflict && (
                    <div
                        className="flex flex-none items-center gap-[10px] border-b border-border bg-accent-tint px-[14px] py-2 text-body text-text"
                        role="alert"
                    >
                        <span className="min-w-0 flex-1">
                            This file changed on disk since it was opened. Your edits here are not
                            saved yet.
                        </span>
                        <button
                            className={BUTTON}
                            onClick={() => void repository.reload()}
                            type="button"
                        >
                            Reload from disk
                        </button>
                        <button
                            className={BUTTON}
                            onClick={() => void repository.keepMine()}
                            type="button"
                        >
                            Keep mine
                        </button>
                    </div>
                )}

                {status.error && (
                    <div
                        className="flex-none border-b border-border px-[14px] py-2 text-body text-danger"
                        role="alert"
                    >
                        {status.error}
                    </div>
                )}

                <div className="flex min-h-0 flex-1">
                    <main className="flex min-w-0 flex-1 flex-col">
                        {loaded && <DetailPane key={status.revision} />}
                    </main>
                    <div
                        aria-hidden={!propertiesOpen}
                        className={cn(
                            'flex-none overflow-hidden',
                            propertiesOpen ? 'border-l border-border' : 'border-l-0 border-none',
                            !reduceMotion &&
                                'transition-[width] duration-220 ease-[cubic-bezier(.4,0,.2,1)]',
                        )}
                        inert={!propertiesOpen}
                        // The collapse animates between two shared constants.
                        style={{ width: propertiesOpen ? PROPERTIES_WIDTH : 0 }}
                    >
                        <PropertiesPanel />
                    </div>
                </div>
            </div>
        </StandaloneContext.Provider>
    );
}

/** Puts the one file where the detail pane and the panel read their item from. */
function show(repository: DocumentRepository): void {
    const held = repository.snapshot();

    if (!held) {
        return;
    }

    // Before the item lands: a dirty flag from the draft being replaced would
    // have the store keep that draft's body over the one just read.
    useStore.getState().setEditorDirty(null);
    useStore.setState({
        detail: held.item,
        hydrated: true,
        itemMeta: held.meta,
        items: [held.item],
        selectedId: held.item.id,
    });
}
