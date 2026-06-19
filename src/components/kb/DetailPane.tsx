// Right pane: full detail for the selected item — type badge, editable title,
// saved metadata, an (image) preview, the link description, editable body
// (note/task/code), the AI summary, editable tags, and related items.
// Supports star (flag), delete-with-confirmation, edit, and add/remove tags.

import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store/useStore";
import { typeMeta } from "../../store/typeMeta";
import { collectionFor, detailFlags, relatedItems } from "../../store/views";
import { formatSavedDate } from "../../lib/format";
import { Icon } from "../common/Icon";
import { External, Globe, StarOutline, Trash } from "../common/glyphs";
import { AiSummaryCard } from "./AiSummaryCard";
import { RelatedCards } from "./RelatedCards";

const AC = "var(--ac, #5b5bd6)";

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
  const [editingBody, setEditingBody] = useState(false);
  const [bodyDraft, setBodyDraft] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditingTitle(false);
    setEditingBody(false);
    setAddingTag(false);
    setTagDraft("");
    setConfirmDelete(false);
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

  // The editable body targets `snippet` for note/task/code, `description` for links.
  const bodyField: "snippet" | "description" | null = flags.detIsCode || flags.detIsText ? "snippet" : sel.type === "link" ? "description" : null;
  const bodyValue = bodyField === "snippet" ? sel.snippet : bodyField === "description" ? sel.description : undefined;

  const commitTitle = () => {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (next && next !== sel.title) void updateItem(sel.id, { title: next });
  };

  const startBody = () => {
    setBodyDraft(bodyValue ?? "");
    setEditingBody(true);
  };
  const commitBody = () => {
    setEditingBody(false);
    if (bodyDraft === (bodyValue ?? "")) return;
    if (bodyField === "snippet") void updateItem(sel.id, { snippet: bodyDraft });
    else if (bodyField === "description") void updateItem(sel.id, { description: bodyDraft });
  };

  const commitTag = () => {
    const next = tagDraft.trim();
    setAddingTag(false);
    setTagDraft("");
    if (next) void addTag(sel.id, next);
  };

  const bodyTextareaStyle = (mono: boolean): React.CSSProperties => ({
    width: "100%",
    margin: "18px 0 4px",
    border: `1px solid ${AC}`,
    borderRadius: 11,
    padding: 14,
    outline: "none",
    resize: "vertical",
    minHeight: 120,
    ...(mono
      ? { fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 13, lineHeight: 1.7, color: "#2a2a32", background: "#f7f7f8" }
      : { font: "inherit", fontSize: 15, lineHeight: 1.65, color: "#3b3b44" }),
  });

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "28px 34px" }}>
      {/* header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: meta.fg, background: meta.bg, borderRadius: 6, padding: "3px 9px" }}>
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
            <span onClick={() => void openExternal(linkUrl)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#6b6b76", border: "1px solid #e4e4ea", borderRadius: 8, padding: "5px 11px", cursor: "pointer" }}>
              <External />
              Open
            </span>
          )}
          <button type="button" title={sel.flags.starred ? "Remove flag" : "Flag"} onClick={() => void toggleStar(sel.id)} style={{ display: "inline-flex", color: sel.flags.starred ? AC : "#c4c4cc", cursor: "pointer", background: "none", border: "none", padding: 4 }}>
            <StarOutline style={sel.flags.starred ? { fill: AC } : undefined} />
          </button>
          <button type="button" title="Delete" onClick={() => setConfirmDelete(true)} style={{ display: "inline-flex", color: "#c4c4cc", cursor: "pointer", background: "none", border: "none", padding: 4 }}>
            <Trash />
          </button>
        </span>

        {confirmDelete && (
          <div style={{ position: "absolute", right: 0, top: 36, zIndex: 30, background: "#fff", border: "1px solid #ececef", borderRadius: 12, boxShadow: "0 16px 40px -12px rgba(24,24,48,.35)", padding: 16, width: 260 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#16161a" }}>Delete this item?</div>
            <div style={{ fontSize: 12.5, color: "#9a9aa5", marginTop: 4 }}>This removes “{sel.title}” from your knowledge base.</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
              <span onClick={() => setConfirmDelete(false)} style={{ fontSize: 13, color: "#6b6b76", padding: "6px 12px", borderRadius: 8, cursor: "pointer" }}>
                Cancel
              </span>
              <span
                onClick={() => {
                  setConfirmDelete(false);
                  void deleteItem(sel.id);
                }}
                style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "#c0392b", padding: "6px 14px", borderRadius: 8, cursor: "pointer" }}
              >
                Delete
              </span>
            </div>
          </div>
        )}
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
          style={{ width: "100%", margin: "14px 0 0", fontSize: 23, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-.015em", color: "#16161a", border: "none", borderBottom: `2px solid ${AC}`, outline: "none", font: "inherit", fontFamily: "inherit", background: "transparent" }}
        />
      ) : (
        <h1 title="Click to edit" onClick={() => { setTitleDraft(sel.title); setEditingTitle(true); }} style={{ margin: "14px 0 0", fontSize: 23, fontWeight: 700, lineHeight: 1.25, letterSpacing: "-.015em", color: "#16161a", cursor: "text" }}>
          {sel.title}
        </h1>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, fontSize: 12.5, color: "#9a9aa5" }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: coll?.color ?? "#c4c4cc" }} />
        {coll?.name ?? "Unfiled"}
        <span style={{ opacity: 0.5 }}>·</span>
        Saved {formatSavedDate(sel.createdAt)}
      </div>

      {/* image preview — only when there is an image */}
      {flags.showPreview && sel.image && (
        <img src={sel.image} alt={sel.title} style={{ width: "100%", height: 204, objectFit: "cover", borderRadius: 13, border: "1px solid #ececef", margin: "20px 0 4px", display: "block" }} />
      )}

      {/* body: code / note-task snippet / link description — editable */}
      {bodyField && editingBody ? (
        <textarea
          autoFocus
          value={bodyDraft}
          onChange={(e) => setBodyDraft(e.target.value)}
          onBlur={commitBody}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditingBody(false);
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitBody();
          }}
          placeholder={bodyField === "description" ? "Add a description…" : "Add content…"}
          style={bodyTextareaStyle(flags.detIsCode)}
        />
      ) : flags.detIsCode ? (
        <pre title="Click to edit" onClick={startBody} style={{ margin: "20px 0 4px", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 13, lineHeight: 1.7, color: "#2a2a32", background: "#f7f7f8", border: "1px solid #ececef", borderRadius: 11, padding: 16, whiteSpace: "pre", overflow: "auto", cursor: "text" }}>
          {sel.snippet}
        </pre>
      ) : flags.detIsText ? (
        <p title="Click to edit" onClick={startBody} style={{ margin: "18px 0 4px", fontSize: 15, lineHeight: 1.65, color: "#3b3b44", cursor: "text" }}>
          {sel.snippet}
        </p>
      ) : sel.type === "link" ? (
        <p title="Click to edit" onClick={startBody} style={{ margin: "18px 0 4px", fontSize: 14.5, lineHeight: 1.6, color: sel.description ? "#3b3b44" : "#b3b3bd", cursor: "text" }}>
          {sel.description || "Add a description…"}
        </p>
      ) : null}

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
            <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, color: AC, background: "#f0f0fb", borderRadius: 7, padding: "4px 9px" }}>
              #{tag}
              <span onClick={() => void removeTag(sel.id, tag)} title="Remove tag" style={{ cursor: "pointer", opacity: 0.55, fontSize: 13, lineHeight: 1 }}>
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
                if (e.key === "Escape") { setAddingTag(false); setTagDraft(""); }
              }}
              placeholder="tag"
              style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, width: 80, color: AC, border: `1px solid ${AC}`, borderRadius: 7, padding: "3px 8px", outline: "none", background: "transparent" }}
            />
          ) : (
            <span onClick={() => setAddingTag(true)} style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, color: "#a3a3ad", border: "1px dashed #d2d2dc", borderRadius: 7, padding: "3px 9px", cursor: "pointer" }}>
              + add
            </span>
          )}
        </div>
      </div>

      {flags.showRelated && <RelatedCards related={related} />}
    </div>
  );
}
