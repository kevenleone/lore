// Right pane: full detail for the selected item — type badge, title, saved
// metadata, a preview/code/text block, the AI summary, tags, and related items.

import { useStore } from "../../store/useStore";
import { typeMeta } from "../../store/typeMeta";
import {
  collectionFor,
  detailFlags,
  previewLabel,
  relatedItems,
} from "../../store/views";
import { formatSavedDate } from "../../lib/format";
import { Icon } from "../common/Icon";
import { External, Globe, StarOutline } from "../common/glyphs";
import { AiSummaryCard } from "./AiSummaryCard";
import { RelatedCards } from "./RelatedCards";

const AC = "var(--ac, #5b5bd6)";

const STRIPES = "repeating-linear-gradient(45deg,#f6f6f8,#f6f6f8 12px,#efeff3 12px,#efeff3 24px)";

export function DetailPane() {
  const items = useStore((s) => s.items);
  const collections = useStore((s) => s.collections);
  const selectedId = useStore((s) => s.selectedId);
  const aiAssist = useStore((s) => s.aiAssist);

  const sel = items.find((i) => i.id === selectedId) ?? items[0];
  if (!sel) {
    return <div style={{ flex: 1, background: "#fff" }} />;
  }

  const meta = typeMeta(sel.type);
  const coll = collectionFor(sel, collections);
  const related = relatedItems(sel, items);
  const flags = detailFlags(sel, aiAssist, related.length);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "28px 34px" }}>
      {/* header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11.5,
            fontWeight: 600,
            color: meta.fg,
            background: meta.bg,
            borderRadius: 6,
            padding: "3px 9px",
          }}
        >
          <Icon name={sel.type} size={13} /> {meta.label}
        </span>
        {sel.domain && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "#9a9aa5" }}>
            <Globe />
            {sel.domain}
          </span>
        )}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12.5,
              color: "#6b6b76",
              border: "1px solid #e4e4ea",
              borderRadius: 8,
              padding: "5px 11px",
              cursor: "pointer",
            }}
          >
            <External />
            Open
          </span>
          <span style={{ display: "inline-flex", color: sel.flags.starred ? AC : "#c4c4cc", cursor: "pointer" }}>
            <StarOutline />
          </span>
        </span>
      </div>

      <h1 style={{ margin: "14px 0 0", fontSize: 23, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-.015em", color: "#16161a" }}>
        {sel.title}
      </h1>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, fontSize: 12.5, color: "#9a9aa5" }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: coll?.color ?? "#c4c4cc" }} />
        {coll?.name ?? "Unfiled"}
        <span style={{ opacity: 0.5 }}>·</span>
        Saved {formatSavedDate(sel.createdAt)}
      </div>

      {/* body block */}
      {flags.showPreview && (
        <div
          style={{
            height: 204,
            borderRadius: 13,
            border: "1px solid #ececef",
            margin: "20px 0 4px",
            background: STRIPES,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, color: "#a7a7b0", letterSpacing: ".04em" }}>
            {previewLabel(sel)}
          </span>
        </div>
      )}
      {flags.detIsCode && (
        <pre
          style={{
            margin: "20px 0 4px",
            fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
            fontSize: 13,
            lineHeight: 1.7,
            color: "#2a2a32",
            background: "#f7f7f8",
            border: "1px solid #ececef",
            borderRadius: 11,
            padding: 16,
            whiteSpace: "pre",
            overflow: "auto",
          }}
        >
          {sel.snippet}
        </pre>
      )}
      {flags.detIsText && (
        <p style={{ margin: "18px 0 4px", fontSize: 15, lineHeight: 1.65, color: "#3b3b44" }}>{sel.snippet}</p>
      )}

      {flags.showSummary && sel.summary && (
        <AiSummaryCard summary={sel.summary} points={sel.points ?? []} showPoints={flags.showPoints} />
      )}

      {/* tags */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 680, letterSpacing: ".06em", textTransform: "uppercase", color: "#a8a8b0", marginBottom: 9 }}>
          Tags
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {sel.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontFamily: "ui-monospace,Menlo,monospace",
                fontSize: 12,
                color: AC,
                background: "#f0f0fb",
                borderRadius: 7,
                padding: "4px 9px",
              }}
            >
              #{tag}
            </span>
          ))}
          <span
            style={{
              fontFamily: "ui-monospace,Menlo,monospace",
              fontSize: 12,
              color: "#a3a3ad",
              border: "1px dashed #d2d2dc",
              borderRadius: 7,
              padding: "3px 9px",
              cursor: "pointer",
            }}
          >
            + add
          </span>
        </div>
      </div>

      {flags.showRelated && <RelatedCards related={related} />}
    </div>
  );
}
