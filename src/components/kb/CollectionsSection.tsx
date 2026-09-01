// Sidebar "Collections" section with full management: add, edit (name + color),
// and remove (with confirmation). Removing a collection unfiles its items.

import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store/useStore";
import { collectionCount, isViewActive } from "../../store/views";
import { Check, Close, Pencil, Plus, Trash } from "../common/glyphs";
import { hoverable } from "../../theme/util.css";

const AC = "var(--ac, #5b5bd6)";
const NEW = "__new__";

/** Swatches offered when picking a collection color. */
const COLLECTION_COLORS = [
  "#8a92b8",
  "#a88f6e",
  "#82a896",
  "#b88a98",
  "#5b5bd6",
  "#c2622d",
  "#4d855f",
  "#9e7b46",
];

const ROW_BASE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "6px 9px",
  borderRadius: 7,
  cursor: "pointer",
  fontSize: 13.5,
};

export function CollectionsSection() {
  const items = useStore((s) => s.items);
  const collections = useStore((s) => s.collections);
  const view = useStore((s) => s.view);
  const selectView = useStore((s) => s.selectView);
  const createCollection = useStore((s) => s.createCollection);
  const updateCollection = useStore((s) => s.updateCollection);
  const deleteCollection = useStore((s) => s.deleteCollection);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(COLLECTION_COLORS[0]);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) nameRef.current?.focus();
  }, [editingId]);

  const startAdd = () => {
    setConfirmId(null);
    setDraftName("");
    setDraftColor(COLLECTION_COLORS[0]);
    setEditingId(NEW);
  };
  const startEdit = (id: string, name: string, color: string) => {
    setConfirmId(null);
    setDraftName(name);
    setDraftColor(color);
    setEditingId(id);
  };
  const cancel = () => setEditingId(null);

  const save = async () => {
    const name = draftName.trim();
    if (!name) return cancel();
    if (editingId === NEW) await createCollection({ name, color: draftColor });
    else if (editingId) await updateCollection(editingId, { name, color: draftColor });
    setEditingId(null);
  };

  // A plain render function (not a nested component) so the input keeps focus
  // across keystrokes.
  const renderEditor = (key: string) => (
    <div key={key} style={{ ...ROW_BASE, flexDirection: "column", alignItems: "stretch", gap: 8, padding: "8px 9px", background: "var(--sel, #f4f4f6)", cursor: "default" }}>
      <input
        ref={nameRef}
        value={draftName}
        onChange={(e) => setDraftName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") cancel();
        }}
        placeholder="Collection name"
        style={{ border: "1px solid var(--border, #e4e4ea)", borderRadius: 7, padding: "6px 9px", fontSize: 13.5, outline: "none", font: "inherit", background: "var(--surface, #fff)" }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {COLLECTION_COLORS.map((c) => (
          <span
            key={c}
            onClick={() => setDraftColor(c)}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: c,
              cursor: "pointer",
              boxShadow: draftColor === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : "none",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
        <span onClick={cancel} style={{ fontSize: 12.5, color: "var(--text2, #6b6b76)", padding: "4px 10px", borderRadius: 7, cursor: "pointer" }}>
          Cancel
        </span>
        <span onClick={() => void save()} style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", background: AC, padding: "4px 12px", borderRadius: 7, cursor: "pointer" }}>
          Save
        </span>
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", padding: "15px 9px 5px" }}>
        <span style={{ fontSize: 11, fontWeight: 680, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--faint, #a8a8b0)" }}>
          Collections
        </span>
        <span
          onClick={startAdd}
          title="New collection"
          style={{ marginLeft: "auto", display: "flex", color: "var(--faint, #a8a8b0)", cursor: "pointer" }}
        >
          <Plus size={13} sw={2} />
        </span>
      </div>

      {collections.map((c) => {
        if (editingId === c.id) return renderEditor(c.id);

        if (confirmId === c.id) {
          return (
            <div key={c.id} style={{ ...ROW_BASE, background: "#fbecec", cursor: "default" }}>
              <span style={{ flex: 1, fontSize: 12.5, color: "#a23b30" }}>Delete “{c.name}”?</span>
              <span onClick={() => setConfirmId(null)} title="Cancel" style={{ display: "flex", color: "var(--text3, #9a9aa5)", cursor: "pointer" }}>
                <Close size={14} />
              </span>
              <span
                onClick={() => {
                  setConfirmId(null);
                  void deleteCollection(c.id);
                }}
                title="Delete"
                style={{ display: "flex", color: "#c0392b", cursor: "pointer" }}
              >
                <Check size={14} sw={2.4} />
              </span>
            </div>
          );
        }

        const active = isViewActive(view, "collection", c.id);
        const hovered = hoveredId === c.id;
        return (
          <div
            key={c.id}
            className={active ? undefined : hoverable}
            onMouseEnter={() => setHoveredId(c.id)}
            onMouseLeave={() => setHoveredId((h) => (h === c.id ? null : h))}
            onClick={() => selectView("collection", c.id)}
            style={{ ...ROW_BASE, ...(active ? { background: "var(--ac-tint, #eeeef2)", color: AC, fontWeight: 590 } : { color: "var(--text2, #6b6b76)" }) }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flex: "none" }} />
            <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
            {hovered ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(c.id, c.name, c.color);
                  }}
                  title="Edit"
                  style={{ display: "flex", color: "var(--text3, #9a9aa5)", cursor: "pointer" }}
                >
                  <Pencil size={13} />
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmId(c.id);
                  }}
                  title="Delete"
                  style={{ display: "flex", color: "#b0807c", cursor: "pointer" }}
                >
                  <Trash size={13} />
                </span>
              </span>
            ) : (
              <span style={{ fontSize: 12, opacity: 0.5, fontVariantNumeric: "tabular-nums" }}>
                {collectionCount(items, c.id)}
              </span>
            )}
          </div>
        );
      })}

      {editingId === NEW && renderEditor(NEW)}
    </>
  );
}
