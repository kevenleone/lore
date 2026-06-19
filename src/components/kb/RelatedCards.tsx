// "Related" section in the detail pane — AI-surfaced item cards.

import { useStore } from "../../store/useStore";
import { typeMeta } from "../../store/typeMeta";
import type { Item } from "../../store/types";
import { Icon } from "../common/Icon";
import { Sparkle, ChevronRight } from "../common/glyphs";
import { hoverCard } from "../../theme/util.css";

const AC = "var(--ac, #5b5bd6)";

export function RelatedCards({ related }: { related: Item[] }) {
  const selectItem = useStore((s) => s.selectItem);

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
        <span style={{ fontSize: 11, fontWeight: 680, letterSpacing: ".06em", textTransform: "uppercase", color: "#a8a8b0" }}>
          Related
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: AC }}>
          <Sparkle size={12} />
          surfaced by AI
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {related.map((r) => {
          const meta = typeMeta(r.type);
          return (
            <div
              key={r.id}
              className={hoverCard}
              onClick={() => selectItem(r.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                border: "1px solid #ececef",
                borderRadius: 11,
                padding: "11px 13px",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: meta.bg,
                  color: meta.fg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                <Icon name={r.type} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#1a1a1f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.title}
                </div>
                <div style={{ fontSize: 12, color: "#9a9aa5" }}>{r.domain || meta.label}</div>
              </div>
              <span style={{ color: "#c4c4cc", flex: "none", display: "flex" }}>
                <ChevronRight />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
