// The repeating pieces every settings pane is built from: section labels,
// label/description rows with a trailing control, the pill toggle, segmented
// controls, and the "value + chevron" stand-in for a menu that has no backend
// behind it yet.

import type { CSSProperties, ReactNode } from "react";
import { SettingsIcon } from "../common/settingsGlyphs";
import { pillButton, segItem, settingsRow } from "./SettingsModal.css";

export function SectionLabel({ children, first }: { children: ReactNode; first?: boolean }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 680,
        letterSpacing: ".07em",
        textTransform: "uppercase",
        color: "var(--faint, #a8a8b0)",
        margin: first ? "0 0 4px" : "26px 0 4px",
      }}
    >
      {children}
    </div>
  );
}

/** A settings line: title, optional description, and whatever control follows. */
export function Row({
  title,
  desc,
  children,
  last,
}: {
  title: string;
  desc?: string;
  children?: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={settingsRow}
      style={last ? { borderBottom: "none" } : undefined}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{title}</div>
        {desc && (
          <div
            style={{
              fontSize: 12.5,
              lineHeight: 1.5,
              color: "var(--text3, #9a9aa5)",
              marginTop: 2,
            }}
          >
            {desc}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/** The 38x22 pill switch used across every pane. */
export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      style={{
        width: 38,
        height: 22,
        borderRadius: 12,
        flex: "none",
        position: "relative",
        cursor: "pointer",
        padding: 0,
        border: "none",
        transition: "background .16s ease",
        background: on ? "var(--ac)" : "var(--track-off, #d9d9e0)",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.22)",
          transition: "left .16s ease",
        }}
      />
    </button>
  );
}

/** Segmented control (Cozy/Compact/Roomy, Banner/Alert, Day/Week/Month). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        background: "var(--surface3, #f1f1f3)",
        borderRadius: 9,
        padding: 3,
        flex: "none",
      }}
    >
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={segItem}
          onClick={() => onChange(o)}
          aria-pressed={o === value}
          style={
            o === value
              ? {
                  background: "var(--surface, #fff)",
                  color: "var(--text, #1a1a1f)",
                  fontWeight: 600,
                  boxShadow: "0 1px 2px rgba(0,0,0,.08)",
                }
              : { color: "var(--text2, #6b6b76)" }
          }
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/**
 * A menu-shaped control whose options need a backend that does not exist yet
 * (calendars to file into, digest schedules, week start). It renders the
 * current value and cycles through `options` on click so the row is not dead.
 */
export function Chooser<T extends string | number>({
  value,
  options,
  onChange,
  leading,
}: {
  value: T;
  options: readonly T[];
  onChange?: (v: T) => void;
  leading?: ReactNode;
}) {
  const next = () => {
    if (!onChange) return;
    const i = options.indexOf(value);
    onChange(options[(i + 1) % options.length]);
  };
  return (
    <button type="button" className={pillButton} onClick={next} disabled={!onChange}>
      {leading}
      {value}
      <SettingsIcon name="chevronDown" size={13} sw={2} />
    </button>
  );
}

/** Outlined action button (Sync now, Change plan, Reveal in Finder…). */
export function PillButton({
  children,
  onClick,
  tone = "neutral",
  style,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "neutral" | "danger";
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      className={pillButton}
      onClick={onClick}
      style={{ ...(tone === "danger" ? { color: "#b4442f" } : null), ...style }}
    >
      {children}
    </button>
  );
}

/** A ⌘/⇧/K key cap in the shortcuts pane. */
export function KeyCap({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "ui-monospace,Menlo,monospace",
        fontSize: 11.5,
        minWidth: 22,
        textAlign: "center",
        color: "var(--text2, #6b6b76)",
        background: "var(--kbd-bg, #fff)",
        border: "1px solid var(--kbd-border, #e2e2e7)",
        borderBottomWidth: 2,
        borderRadius: 6,
        padding: "2px 6px",
      }}
    >
      {children}
    </span>
  );
}
