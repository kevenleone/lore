// Main knowledge-base window: title bar over a three-pane body (sidebar · list ·
// detail/chat). The selected accent is published as the `--ac` CSS variable so
// every component can reference `var(--ac)` exactly as the prototype did.

import { useEffect } from "react";
import { useStore } from "./store/useStore";
import { openCaptureWindow } from "./lib/capture";
import { TitleBar } from "./components/kb/TitleBar";
import { Sidebar } from "./components/kb/Sidebar";
import { ListPane } from "./components/kb/ListPane";
import { DetailPane } from "./components/kb/DetailPane";
import { AskBalloonChat } from "./components/kb/AskBalloonChat";

export default function App() {
  const hydrate = useStore((s) => s.hydrate);
  const refresh = useStore((s) => s.refresh);
  const accent = useStore((s) => s.accent);
  const sidebarVisible = useStore((s) => s.sidebarVisible);
  const chatOpen = useStore((s) => s.chatOpen);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Refresh when the Quick Capture window saves a new item.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen("item:created", () => void refresh());
      } catch {
        // Outside Tauri — no event bus.
      }
    })();
    return () => unlisten?.();
  }, [refresh]);

  return (
    <div
      style={{
        // `--ac` drives every accent reference in the tree.
        ["--ac" as string]: accent,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        color: "#1a1a1f",
        overflow: "hidden",
      }}
    >
      <TitleBar onCapture={openCaptureWindow} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {sidebarVisible && <Sidebar onCapture={openCaptureWindow} />}
        <ListPane />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#fff" }}>
          {chatOpen ? <AskBalloonChat /> : <DetailPane />}
        </div>
      </div>
    </div>
  );
}
