// `Lore Settings.dc.html` frame 1a — settings as a modal sheet over the
// knowledge-base window: a scrim, a 232px pane rail on the left, and the active
// pane on the right. Esc and the scrim both dismiss it.

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../store/useStore";
import { LoreMark } from "../common/LoreMark";
import { SettingsIcon, type SettingsIconName } from "../common/settingsGlyphs";
import type { SettingsPane } from "../../store/types";
import {
  AboutPane,
  AccountPane,
  CalendarPane,
  CapturePane,
  FocusPane,
  GeneralPane,
  KeysPane,
  LookPane,
  NotifPane,
  SyncPane,
} from "./panes";
import { iconButton, navItem, scrim, sheet } from "./SettingsModal.css";

interface PaneDef {
  id: SettingsPane;
  label: string;
  icon: SettingsIconName;
  Body: () => React.JSX.Element;
}

const PANES: PaneDef[] = [
  { id: "general", label: "General", icon: "gear", Body: GeneralPane },
  { id: "account", label: "Account", icon: "user", Body: AccountPane },
  { id: "look", label: "Look & Feel", icon: "palette", Body: LookPane },
  { id: "keys", label: "Keyboard Shortcuts", icon: "keyboard", Body: KeysPane },
  { id: "notif", label: "Notifications", icon: "bell", Body: NotifPane },
  { id: "capture", label: "Capture & AI", icon: "sparkle", Body: CapturePane },
  { id: "sync", label: "Sync", icon: "cloud", Body: SyncPane },
  { id: "focus", label: "Focus & Timer", icon: "timer", Body: FocusPane },
  { id: "cal", label: "Calendar", icon: "calendar", Body: CalendarPane },
  { id: "about", label: "About", icon: "info", Body: AboutPane },
];

export function SettingsModal() {
  const pane = useStore((s) => s.settingsPane);
  const setPane = useStore((s) => s.setSettingsPane);
  const close = useStore((s) => s.closeSettings);
  const [filter, setFilter] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);

  // Esc closes; focus moves into the sheet so keyboard users land inside it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    sheetRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? PANES.filter((p) => p.label.toLowerCase().includes(q)) : PANES;
  }, [filter]);

  const active = PANES.find((p) => p.id === pane) ?? PANES[0];

  return (
    <>
      <div className={scrim} onClick={close} />
      <div
        ref={sheetRef}
        className={sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Lore settings"
        tabIndex={-1}
      >
        {/* ---- rail ---- */}
        <div
          style={{
            width: 232,
            flex: "none",
            background: "var(--surface2, #fafafa)",
            borderRight: "1px solid var(--border, #ececef)",
            display: "flex",
            flexDirection: "column",
            padding: "14px 10px 10px",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface3, #f1f1f3)",
              borderRadius: 8,
              padding: "6px 9px",
              color: "var(--text3, #9a9aa5)",
              fontSize: 12.5,
              marginBottom: 12,
            }}
          >
            <SettingsIcon name="search" size={14} sw={1.9} />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search settings"
              style={{
                flex: 1,
                minWidth: 0,
                border: "none",
                outline: "none",
                background: "transparent",
                font: "inherit",
                color: "var(--text, #1a1a1f)",
              }}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 1, overflow: "auto" }}>
            {visible.map((p) => {
              const on = p.id === pane;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={navItem}
                  onClick={() => setPane(p.id)}
                  aria-current={on ? "page" : undefined}
                  style={
                    on
                      ? { background: "var(--ac-tint, #eeeef2)", color: "var(--ac)", fontWeight: 600 }
                      : { color: "var(--text2, #3b3b44)" }
                  }
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                      ...(on
                        ? { background: "var(--ac)", color: "#fff" }
                        : {
                            background: "var(--surface3, #f1f1f3)",
                            color: "var(--text2, #6b6b76)",
                          }),
                    }}
                  >
                    <SettingsIcon name={p.icon} size={15} />
                  </span>
                  <span style={{ flex: 1 }}>{p.label}</span>
                </button>
              );
            })}
            {visible.length === 0 && (
              <div style={{ fontSize: 12.5, color: "var(--text3, #9a9aa5)", padding: "8px 9px" }}>
                No matching settings.
              </div>
            )}
          </div>

          <div style={{ flex: 1, minHeight: 12 }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "9px 10px",
              borderTop: "1px solid var(--border, #ececef)",
              fontSize: 11.5,
              color: "var(--text3, #9a9aa5)",
            }}
          >
            <span style={{ display: "inline-flex", color: "var(--text2, #6b6b76)" }}>
              <LoreMark size={13} />
            </span>
            <span>Lore 2.4.1 · up to date</span>
          </div>
        </div>

        {/* ---- pane ---- */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              height: 52,
              flex: "none",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "0 20px 0 26px",
              borderBottom: "1px solid var(--border, #ececef)",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 680, letterSpacing: "-.005em" }}>
              {active.label}
            </span>
            <button
              type="button"
              className={iconButton}
              onClick={close}
              aria-label="Close settings"
              style={{ marginLeft: "auto" }}
            >
              <SettingsIcon name="close" size={17} sw={1.9} />
            </button>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: "24px 26px 30px" }}>
            <active.Body />
          </div>
        </div>
      </div>
    </>
  );
}
