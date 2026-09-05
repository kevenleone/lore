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
    const workspacePath = useStore((s) => s.workspacePath);
    const recents = useStore((s) => s.recentWorkspaces);
    const error = useStore((s) => s.workspaceError);
    const openPicker = useStore((s) => s.openWorkspacePicker);
    const switchWorkspace = useStore((s) => s.switchWorkspace);

    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
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
                    'flex w-full cursor-pointer items-center gap-2 rounded-lg border-none px-[9px] py-[7px] text-left font-[inherit] text-text',
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
                    Could not open that folder — staying on {label}.
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

                    {recents.filter((r) => r.path !== workspacePath).length > 0 && (
                        <div className="px-[9px] pt-2 pb-1 text-micro font-[680] tracking-[.07em] text-faint uppercase">
                            Recent
                        </div>
                    )}
                    {recents.map((r) => (
                        <Row
                            active={r.path === workspacePath}
                            hint={r.path}
                            key={r.path}
                            label={r.name}
                            onClick={() => {
                                setOpen(false);
                                void switchWorkspace(r.path);
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
            className="flex w-full cursor-pointer items-center gap-2 rounded-7 border-none bg-transparent px-[9px] py-[7px] text-left font-[inherit] text-body-lg text-text hover:bg-hover"
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
