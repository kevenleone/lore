// The vault this window is showing, and how to open another one.
//
// Sits at the top of the sidebar because a workspace scopes everything below
// it — collections, tags and counts all mean something different in a
// different folder.

import { useEffect, useRef, useState } from 'react';

import { workspaceName } from '../../lib/workspace';
import { useStore } from '../../store/useStore';
import { hoverable } from '../../theme/util.css';
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
        <div ref={ref} style={{ padding: '0 2px 8px', position: 'relative' }}>
            <button
                onClick={() => setOpen((v) => !v)}
                style={{
                    alignItems: 'center',
                    background: open ? 'var(--hover, #f0f0f2)' : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    color: 'var(--text, #1a1a1f)',
                    cursor: 'pointer',
                    display: 'flex',
                    font: 'inherit',
                    gap: 8,
                    padding: '7px 9px',
                    textAlign: 'left',
                    width: '100%',
                }}
                title={workspacePath ?? DEFAULT_LABEL}
                type="button"
            >
                <Icon name="layers" size={15} />
                <span
                    style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: 600,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {label}
                </span>
                <ChevronDown />
            </button>

            {error && (
                <div
                    style={{
                        color: '#b4442f',
                        fontSize: 11.5,
                        lineHeight: 1.45,
                        padding: '4px 9px 0',
                    }}
                >
                    Could not open that folder — staying on {label}.
                </div>
            )}

            {open && (
                <div
                    role="menu"
                    style={{
                        background: 'var(--surface, #fff)',
                        border: '1px solid var(--border, #e4e4ea)',
                        borderRadius: 10,
                        boxShadow: '0 14px 32px -12px rgba(20,20,35,.28)',
                        left: 2,
                        padding: 5,
                        position: 'absolute',
                        right: 2,
                        top: '100%',
                        zIndex: 40,
                    }}
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
                        <div
                            style={{
                                color: 'var(--faint, #a8a8b0)',
                                fontSize: 10.5,
                                fontWeight: 680,
                                letterSpacing: '.07em',
                                padding: '8px 9px 4px',
                                textTransform: 'uppercase',
                            }}
                        >
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

                    <div
                        style={{
                            background: 'var(--border-soft, #f0f0f2)',
                            height: 1,
                            margin: '5px 0',
                        }}
                    />
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
            className={hoverable}
            onClick={onClick}
            style={{
                alignItems: 'center',
                background: 'transparent',
                border: 'none',
                borderRadius: 7,
                color: 'var(--text, #1a1a1f)',
                cursor: 'pointer',
                display: 'flex',
                font: 'inherit',
                fontSize: 13,
                gap: 8,
                padding: '7px 9px',
                textAlign: 'left',
                width: '100%',
            }}
            title={hint}
            type="button"
        >
            <span
                style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {label}
            </span>
            {active && (
                <span style={{ color: 'var(--ac)', display: 'flex' }}>
                    <Check />
                </span>
            )}
        </button>
    );
}
