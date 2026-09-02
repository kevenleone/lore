// A one-off message across the top of the window.
//
// Exists because the legacy import used to happen in complete silence: the
// library moved out of a database and into a folder of files, and the app never
// said so. A migration you are not told about is indistinguishable from one
// that went wrong.

import { useStore } from "../../store/useStore";
import { SettingsIcon } from "../common/settingsGlyphs";
import { iconButton } from "../settings/SettingsModal.css";

export function Notice() {
  const message = useStore((s) => s.migrationNotice);
  const dismiss = useStore((s) => s.dismissMigrationNotice);

  if (!message) return null;

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flex: "none",
        padding: "9px 14px",
        background: "var(--ac-tint, #eeeef2)",
        borderBottom: "1px solid var(--ac-border, #dedee5)",
        fontSize: 13,
        color: "var(--text, #1a1a1f)",
      }}
    >
      <span style={{ display: "inline-flex", color: "var(--ac)", flex: "none" }}>
        <SettingsIcon name="check" size={15} sw={2.2} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>{message}</span>
      <button
        type="button"
        className={iconButton}
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ width: 24, height: 24 }}
      >
        <SettingsIcon name="close" size={14} sw={2} />
      </button>
    </div>
  );
}
