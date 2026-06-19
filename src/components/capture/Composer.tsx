// Direction B — Composer. Pick a type, add structured content, accept/dismiss
// AI tag suggestions, choose a collection, then save.

import { useEffect, useMemo, useState } from "react";
import type { Collection, ItemType } from "../../store/types";
import type { NewItem } from "../../data/repository";
import { getRepository } from "../../data";
import { captureAi, hideCapture, hostOf, saveCapture } from "../../lib/captureActions";
import { Icon } from "../common/Icon";
import { ChevronDown, FileGlyph } from "../common/glyphs";

const AC = "var(--ac, #5b5bd6)";

const TABS: { type: ItemType; label: string }[] = [
  { type: "link", label: "Link" },
  { type: "note", label: "Note" },
  { type: "task", label: "Task" },
  { type: "code", label: "Code" },
  { type: "image", label: "Image" },
];

const SECTION_LABEL: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: ".05em",
  textTransform: "uppercase",
  color: "#b3b3bd",
};

export function Composer() {
  const [tab, setTab] = useState<ItemType>("link");
  const [value, setValue] = useState("");
  const [accepted, setAccepted] = useState<string[]>(["design"]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState<string>("design");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getRepository()
      .listCollections()
      .then((c) => {
        setCollections(c);
        if (c.length && !c.find((x) => x.id === collectionId)) setCollectionId(c[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pool = ["design", "tools", "color", "research", "product"];
  const suggested = pool.filter((t) => !accepted.includes(t) && !dismissed.includes(t)).slice(0, 3);

  const accept = (t: string) => {
    setAccepted((a) => [...a, t]);
    setDismissed((d) => d.filter((x) => x !== t));
  };
  const remove = (t: string) => {
    setAccepted((a) => a.filter((x) => x !== t));
    setDismissed((d) => [...d, t]);
  };

  const canSave = useMemo(() => tab === "image" || value.trim().length > 0, [tab, value]);

  const save = async () => {
    if (!canSave) return;
    try {
      setError(null);
      await doSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const doSave = async () => {
    const text = value.trim();
    const tags = [...accepted];
    let item: NewItem = {
      type: tab,
      title: text,
      tags,
      flags: { inbox: true },
      related: [],
      collectionId,
    };
    if (tab === "link") {
      const host = hostOf(text);
      item = { ...item, domain: host || undefined, title: host || text };
      const s = await captureAi.summarize({ ...item, id: "", createdAt: "", updatedAt: "" });
      item.summary = s.summary;
    } else if (tab === "image") {
      item = { ...item, title: text || "Untitled image" };
    } else {
      item = { ...item, title: text.split("\n")[0].slice(0, 80), snippet: text };
    }
    await saveCapture(item);
  };

  return (
    <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 30px 72px -20px rgba(24,24,48,.42), 0 6px 16px rgba(0,0,0,.07)", border: "1px solid rgba(0,0,0,.05)", overflow: "hidden" }}>
      {/* type tabs */}
      <div style={{ display: "flex", gap: 5, padding: "9px 11px", borderBottom: "1px solid #f0f0f2", overflow: "hidden" }}>
        {TABS.map((t) => {
          const active = tab === t.type;
          return (
            <div
              key={t.type}
              onClick={() => setTab(t.type)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 11px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                whiteSpace: "nowrap",
                ...(active ? { background: "#f0f0fb", color: AC, fontWeight: 590 } : { color: "#6b6b76" }),
              }}
            >
              <Icon name={t.type} size={15} />
              <span>{t.label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ padding: "15px 16px" }}>
        {/* per-type content */}
        {tab === "link" && (
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://…"
            style={{ width: "100%", display: "flex", border: "1px solid #e4e4ea", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#1a1a1f", outline: "none", font: "inherit" }}
          />
        )}
        {tab === "note" && (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Write a note…"
            style={{ width: "100%", border: "1px solid #e4e4ea", borderRadius: 12, padding: "13px 14px", minHeight: 150, fontSize: 14.5, lineHeight: 1.6, color: "#1a1a1f", outline: "none", font: "inherit", resize: "vertical" }}
          />
        )}
        {tab === "task" && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 11, border: "1px solid #e4e4ea", borderRadius: 12, padding: 14 }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, border: "2px solid #cfcfd8", flex: "none", marginTop: 1 }} />
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="What needs doing?"
              style={{ flex: 1, fontSize: 15, color: "#1a1a1f", border: "none", outline: "none", background: "transparent", font: "inherit" }}
            />
          </div>
        )}
        {tab === "code" && (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste a snippet…"
            style={{ width: "100%", border: "1px solid #e4e4ea", borderRadius: 12, padding: 14, minHeight: 150, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 12.5, lineHeight: 1.7, color: "#2a2a32", background: "#fafafb", outline: "none", resize: "vertical" }}
          />
        )}
        {tab === "image" && (
          <div style={{ border: "1.5px dashed #d2d2dc", borderRadius: 12, padding: 34, display: "flex", flexDirection: "column", alignItems: "center", gap: 9, textAlign: "center" }}>
            <span style={{ width: 44, height: 44, borderRadius: 11, background: "#f7ecef", color: "#a86b7c", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileGlyph />
            </span>
            <div style={{ fontSize: 14, fontWeight: 560, color: "#3b3b44" }}>Drag files &amp; images here</div>
            <div style={{ fontSize: 12.5, color: "#9a9aa5" }}>or click to browse — PNG, PDF, screenshots</div>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Title (optional)"
              style={{ marginTop: 8, width: "70%", textAlign: "center", border: "1px solid #ececef", borderRadius: 8, padding: "6px 10px", fontSize: 13, outline: "none", font: "inherit" }}
            />
          </div>
        )}

        {/* tags */}
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={SECTION_LABEL}>Tags</span>
          {accepted.map((t) => (
            <span key={t} onClick={() => remove(t)} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: AC, background: "#f0f0fb", borderRadius: 6, padding: "3px 8px" }}>
              #{t}
              <span style={{ opacity: 0.55 }}>×</span>
            </span>
          ))}
          {suggested.map((t) => (
            <span key={t} onClick={() => accept(t)} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: "#8a8a95", background: "transparent", border: "1px dashed #d2d2dc", borderRadius: 6, padding: "2px 7px" }}>
              + #{t}
            </span>
          ))}
        </div>

        {/* collection */}
        <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={SECTION_LABEL}>Collection</span>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "#3b3b44", background: "#f4f4f6", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: collections.find((c) => c.id === collectionId)?.color ?? "#82a896" }} />
            <select
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
              style={{ border: "none", outline: "none", background: "transparent", font: "inherit", color: "#3b3b44", cursor: "pointer", appearance: "none" }}
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <span style={{ color: "#a3a3ad", display: "flex" }}>
              <ChevronDown />
            </span>
          </label>
        </div>
      </div>

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: "#fafafa", borderTop: "1px solid #f0f0f2" }}>
        <span style={{ fontSize: 12, color: error ? "#c0392b" : "#9a9aa5" }}>
          {error ?? "⌥Space to toggle · drag files to attach"}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span onClick={() => void hideCapture()} style={{ fontSize: 13, color: "#6b6b76", padding: "6px 12px", borderRadius: 8, cursor: "pointer" }}>
            Cancel
          </span>
          <span
            onClick={() => void save()}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#fff", background: AC, padding: "7px 14px", borderRadius: 8, cursor: canSave ? "pointer" : "default", opacity: canSave ? 1 : 0.55 }}
          >
            Save
            <span style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, background: "rgba(255,255,255,.22)", borderRadius: 5, padding: "0px 6px" }}>⏎</span>
          </span>
        </span>
      </div>
    </div>
  );
}
