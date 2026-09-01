// Top window bar: traffic lights, sidebar toggle, a window-centered ⌘K search,
// AI-chat toggle, view/sort buttons, and the Capture button. Custom-drawn to
// match the prototype; the window uses `decorations:false`, so the dots drive
// the real window controls.

import { useEffect, useRef } from "react";
import { useStore } from "../../store/useStore";
import { Search, SidebarToggle, ViewList, Sort, Plus, Sparkle } from "../common/glyphs";

const AC = "var(--ac, #5b5bd6)";

async function windowControl(action: "close" | "minimize" | "toggleMaximize") {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const w = getCurrentWindow();
    if (action === "close") await w.close();
    else if (action === "minimize") await w.minimize();
    else await w.toggleMaximize();
  } catch {
    // Running outside Tauri (e.g. Vite preview) — controls are decorative.
  }
}

function TrafficLight({ color, action }: { color: string; action: "close" | "minimize" | "toggleMaximize" }) {
  return (
    <span
      onClick={() => windowControl(action)}
      style={{ width: 12, height: 12, borderRadius: "50%", background: color, cursor: "pointer" }}
    />
  );
}

export function TitleBar({ onCapture }: { onCapture: () => void }) {
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const toggleChat = useStore((s) => s.toggleChat);
  const chatOpen = useStore((s) => s.chatOpen);
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K focuses the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      data-tauri-drag-region
      style={{
        position: "relative",
        height: 46,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 14px",
        borderBottom: "1px solid var(--border, #ececef)",
        background: "rgba(252,252,253,.86)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        flex: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <TrafficLight color="#ff5f57" action="close" />
        <TrafficLight color="#febc2e" action="minimize" />
        <TrafficLight color="#28c840" action="toggleMaximize" />
      </div>

      <span
        onClick={toggleSidebar}
        style={{ color: "var(--faint, #a8a8b0)", display: "flex", marginLeft: 4, cursor: "pointer" }}
      >
        <SidebarToggle />
      </span>

      <div style={{ flex: 1 }} />

      {/* window-centered search */}
      <label
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "min(420px, 38vw)",
          background: "var(--surface3, #f1f1f3)",
          borderRadius: 9,
          padding: "7px 11px",
          color: search ? "#1a1a1f" : "#9a9aa5",
          fontSize: 13,
        }}
      >
        <Search />
        <input
          ref={inputRef}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your knowledge…"
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
        <span
          style={{
            fontFamily: "ui-monospace,Menlo,monospace",
            fontSize: 11,
            color: "var(--faint, #a8a8b0)",
            background: "var(--surface, #fff)",
            border: "1px solid var(--border, #e4e4ea)",
            borderRadius: 5,
            padding: "1px 6px",
          }}
        >
          ⌘K
        </span>
      </label>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          onClick={toggleChat}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            ...(chatOpen ? { background: "var(--ac-tint, #eeeef2)", color: AC } : { color: "var(--text2, #6b6b76)" }),
          }}
        >
          <Sparkle />
        </span>
        <ChromeButton>
          <ViewList />
        </ChromeButton>
        <ChromeButton>
          <Sort />
        </ChromeButton>
        <span
          onClick={onCapture}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12.5,
            fontWeight: 600,
            color: "#fff",
            background: AC,
            borderRadius: 8,
            padding: "6px 11px",
            cursor: "pointer",
            marginLeft: 4,
          }}
        >
          <Plus />
          Capture
          <span
            style={{
              fontFamily: "ui-monospace,Menlo,monospace",
              fontSize: 10.5,
              background: "rgba(255,255,255,.22)",
              borderRadius: 5,
              padding: "1px 6px",
            }}
          >
            ⌥Space
          </span>
        </span>
      </div>
    </div>
  );
}

function ChromeButton({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--text2, #6b6b76)",
      }}
    >
      {children}
    </span>
  );
}
