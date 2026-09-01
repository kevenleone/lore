// Direction B — Composer. Pick a type, add structured content, accept/dismiss
// AI tag suggestions, choose a collection, then save.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Collection, ItemType } from "../../store/types";
import type { NewItem } from "../../data/repository";
import { getRepository } from "../../data";
import { hideCapture, hostOf, saveCapture } from "../../lib/captureActions";
import { fetchLinkMetadata, type LinkMetadata } from "../../lib/linkMetadata";
import { Icon } from "../common/Icon";
import { ChevronDown, Check, FileGlyph, Globe } from "../common/glyphs";

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
  color: "var(--faint, #a8a8b0)",
};

export function Composer() {
  const [tab, setTab] = useState<ItemType>("link");
  const [value, setValue] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState<string>("design");
  const [collOpen, setCollOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<LinkMetadata | null>(null);
  const [fetching, setFetching] = useState(false);

  // Fetch link metadata as the URL settles (link tab only).
  useEffect(() => {
    if (tab !== "link" || !value.trim()) {
      setMeta(null);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      setFetching(true);
      try {
        const m = await fetchLinkMetadata(value);
        if (!cancelled) setMeta(m);
      } catch {
        if (!cancelled) setMeta(null);
      } finally {
        if (!cancelled) setFetching(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [value, tab]);

  useEffect(() => {
    void getRepository()
      .listCollections()
      .then((c) => {
        setCollections(c);
        if (c.length && !c.find((x) => x.id === collectionId)) setCollectionId(c[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, "").toLowerCase();
    setTagDraft("");
    setAddingTag(false);
    if (t && !tags.includes(t)) setTags((a) => [...a, t]);
  };
  const removeTag = (t: string) => setTags((a) => a.filter((x) => x !== t));

  const activeCollection = collections.find((c) => c.id === collectionId) ?? null;
  const collRef = useRef<HTMLDivElement>(null);

  // Close the collection dropdown when clicking elsewhere.
  useEffect(() => {
    if (!collOpen) return;
    const onDown = (e: MouseEvent) => {
      if (collRef.current && !collRef.current.contains(e.target as Node)) setCollOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [collOpen]);

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
    let item: NewItem = {
      type: tab,
      title: text,
      tags: [...tags],
      flags: { inbox: true },
      related: [],
      collectionId,
    };
    if (tab === "link") {
      const host = hostOf(text);
      item = {
        ...item,
        domain: host || undefined,
        title: meta?.title || host || text,
        url: text,
        description: meta?.description,
        image: meta?.image,
      };
    } else if (tab === "image") {
      item = { ...item, title: text || "Untitled image" };
    } else {
      item = { ...item, title: text.split("\n")[0].slice(0, 80), body: text };
    }
    await saveCapture(item);
  };

  return (
    <div style={{ background: "var(--surface, #fff)", borderRadius: 16, boxShadow: "0 30px 72px -20px rgba(24,24,48,.42), 0 6px 16px rgba(0,0,0,.07)", border: "1px solid rgba(0,0,0,.05)", overflow: "hidden" }}>
      {/* type tabs */}
      <div style={{ display: "flex", gap: 5, padding: "9px 11px", borderBottom: "1px solid var(--border-soft, #f0f0f2)", overflow: "hidden" }}>
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
                ...(active ? { background: "var(--ac-tint, #eeeef2)", color: AC, fontWeight: 590 } : { color: "var(--text2, #6b6b76)" }),
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
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 9, border: "1px solid var(--border, #e4e4ea)", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "var(--text, #1a1a1f)" }}>
              <span style={{ color: "var(--faint, #a8a8b0)", flex: "none", display: "flex" }}>
                <Globe size={16} />
              </span>
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="https://…"
                style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", font: "inherit", color: "var(--text, #1a1a1f)" }}
              />
              {fetching && <span style={{ flex: "none", fontSize: 11, color: "var(--text3, #9a9aa5)" }}>fetching…</span>}
              {!fetching && meta && (
                <span style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4d855f", background: "#e8f2ec", borderRadius: 6, padding: "2px 7px" }}>
                  <Check size={12} sw={2.4} />
                  fetched
                </span>
              )}
            </div>
            {meta && (
              <div style={{ border: "1px solid var(--border, #ececef)", borderRadius: 12, overflow: "hidden", marginTop: 12 }}>
                {meta.image && (
                  <img src={meta.image} alt="" style={{ width: "100%", height: 118, objectFit: "cover", display: "block" }} />
                )}
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontSize: 14.5, fontWeight: 620 }}>{meta.title || hostOf(value)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--text3, #9a9aa5)", marginTop: 3 }}>
                    <Globe size={12} />
                    {hostOf(value)}
                  </div>
                  {meta.description && (
                    <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55, color: "var(--text2, #6b6b76)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {meta.description}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {tab === "note" && (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Write a note…"
            style={{ width: "100%", border: "1px solid var(--border, #e4e4ea)", borderRadius: 12, padding: "13px 14px", minHeight: 150, fontSize: 14.5, lineHeight: 1.6, color: "var(--text, #1a1a1f)", outline: "none", font: "inherit", resize: "vertical" }}
          />
        )}
        {tab === "task" && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 11, border: "1px solid var(--border, #e4e4ea)", borderRadius: 12, padding: 14 }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, border: "2px solid var(--border, #e4e4ea)", flex: "none", marginTop: 1 }} />
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="What needs doing?"
              style={{ flex: 1, fontSize: 15, color: "var(--text, #1a1a1f)", border: "none", outline: "none", background: "transparent", font: "inherit" }}
            />
          </div>
        )}
        {tab === "code" && (
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste a snippet…"
            style={{ width: "100%", border: "1px solid var(--border, #e4e4ea)", borderRadius: 12, padding: 14, minHeight: 150, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", fontSize: 12.5, lineHeight: 1.7, color: "var(--text2, #6b6b76)", background: "var(--surface2, #fafafa)", outline: "none", resize: "vertical" }}
          />
        )}
        {tab === "image" && (
          <div style={{ border: "1.5px dashed var(--dash, #d2d2dc)", borderRadius: 12, padding: 34, display: "flex", flexDirection: "column", alignItems: "center", gap: 9, textAlign: "center" }}>
            <span style={{ width: 44, height: 44, borderRadius: 11, background: "#f7ecef", color: "#a86b7c", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileGlyph />
            </span>
            <div style={{ fontSize: 14, fontWeight: 560, color: "var(--text2, #6b6b76)" }}>Drag files &amp; images here</div>
            <div style={{ fontSize: 12.5, color: "var(--text3, #9a9aa5)" }}>or click to browse — PNG, PDF, screenshots</div>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Title (optional)"
              style={{ marginTop: 8, width: "70%", textAlign: "center", border: "1px solid var(--border, #ececef)", borderRadius: 8, padding: "6px 10px", fontSize: 13, outline: "none", font: "inherit" }}
            />
          </div>
        )}

        {/* tags */}
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={SECTION_LABEL}>Tags</span>
          {tags.map((t) => (
            <span key={t} onClick={() => removeTag(t)} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: AC, background: "var(--ac-tint, #eeeef2)", borderRadius: 6, padding: "3px 8px" }}>
              #{t}
              <span style={{ opacity: 0.55 }}>×</span>
            </span>
          ))}
          {addingTag ? (
            <input
              autoFocus
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onBlur={() => addTag(tagDraft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addTag(tagDraft);
                if (e.key === "Escape") {
                  setAddingTag(false);
                  setTagDraft("");
                }
              }}
              placeholder="tag"
              style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, width: 70, color: AC, border: `1px solid ${AC}`, borderRadius: 6, padding: "2px 7px", outline: "none", background: "transparent" }}
            />
          ) : (
            <span onClick={() => setAddingTag(true)} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: "var(--text3, #9a9aa5)", background: "transparent", border: "1px dashed var(--dash, #d2d2dc)", borderRadius: 6, padding: "2px 7px" }}>
              + tag
            </span>
          )}
        </div>

        {/* collection — custom dropdown (a native <select> would steal focus and
            dismiss the capture window) */}
        <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={SECTION_LABEL}>Collection</span>
          <div ref={collRef} style={{ position: "relative" }}>
            <span
              onClick={() => setCollOpen((o) => !o)}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text2, #6b6b76)", background: "var(--sel, #f4f4f6)", borderRadius: 8, padding: "5px 10px", cursor: "pointer" }}
            >
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: activeCollection?.color ?? "#c4c4cc" }} />
              {activeCollection?.name ?? "Unfiled"}
              <span style={{ color: "var(--faint, #a8a8b0)", display: "flex" }}>
                <ChevronDown />
              </span>
            </span>
            {collOpen && (
              <div style={{ position: "absolute", left: 0, top: 32, zIndex: 30, background: "var(--surface, #fff)", border: "1px solid var(--border, #ececef)", borderRadius: 10, boxShadow: "0 14px 34px -10px rgba(24,24,48,.32)", padding: 5, minWidth: 180, maxHeight: 220, overflow: "auto" }}>
                {collections.length === 0 && (
                  <div style={{ padding: "7px 10px", fontSize: 12.5, color: "var(--text3, #9a9aa5)" }}>No collections yet</div>
                )}
                {collections.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setCollectionId(c.id);
                      setCollOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontSize: 13,
                      color: c.id === collectionId ? AC : "#3b3b44",
                      fontWeight: c.id === collectionId ? 600 : 400,
                      background: c.id === collectionId ? "#f0f0fb" : "transparent",
                    }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: c.color, flex: "none" }} />
                    {c.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: "var(--surface2, #fafafa)", borderTop: "1px solid var(--border-soft, #f0f0f2)" }}>
        <span style={{ fontSize: 12, color: error ? "#c0392b" : "#9a9aa5" }}>
          {error ?? "⌥Space to toggle · drag files to attach"}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span onClick={() => void hideCapture()} style={{ fontSize: 13, color: "var(--text2, #6b6b76)", padding: "6px 12px", borderRadius: 8, cursor: "pointer" }}>
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
