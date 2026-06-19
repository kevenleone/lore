// Right pane: full detail for the selected item — type badge, editable title,
// saved metadata, a preview/code/text block, the AI summary, editable tags, and
// related items. Supports star (flag), delete, edit, and add/remove tags.

import { useEffect, useRef, useState } from "react";
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
import { External, Globe, StarOutline, Trash } from "../common/glyphs";
import { AiSummaryCard } from "./AiSummaryCard";
import { RelatedCards } from "./RelatedCards";

const AC = "var(--ac, #5b5bd6)";

const STRIPES = "repeating-linear-gradient(45deg,#f6f6f8,#f6f6f8 12px,#efeff3 12px,#efeff3 24px)";

async function openExternal(url: string) {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    window.open(url, "_blank");
  }
}

export function DetailPane() {
  const items = useStore((s) => s.items);
  const collections = useStore((s) => s.collections);
  const selectedId = useStore((s) => s.selectedId);
  const aiAssist = useStore((s) => s.aiAssist);
  const toggleStar = useStore((s) => s.toggleStar);
  const deleteItem = useStore((s) => s.deleteItem);
  const updateItem = useStore((s) => s.updateItem);
  const addTag = useStore((s) => s.addTag);
  const removeTag = useStore((s) => s.removeTag);

  const sel = items.find((i) => i.id === selectedId) ?? items[0];

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Reset transient edit state when the selection changes.
  useEffect(() => {
    setEditingTitle(false);
    setAddingTag(false);
    setTagDraft("");
  }, [sel?.id]);

  useEffect(() => {
    if (addingTag) tagInputRef.current?.focus();
  }, [addingTag]);

  if (!sel) {
    return <div style={{ flex: 1, background: "#fff" }} />;
  }

  const meta = typeMeta(sel.type);
  const coll = collectionFor(sel, collections);
  const related = relatedItems(sel, items);
  const flags = detailFlags(sel, aiAssist, related.length);
  const linkUrl = sel.type === "link" ? sel.snippet || (sel.domain ? `https://${sel.domain}` : "") : "";

  const commitTitle = () => {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (next && next !== sel.title) void updateItem(sel.id, { title: next });
  };

  const commitTag = () => {
    const next = tagDraft.trim();
    setAddingTag(false);
    setTagDraft("");
    if (next) void addTag(sel.id, next);
  };

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
          {linkUrl && (
            <span
              onClick={() => void openExternal(linkUrl)}
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
          )}
          <button
            type="button"
            title={sel.flags.starred ? "Remove flag" : "Flag"}
            onClick={() => void toggleStar(sel.id)}
            style={{ display: "inline-flex", color: sel.flags.starred ? AC : "#c4c4cc", cursor: "pointer", background: "none", border: "none", padding: 4 }}
          >
            <StarOutline style={sel.flags.starred ? { fill: AC } : undefined} />
          </button>
          <button
            type="button"
            title="Delete"
            onClick={() => void deleteItem(sel.id)}
            style={{ display: "inline-flex", color: "#c4c4cc", cursor: "pointer", background: "none", border: "none", padding: 4 }}
          >
            <Trash />
          </button>
        </span>
      </div>

      {/* editable title */}
      {editingTitle ? (
        <input
          autoFocus
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle();
            if (e.key === "Escape") setEditingTitle(false);
          }}
          style={{
            width: "100%",
            margin: "14px 0 0",
            fontSize: 23,
            fontWeight: 700,
            lineHeight: 1.25,
            letterSpacing: "-.015em",
            color: "#16161a",
            border: "none",
            borderBottom: `2px solid ${AC}`,
            outline: "none",
            font: "inherit",
            fontFamily: "inherit",
            background: "transparent",
          }}
        />
      ) : (
        <h1
          title="Click to edit"
          onClick={() => {
            setTitleDraft(sel.title);
            setEditingTitle(true);
          }}
          style={{ margin: "14px 0 0", fontSize: 23, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-.015em", color: "#16161a", cursor: "text" }}
        >
          {sel.title}
        </h1>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, fontSize: 12.5, color: "#9a9aa5" }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: coll?.color ?? "#c4c4cc" }} />
        {coll?.name ?? "Unfiled"}
        <span style={{ opacity: 0.5 }}>·</span>
        Saved {formatSavedDate(sel.createdAt)}
      </div>

      {/* body block */}
      {flags.showPreview &&
        (sel.image ? (
          <img
            src={sel.image}
            alt={sel.title}
            style={{ width: "100%", height: 204, objectFit: "cover", borderRadius: 13, border: "1px solid #ececef", margin: "20px 0 4px", display: "block" }}
          />
        ) : (
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
        ))}
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
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
          {sel.tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "ui-monospace,Menlo,monospace",
                fontSize: 12,
                color: AC,
                background: "#f0f0fb",
                borderRadius: 7,
                padding: "4px 9px",
              }}
            >
              #{tag}
              <span
                onClick={() => void removeTag(sel.id, tag)}
                title="Remove tag"
                style={{ cursor: "pointer", opacity: 0.55, fontSize: 13, lineHeight: 1 }}
              >
                ×
              </span>
            </span>
          ))}
          {addingTag ? (
            <input
              ref={tagInputRef}
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onBlur={commitTag}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTag();
                if (e.key === "Escape") {
                  setAddingTag(false);
                  setTagDraft("");
                }
              }}
              placeholder="tag"
              style={{
                fontFamily: "ui-monospace,Menlo,monospace",
                fontSize: 12,
                width: 80,
                color: AC,
                border: `1px solid ${AC}`,
                borderRadius: 7,
                padding: "3px 8px",
                outline: "none",
                background: "transparent",
              }}
            />
          ) : (
            <span
              onClick={() => setAddingTag(true)}
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
          )}
        </div>
      </div>

      {flags.showRelated && <RelatedCards related={related} />}
    </div>
  );
}
