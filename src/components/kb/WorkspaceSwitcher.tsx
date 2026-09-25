// The vault this window is showing, and how to open another one.
//
// Sits at the top of the sidebar because a workspace scopes everything below
// it — collections, tags and counts all mean something different in a
// different folder.

import { useEffect, useRef, useState } from 'react';

import { cn } from '../../lib/cn';
import { workspaceName } from '../../lib/workspace';
import { useStore } from '../../store/useStore';
import { Check, ChevronDown } from '../common/glyphs';
import { Icon } from '../common/Icon';

const DEFAULT_LABEL = 'Local vault';

export function WorkspaceSwitcher() {
    const workspacePath = useStore((state) => state.workspacePath);
    const recents = useStore((state) => state.recentWorkspaces);
    const error = useStore((state) => state.workspaceError);
    const openPicker = useStore((state) => state.openWorkspacePicker);
    const switchWorkspace = useStore((state) => state.switchWorkspace);

    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onDown = (event: MouseEvent) => {
            if (!ref.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const label = workspacePath ? workspaceName(workspacePath) : DEFAULT_LABEL;

    return (
        <div className="relative px-[2px] pb-2" ref={ref}>
            <button
                className={cn(
                    'flex w-full items-center gap-2 rounded-lg border-none px-[9px] py-[7px] text-left font-[inherit] text-text',
                    open ? 'bg-hover' : 'bg-transparent hover:bg-hover',
                )}
                onClick={() => setOpen((v) => !v)}
                title={workspacePath ?? DEFAULT_LABEL}
                type="button"
            >
                <Icon name="layers" size={15} />
                <span className="min-w-0 flex-1 truncate text-body-lg font-semibold">{label}</span>
                <ChevronDown />
            </button>

            {error && (
                <div className="px-[9px] pt-1 text-label leading-[1.45] text-danger">
                    {/*
                     * The engine's own words when it has any: "that folder could
                     * not be opened" is no help when the reason is that another
                     * Lore is holding it and the fix is to quit that one.
                     */}
                    {sentence(error)} Staying on {label}.
                </div>
            )}

            {open && (
                <div
                    className="absolute top-full right-[2px] left-[2px] z-40 rounded-10 border border-border bg-surface p-[5px] shadow-[0_14px_32px_-12px_rgba(20,20,35,.28)]"
                    role="menu"
                >
                    <Row
                        active={workspacePath === null}
                        hint="The vault Lore keeps for you"
                        label={DEFAULT_LABEL}
                        onClick={() => {
                            setOpen(false);
                            void switchWorkspace(null);
                        }}
                    />

                    {recents.filter((recent) => recent.path !== workspacePath).length > 0 && (
                        <div className="px-[9px] pt-2 pb-1 text-micro font-[680] tracking-[.07em] text-faint uppercase">
                            Recent
                        </div>
                    )}
                    {recents.map((recent) => (
                        <Row
                            active={recent.path === workspacePath}
                            hint={recent.path}
                            key={recent.path}
                            label={recent.name}
                            onClick={() => {
                                setOpen(false);
                                void switchWorkspace(recent.path);
                            }}
                        />
                    ))}

                    <div className="my-[5px] h-px bg-border-soft" />
                    <Row
                        label="Open Folder…"
                        onClick={() => {
                            setOpen(false);
                            void openPicker();
                        }}
                    />
                </div>
            )}
        </div>
    );
}

function Row({
    active,
    hint,
    label,
    onClick,
}: {
    active?: boolean;
    hint?: string;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            className="flex w-full items-center gap-2 rounded-7 border-none bg-transparent px-[9px] py-[7px] text-left font-[inherit] text-body-lg text-text hover:bg-hover"
            onClick={onClick}
            title={hint}
            type="button"
        >
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {active && (
                <span className="flex text-accent">
                    <Check />
                </span>
            )}
        </button>
    );
}

/**
 * The engine's message, punctuated to sit in front of the sentence that
 * follows. It reaches here from a thrown error, so nothing guarantees it starts
 * with a capital or ends with a full stop.
 */
function sentence(text: string): string {
    const trimmed = text.trim();

    if (!trimmed) {
        return 'That folder could not be opened.';
    }

    const capitalised = trimmed[0]!.toUpperCase() + trimmed.slice(1);

    return /[.!?]$/.test(capitalised) ? capitalised : `${capitalised}.`;
}
