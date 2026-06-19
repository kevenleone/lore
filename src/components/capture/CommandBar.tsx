// Direction A — Command bar. Type anything; the AI detects what it is, suggests
// tags, and files it. Enter saves, Esc closes.

import { useEffect, useMemo, useState } from "react";
import type { ItemType } from "../../store/types";
import type { NewItem } from "../../data/repository";
import { typeMeta } from "../../store/typeMeta";
import { captureAi, hideCapture, hostOf, saveCapture } from "../../lib/captureActions";
import { Icon } from "../common/Icon";
import { Sparkle } from "../common/glyphs";

const AC = "var(--ac, #5b5bd6)";

const COLLECTION_FOR: Partial<Record<ItemType, string>> = {
  link: "reading",
  note: "work",
  task: "work",
  code: "design",
};

function buildItem(text: string, type: ItemType, tags: string[]): NewItem {
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
    return { ...base, domain: host || undefined, title: host || trimmed };
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

  // Re-detect type + suggest tags as the input settles.
  useEffect(() => {
    const value = text.trim();
    if (!value) {
      setType("note");
      setTags([]);
      return;
    }
    const id = setTimeout(async () => {
      const detected = await captureAi.detectType(value);
      setType(detected);
      const suggested = await captureAi.suggestTags({
        id: "",
        type: detected,
        title: value,
        tags: [],
        flags: {},
        related: [],
        createdAt: "",
        updatedAt: "",
      });
      setTags(suggested.slice(0, 2));
    }, 250);
    return () => clearTimeout(id);
  }, [text]);

  const meta = typeMeta(type);
  const filedTo = useMemo(() => {
    const id = COLLECTION_FOR[type];
    return id ? id[0].toUpperCase() + id.slice(1) : "Inbox";
  }, [type]);

  const save = () => {
    if (!text.trim()) return;
    void saveCapture(buildItem(text, type, tags));
  };

  return (
    <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 30px 72px -20px rgba(24,24,48,.42), 0 6px 16px rgba(0,0,0,.07)", border: "1px solid rgba(0,0,0,.05)", overflow: "hidden" }}>
      {/* input row */}
      <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "17px 18px" }}>
        <span style={{ width: 25, height: 25, borderRadius: 7, background: meta.bg, color: meta.fg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon name={type} size={15} />
        </span>
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") void hideCapture();
          }}
          placeholder="Capture a link, note, task, or code…"
          style={{ flex: 1, minWidth: 0, fontSize: 15.5, color: "#1a1a1f", border: "none", outline: "none", background: "transparent", font: "inherit" }}
        />
        <span style={{ flex: "none", fontSize: 11, fontWeight: 600, color: meta.fg, background: meta.bg, borderRadius: 6, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon name={type} size={12} />
          {meta.label}
        </span>
      </div>

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
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "#8a8a95" }}>
          <Sparkle size={13} style={{ color: AC }} />
          Filed to <strong style={{ color: "#5a5a63", fontWeight: 600 }}>{filedTo}</strong>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span onClick={() => void hideCapture()} style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: "#6b6b76", background: "#fff", border: "1px solid #e2e2e7", borderBottomWidth: 2, borderRadius: 6, padding: "2px 7px", cursor: "pointer" }}>
            esc
          </span>
          <span onClick={save} style={{ fontFamily: "ui-monospace,Menlo,monospace", fontSize: 11, color: "#fff", background: AC, border: "1px solid rgba(0,0,0,.12)", borderBottomWidth: 2, borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
            ⏎ Save
          </span>
        </span>
      </div>
    </div>
  );
}
