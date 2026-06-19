// Direction A — Command bar. Type anything; the AI detects what it is, fetches
// link metadata (title/description/image), suggests tags, and files it.
// Enter saves, Esc closes.

import { useEffect, useMemo, useState } from "react";
import type { ItemType } from "../../store/types";
import type { NewItem } from "../../data/repository";
import { typeMeta } from "../../store/typeMeta";
import { captureAi, hideCapture, hostOf, saveCapture } from "../../lib/captureActions";
import { fetchLinkMetadata, type LinkMetadata } from "../../lib/linkMetadata";
import { Icon } from "../common/Icon";
import { Globe, Sparkle } from "../common/glyphs";

const AC = "var(--ac, #5b5bd6)";

const COLLECTION_FOR: Partial<Record<ItemType, string>> = {
  link: "reading",
  note: "work",
  task: "work",
  code: "design",
};

function buildItem(text: string, type: ItemType, tags: string[], meta: LinkMetadata | null): NewItem {
  const trimmed = text.trim();
  const base: NewItem = {
    type,
    title: trimmed,
    tags,
    flags: { inbox: true },
    related: [],
    collectionId: COLLECTION_FOR[type],
  };
  if (type === "link") {
    const host = hostOf(trimmed);
    return {
      ...base,
      domain: host || undefined,
      title: meta?.title || host || trimmed,
      snippet: trimmed, // full URL, used by "Open"
      summary: meta?.description,
      image: meta?.image,
    };
  }
  if (type === "code" || type === "note" || type === "task") {
    return { ...base, title: trimmed.split("\n")[0].slice(0, 80), snippet: trimmed };
  }
  return base;
}

export function CommandBar() {
  const [text, setText] = useState("");
  const [type, setType] = useState<ItemType>("note");
  const [tags, setTags] = useState<string[]>([]);
  const [meta, setMeta] = useState<LinkMetadata | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect type, suggest tags, and (for links) fetch metadata as input settles.
  useEffect(() => {
    const value = text.trim();
    if (!value) {
      setType("note");
      setTags([]);
      setMeta(null);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      const detected = await captureAi.detectType(value);
      if (cancelled) return;
      setType(detected);
      const suggested = await captureAi.suggestTags({
        id: "", type: detected, title: value, tags: [], flags: {}, related: [], createdAt: "", updatedAt: "",
      });
      if (!cancelled) setTags(suggested.slice(0, 2));

      if (detected === "link") {
        setFetching(true);
        try {
          const m = await fetchLinkMetadata(value);
          if (!cancelled) setMeta(m);
        } catch {
          if (!cancelled) setMeta(null);
        } finally {
          if (!cancelled) setFetching(false);
        }
      } else {
        setMeta(null);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [text]);

  const meta_ = typeMeta(type);
  const filedTo = useMemo(() => {
    const id = COLLECTION_FOR[type];
    return id ? id[0].toUpperCase() + id.slice(1) : "Inbox";
  }, [type]);

  const save = async () => {
    if (!text.trim()) return;
    try {
      setError(null);
      await saveCapture(buildItem(text, type, tags, meta));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const showPreview = type === "link" && (fetching || !!meta);

  return (
    <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 30px 72px -20px rgba(24,24,48,.42), 0 6px 16px rgba(0,0,0,.07)", border: "1px solid rgba(0,0,0,.05)", overflow: "hidden" }}>
      {/* input row */}
      <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "17px 18px" }}>
        <span style={{ width: 25, height: 25, borderRadius: 7, background: meta_.bg, color: meta_.fg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon name={type} size={15} />
        </span>
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") void hideCapture();
          }}
          placeholder="Capture a link, note, task, or code…"
          style={{ flex: 1, minWidth: 0, fontSize: 15.5, color: "#1a1a1f", border: "none", outline: "none", background: "transparent", font: "inherit" }}
        />
        <span style={{ flex: "none", fontSize: 11, fontWeight: 600, color: meta_.fg, background: meta_.bg, borderRadius: 6, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon name={type} size={12} />
          {meta_.label}
        </span>
      </div>

      {/* link preview */}
      {showPreview && (
        <>
          <div style={{ height: 1, background: "#f0f0f2" }} />
          <div style={{ padding: "14px 18px", display: "flex", gap: 13, alignItems: "flex-start" }}>
            <div style={{ width: 46, height: 46, borderRadius: 9, flex: "none", overflow: "hidden", background: "repeating-linear-gradient(45deg,#f3f3f6,#f3f3f6 6px,#ededf1 6px,#ededf1 12px)", display: "flex", alignItems: "center", justifyContent: "center", color: "#b3b3bd" }}>
              {meta?.image ? (
                <img src={meta.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Globe size={18} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 620, color: "#1a1a1f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {fetching && !meta ? "Fetching…" : meta?.title || hostOf(text)}
              </div>
              <div style={{ fontSize: 12.5, color: "#9a9aa5", marginTop: 2 }}>{hostOf(text)}</div>
              {meta?.description && (
                <div style={{ marginTop: 9, fontSize: 13, lineHeight: 1.5, color: "#5a5a63", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {meta.description}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* AI tags */}
      {tags.length > 0 && (
        <>
          <div style={{ height: 1, background: "#f0f0f2" }} />
          <div style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "#b3b3bd", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Sparkle size={11} style={{ color: AC }} />
              AI tags
            </span>
            {tags.map((t) => (
              <span key={t} style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: AC, background: "#f0f0fb", borderRadius: 6, padding: "2px 7px" }}>
                #{t}
              </span>
            ))}
          </div>
        </>
      )}

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 18px", background: "#fafafa", borderTop: "1px solid #f0f0f2" }}>
        {error ? (
          <span style={{ fontSize: 12, color: "#c0392b" }}>{error}</span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#8a8a95" }}>
            <Sparkle size={13} style={{ color: AC }} />
            Filed to <strong style={{ color: "#5a5a63", fontWeight: 600 }}>{filedTo}</strong>
          </span>
        )}
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span onClick={() => void hideCapture()} style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: "#6b6b76", background: "#fff", border: "1px solid #e2e2e7", borderBottomWidth: 2, borderRadius: 6, padding: "2px 7px", cursor: "pointer" }}>
            esc
          </span>
          <span onClick={() => void save()} style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: "#fff", background: AC, border: "1px solid rgba(0,0,0,.12)", borderBottomWidth: 2, borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
            ⏎ Save
          </span>
        </span>
      </div>
    </div>
  );
}
