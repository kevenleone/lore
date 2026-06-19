// Root of the Quick Capture window. Hosts both capture directions (A command
// bar, B composer) behind a small toggle, sets the accent, and wires Esc to
// close the window.

import { useEffect, useState } from "react";
import { DEFAULT_ACCENT } from "../../store/types";
import { hideCapture } from "../../lib/captureActions";
import { CommandBar } from "./CommandBar";
import { Composer } from "./Composer";
import { Sparkle } from "../common/glyphs";

const AC = "var(--ac, #5b5bd6)";
type Mode = "A" | "B";

export function CaptureApp() {
  const [mode, setMode] = useState<Mode>("A");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void hideCapture();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      style={{
        ["--ac" as string]: DEFAULT_ACCENT,
        height: "100%",
        boxSizing: "border-box",
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        background: "#e7e5df",
        overflow: "hidden",
      }}
    >
      {/* brand + direction toggle */}
      <div data-tauri-drag-region style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 11, height: 11, borderRadius: "50%", background: AC, boxShadow: "0 2px 7px rgba(91,91,214,.45)" }} />
        <span style={{ fontSize: 15, fontWeight: 680, letterSpacing: "-.015em" }}>Balloon</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#8a887f", marginLeft: 4 }}>
          <Sparkle size={11} style={{ color: AC }} />
          Quick capture
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: "#ddddd6", borderRadius: 9, padding: 3 }}>
          <Toggle active={mode === "A"} onClick={() => setMode("A")}>
            Command bar
          </Toggle>
          <Toggle active={mode === "B"} onClick={() => setMode("B")}>
            Composer
          </Toggle>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: mode === "A" ? "flex-start" : "stretch" }}>
        {mode === "A" ? <CommandBar /> : <Composer />}
      </div>
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <span
      onClick={onClick}
      style={{
        fontSize: 12,
        padding: "5px 11px",
        borderRadius: 7,
        cursor: "pointer",
        fontWeight: active ? 600 : 500,
        color: active ? "#1a1a1f" : "#7a7870",
        background: active ? "#fff" : "transparent",
        boxShadow: active ? "0 1px 3px rgba(0,0,0,.12)" : "none",
      }}
    >
      {children}
    </span>
  );
}
