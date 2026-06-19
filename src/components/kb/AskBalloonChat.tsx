// Detail-pane chat: "Ask Balloon" — answers grounded in the knowledge base,
// citing Sources chips that jump to the referenced item.

import { useState } from "react";
import { useStore } from "../../store/useStore";
import { typeMeta } from "../../store/typeMeta";
import { Icon } from "../common/Icon";
import { Sparkle, Close, Send } from "../common/glyphs";
import { hoverChip } from "../../theme/util.css";

const AC = "var(--ac, #5b5bd6)";

export function AskBalloonChat() {
  const messages = useStore((s) => s.chat);
  const items = useStore((s) => s.items);
  const toggleChat = useStore((s) => s.toggleChat);
  const sendChat = useStore((s) => s.sendChat);
  const selectItem = useStore((s) => s.selectItem);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void sendChat(text);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* header */}
      <div style={{ padding: "15px 20px", borderBottom: "1px solid #ececef", display: "flex", alignItems: "center", gap: 11, flex: "none" }}>
        <span style={{ width: 28, height: 28, borderRadius: 8, background: "#f0f0fb", color: AC, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkle />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 680 }}>Ask Balloon</div>
          <div style={{ fontSize: 12, color: "#9a9aa5" }}>Answers grounded in your knowledge base</div>
        </div>
        <span onClick={toggleChat} style={{ color: "#a3a3ad", cursor: "pointer", display: "flex" }}>
          <Close />
        </span>
      </div>

      {/* messages */}
      <div style={{ flex: 1, overflow: "auto", padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map((m) =>
          m.role === "user" ? (
            <div
              key={m.id}
              style={{
                alignSelf: "flex-end",
                maxWidth: "78%",
                background: AC,
                color: "#fff",
                fontSize: 14,
                lineHeight: 1.5,
                padding: "10px 15px",
                borderRadius: "15px 15px 4px 15px",
              }}
            >
              {m.text}
            </div>
          ) : (
            <div key={m.id} style={{ alignSelf: "flex-start", maxWidth: "88%" }}>
              <div style={{ background: "#f4f4f6", color: "#1f1f26", fontSize: 14, lineHeight: 1.55, padding: "12px 16px", borderRadius: "15px 15px 15px 4px" }}>
                {m.text}
              </div>
              {m.sources && m.sources.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 9, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", color: "#b3b3bd" }}>
                    Sources
                  </span>
                  {m.sources.map((src) => {
                    const item = items.find((i) => i.id === src.itemId);
                    if (!item) return null;
                    const meta = typeMeta(item.type);
                    return (
                      <span
                        key={src.itemId}
                        className={hoverChip}
                        onClick={() => selectItem(src.itemId)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          color: "#3b3b44",
                          background: "#fff",
                          border: "1px solid #e6e6ea",
                          borderRadius: 8,
                          padding: "4px 9px",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ width: 18, height: 18, borderRadius: 5, background: meta.bg, color: meta.fg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                          <Icon name={item.type} size={13} />
                        </span>
                        {item.title}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* input */}
      <div style={{ padding: "14px 20px", borderTop: "1px solid #ececef", display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Ask about anything you've saved…"
          style={{
            flex: 1,
            background: "#f1f1f3",
            borderRadius: 11,
            padding: "11px 14px",
            fontSize: 13.5,
            color: "#1a1a1f",
            border: "none",
            outline: "none",
          }}
        />
        <span
          onClick={submit}
          style={{ width: 38, height: 38, borderRadius: 11, background: AC, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flex: "none" }}
        >
          <Send />
        </span>
      </div>
    </div>
  );
}
