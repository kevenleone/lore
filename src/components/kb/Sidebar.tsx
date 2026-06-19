// Left sidebar: Quick Capture, Library views (with counts), Collections, Tags,
// and the footer (Ask Balloon + Settings).

import { useStore } from "../../store/useStore";
import { SEED_TAG_ORDER } from "../../store/seed";
import type { IconName, View } from "../../store/types";
import { isViewActive, tagCounts, viewCounts } from "../../store/views";
import { Icon } from "../common/Icon";
import { Message, Settings, Sparkle } from "../common/glyphs";
import { hoverable } from "../../theme/util.css";
import { CollectionsSection } from "./CollectionsSection";

const AC = "var(--ac, #5b5bd6)";

const ROW_BASE = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "6px 9px",
  borderRadius: 7,
  cursor: "pointer",
  fontSize: 13.5,
} as const;

function rowStyle(active: boolean): React.CSSProperties {
  return active
    ? { ...ROW_BASE, background: "#f0f0fb", color: AC, fontWeight: 590 }
    : { ...ROW_BASE, color: "#3b3b44" };
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 680,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "#a8a8b0",
  padding: "15px 9px 5px",
};

const LIB_VIEWS: { kind: View["kind"]; label: string; icon: IconName; countKey: keyof ReturnType<typeof viewCounts> }[] = [
  { kind: "all", label: "All Items", icon: "layers", countKey: "all" },
  { kind: "inbox", label: "Inbox", icon: "inbox", countKey: "inbox" },
  { kind: "today", label: "Today", icon: "calendar", countKey: "today" },
  { kind: "starred", label: "Flagged", icon: "star", countKey: "starred" },
];

export function Sidebar({ onCapture }: { onCapture: () => void }) {
  const items = useStore((s) => s.items);
  const view = useStore((s) => s.view);
  const selectView = useStore((s) => s.selectView);
  const toggleChat = useStore((s) => s.toggleChat);

  const counts = viewCounts(items);
  const tags = tagCounts(items, SEED_TAG_ORDER);

  const countStyle: React.CSSProperties = {
    fontSize: 12,
    opacity: 0.5,
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <div
      style={{
        width: 248,
        flex: "none",
        background: "#fafafa",
        borderRight: "1px solid #ececef",
        display: "flex",
        flexDirection: "column",
        padding: 10,
        overflow: "auto",
        fontSize: 13.5,
      }}
    >
      {/* Quick Capture */}
      <div
        onClick={onCapture}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          background: "#f0f0fb",
          color: AC,
          border: "1px solid #e4e4f7",
          borderRadius: 9,
          padding: "9px 11px",
          fontWeight: 590,
          cursor: "pointer",
          marginBottom: 10,
        }}
      >
        <Sparkle size={15} />
        Quick Capture
        <span style={{ marginLeft: "auto", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, opacity: 0.75 }}>
          ⌥Space
        </span>
      </div>

      {/* Library */}
      <div style={{ ...SECTION_LABEL, paddingTop: 6 }}>Library</div>
      {LIB_VIEWS.map((v) => {
        const active = isViewActive(view, v.kind);
        return (
          <div
            key={v.kind}
            className={active ? undefined : hoverable}
            style={rowStyle(active)}
            onClick={() => selectView(v.kind, null)}
          >
            <span style={{ display: "flex", flex: "none" }}>
              <Icon name={v.icon} />
            </span>
            <span style={{ flex: 1 }}>{v.label}</span>
            <span style={countStyle}>{counts[v.countKey]}</span>
          </div>
        );
      })}

      {/* Collections (add / edit / remove) */}
      <CollectionsSection />

      {/* Tags */}
      <div style={SECTION_LABEL}>Tags</div>
      {tags.map((t) => {
        const active = isViewActive(view, "tag", t.name);
        return (
          <div
            key={t.name}
            className={active ? undefined : hoverable}
            style={rowStyle(active)}
            onClick={() => selectView("tag", t.name)}
          >
            <span style={{ display: "flex", flex: "none", opacity: 0.6 }}>
              <Icon name="hash" />
            </span>
            <span style={{ flex: 1 }}>{t.name}</span>
            <span style={countStyle}>{t.count}</span>
          </div>
        );
      })}

      <div style={{ flex: 1, minHeight: 16 }} />

      {/* Footer */}
      <div className={hoverable} onClick={toggleChat} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: 7, cursor: "pointer", color: "#3b3b44" }}>
        <span style={{ color: AC, display: "flex", flex: "none" }}>
          <Message />
        </span>
        Ask Balloon
        <span style={{ marginLeft: "auto", fontSize: 11, background: "#eeeefb", color: AC, borderRadius: 5, padding: "1px 6px", fontWeight: 600 }}>
          AI
        </span>
      </div>
      <div className={hoverable} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 9px", borderRadius: 7, cursor: "pointer", color: "#6b6b76" }}>
        <span style={{ display: "flex", flex: "none" }}>
          <Settings />
        </span>
        Settings
      </div>
    </div>
  );
}
