// The vault this window is showing, and how to open another one.
//
// Sits at the top of the sidebar because a workspace scopes everything below
// it — collections, tags and counts all mean something different in a
// different folder.

import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store/useStore";
import { workspaceName } from "../../lib/workspace";
import { ChevronDown, Check } from "../common/glyphs";
import { Icon } from "../common/Icon";
import { hoverable } from "../../theme/util.css";

const DEFAULT_LABEL = "Local vault";

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
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = workspacePath ? workspaceName(workspacePath) : DEFAULT_LABEL;

  return (
    <div ref={ref} style={{ position: "relative", padding: "0 2px 8px" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={workspacePath ?? DEFAULT_LABEL}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "7px 9px",
          border: "none",
          borderRadius: 8,
          background: open ? "var(--hover, #f0f0f2)" : "transparent",
          cursor: "pointer",
          font: "inherit",
          color: "var(--text, #1a1a1f)",
          textAlign: "left",
        }}
      >
        <Icon name="layers" size={15} />
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13,
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <ChevronDown />
      </button>

      {error && (
        <div
          style={{
            fontSize: 11.5,
            lineHeight: 1.45,
            color: "#b4442f",
            padding: "4px 9px 0",
          }}
        >
          Could not open that folder — staying on {label}.
        </div>
      )}

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "100%",
            left: 2,
            right: 2,
            zIndex: 40,
            background: "var(--surface, #fff)",
            border: "1px solid var(--border, #e4e4ea)",
            borderRadius: 10,
            boxShadow: "0 14px 32px -12px rgba(20,20,35,.28)",
            padding: 5,
          }}
        >
          <Row
            label={DEFAULT_LABEL}
            hint="The vault Lore keeps for you"
            active={workspacePath === null}
            onClick={() => {
              setOpen(false);
              void switchWorkspace(null);
            }}
          />

          {recents.filter((r) => r.path !== workspacePath).length > 0 && (
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 680,
                letterSpacing: ".07em",
                textTransform: "uppercase",
                color: "var(--faint, #a8a8b0)",
                padding: "8px 9px 4px",
              }}
            >
              Recent
            </div>
          )}
          {recents.map((r) => (
            <Row
              key={r.path}
              label={r.name}
              hint={r.path}
              active={r.path === workspacePath}
              onClick={() => {
                setOpen(false);
                void switchWorkspace(r.path);
              }}
            />
          ))}

          <div style={{ height: 1, background: "var(--border-soft, #f0f0f2)", margin: "5px 0" }} />
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
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={hoverable}
      onClick={onClick}
      title={hint}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "7px 9px",
        border: "none",
        background: "transparent",
        borderRadius: 7,
        cursor: "pointer",
        font: "inherit",
        fontSize: 13,
        color: "var(--text, #1a1a1f)",
        textAlign: "left",
      }}
    >
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      {active && (
        <span style={{ display: "flex", color: "var(--ac)" }}>
          <Check />
        </span>
      )}
    </button>
  );
}
