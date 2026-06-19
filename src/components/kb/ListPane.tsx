// Middle pane: the filtered item list for the current view (further narrowed by
// the ⌘K search box), with the selected row highlighted.

import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store/useStore";
import { typeMeta } from "../../store/typeMeta";
import type { Item, SortOrder } from "../../store/types";
import { SORT_LABELS, filterByView, viewTitle } from "../../store/views";
import { formatRelative } from "../../lib/format";
import { Icon } from "../common/Icon";
import { Sort } from "../common/glyphs";

const AC = "var(--ac, #5b5bd6)";

function subtitle(item: Item): string {
  return item.domain || item.snippet || typeMeta(item.type).label;
}

function matchesSearch(item: Item, q: string): boolean {
  const hay = `${item.title} ${item.domain ?? ""} ${item.snippet ?? ""} ${item.summary ?? ""} ${item.tags.join(" ")}`.toLowerCase();
  return hay.includes(q);
}

export function ListPane() {
  const items = useStore((s) => s.items);
  const collections = useStore((s) => s.collections);
  const view = useStore((s) => s.view);
  const selectedId = useStore((s) => s.selectedId);
  const selectItem = useStore((s) => s.selectItem);
  const search = useStore((s) => s.search).trim().toLowerCase();
  const sort = useStore((s) => s.sort);
  const setSort = useStore((s) => s.setSort);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const onDown = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [sortOpen]);

  let filtered = filterByView(items, view, sort);
  if (search) filtered = filtered.filter((i) => matchesSearch(i, search));

  return (
    <div
      style={{
        width: 438,
        flex: "none",
        borderRight: "1px solid #ececef",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #ececef",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flex: "none",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 680 }}>{viewTitle(view, collections)}</span>
        <span
          style={{
            fontSize: 12,
            color: "#a3a3ad",
            background: "#f2f2f4",
            borderRadius: 20,
            padding: "1px 8px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {filtered.length}
        </span>
        <div ref={sortRef} style={{ marginLeft: "auto", position: "relative" }}>
          <span
            onClick={() => setSortOpen((o) => !o)}
            title={`Sort: ${SORT_LABELS[sort]}`}
            style={{ color: sortOpen ? "#1a1a1f" : "#b3b3bd", display: "flex", cursor: "pointer" }}
          >
            <Sort />
          </span>
          {sortOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 26,
                background: "#fff",
                border: "1px solid #ececef",
                borderRadius: 10,
                boxShadow: "0 12px 30px -10px rgba(24,24,48,.3)",
                padding: 5,
                zIndex: 20,
                minWidth: 150,
              }}
            >
              {(Object.keys(SORT_LABELS) as SortOrder[]).map((key) => (
                <div
                  key={key}
                  onClick={() => {
                    setSort(key);
                    setSortOpen(false);
                  }}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 7,
                    fontSize: 13,
                    cursor: "pointer",
                    color: key === sort ? "var(--ac, #5b5bd6)" : "#3b3b44",
                    fontWeight: key === sort ? 600 : 400,
                    background: key === sort ? "#f0f0fb" : "transparent",
                  }}
                >
                  {SORT_LABELS[key]}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {filtered.map((item) => {
          const meta = typeMeta(item.type);
          const selected = item.id === selectedId;
          return (
            <div
              key={item.id}
              onClick={() => selectItem(item.id)}
              style={{
                display: "flex",
                gap: 12,
                padding: "11px 14px",
                borderBottom: "1px solid #f4f4f5",
                cursor: "pointer",
                alignItems: "flex-start",
                ...(selected ? { background: "#f5f5fd", boxShadow: `inset 2px 0 0 ${AC}` } : {}),
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: meta.bg,
                  color: meta.fg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                  marginTop: 1,
                }}
              >
                <Icon name={item.type} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "#1a1a1f",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#9a9aa5",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: 1,
                  }}
                >
                  {subtitle(item)}
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontFamily: "ui-monospace,Menlo,monospace",
                        fontSize: 10,
                        color: "#8a8a95",
                        background: "#f3f3f6",
                        borderRadius: 5,
                        padding: "1px 5px",
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "#b3b3bd", whiteSpace: "nowrap", flex: "none", marginTop: 1 }}>
                {formatRelative(item.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
