// Root of the Quick Capture window — a transparent, frameless panel (Spotlight
// style). Only the floating card is visible; clicking the empty backdrop or
// losing focus dismisses it. Hosts both capture directions (A command bar,
// B composer) behind a small toggle.

import { useEffect, useState } from "react";
import { DEFAULT_ACCENT } from "../../store/types";
import { hideCapture } from "../../lib/captureActions";
import { CommandBar } from "./CommandBar";
import { Composer } from "./Composer";

const AC = "var(--ac, #5b5bd6)";
type Mode = "A" | "B";

export function CaptureApp() {
  const [mode, setMode] = useState<Mode>("A");

  // Esc closes; clicking the backdrop closes; losing focus closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void hideCapture();
    };
    window.addEventListener("keydown", onKey);

    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        unlisten = await getCurrentWindow().onFocusChanged(({ payload: focused }) => {
          if (!focused) void hideCapture();
        });
      } catch {
        // Outside Tauri.
      }
    })();

    return () => {
      window.removeEventListener("keydown", onKey);
      unlisten?.();
    };
  }, []);

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) void hideCapture();
      }}
      style={{
        ["--ac" as string]: DEFAULT_ACCENT,
        height: "100%",
        boxSizing: "border-box",
        padding: "26px 28px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        background: "transparent",
        overflow: "hidden",
      }}
    >
      {/* direction toggle — a floating segmented control */}
      <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,.82)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 9, padding: 3, boxShadow: "0 6px 18px -6px rgba(24,24,48,.35)", border: "1px solid rgba(0,0,0,.05)" }}>
        <Toggle active={mode === "A"} onClick={() => setMode("A")}>
          Command bar
        </Toggle>
        <Toggle active={mode === "B"} onClick={() => setMode("B")}>
          Composer
        </Toggle>
      </div>

      <div style={{ width: "100%", maxWidth: 560 }}>
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
        padding: "5px 12px",
        borderRadius: 7,
        cursor: "pointer",
        fontWeight: active ? 600 : 500,
        color: active ? "#fff" : "#6b6b76",
        background: active ? AC : "transparent",
      }}
    >
      {children}
    </span>
  );
}
