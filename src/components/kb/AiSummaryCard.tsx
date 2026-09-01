// The auto-generated AI summary block shown in the detail pane.

import { Sparkle } from "../common/glyphs";

const AC = "var(--ac, #5b5bd6)";

export function AiSummaryCard({
  summary,
  points,
  showPoints,
}: {
  summary: string;
  points: string[];
  showPoints: boolean;
}) {
  return (
    <div
      style={{
        marginTop: 20,
        background: "var(--ac-tint, #eeeef2)",
        border: "1px solid var(--ac-border, #dedee5)",
        borderRadius: 13,
        padding: "17px 18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: AC, display: "flex" }}>
          <Sparkle size={15} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 680, color: "var(--text, #1a1a1f)" }}>AI Summary</span>
        <span
          style={{
            fontSize: 10.5,
            color: "var(--faint, #a8a8b0)",
            background: "var(--surface, #fff)",
            border: "1px solid var(--ac-border, #dedee5)",
            borderRadius: 5,
            padding: "1px 6px",
            marginLeft: 2,
          }}
        >
          auto-generated
        </span>
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.6, color: "var(--text2, #6b6b76)" }}>{summary}</p>
      {showPoints && (
        <div style={{ marginTop: 13, display: "flex", flexDirection: "column", gap: 7 }}>
          {points.map((p, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 9,
                alignItems: "flex-start",
                fontSize: 13.5,
                lineHeight: 1.5,
                color: "var(--text2, #6b6b76)",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: AC, flex: "none", marginTop: 7 }} />
              <span>{p}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
