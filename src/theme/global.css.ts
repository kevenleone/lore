// Global resets, scrollbar styling, and the caret-blink keyframe — ported from
// the prototype's <helmet><style>. Accent is applied at runtime as the `--ac`
// CSS variable on the app root (see App.tsx), exactly as the prototype did.

import { globalStyle, keyframes } from "@vanilla-extract/css";

export const FONT_STACK =
  "-apple-system,'SF Pro Text',system-ui,'Segoe UI',sans-serif";

export const blinkCaret = keyframes({
  "0%,48%": { opacity: 1 },
  "49%,100%": { opacity: 0 },
});

globalStyle("*", { boxSizing: "border-box" });

globalStyle("html, body, #root", {
  margin: 0,
  padding: 0,
  height: "100%",
});

globalStyle("body", {
  WebkitFontSmoothing: "antialiased",
  textRendering: "optimizeLegibility",
  fontFamily: FONT_STACK,
  color: "#1a1a1f",
  // Transparent so the frameless capture window can float; the main window
  // paints its own opaque background on the app root.
  background: "transparent",
});

globalStyle("::-webkit-scrollbar", { width: 10, height: 10 });
globalStyle("::-webkit-scrollbar-thumb", {
  background: "rgba(0,0,0,.16)",
  borderRadius: 8,
  border: "2px solid transparent",
  backgroundClip: "padding-box",
});
globalStyle("::-webkit-scrollbar-thumb:hover", {
  background: "rgba(0,0,0,.28)",
  backgroundClip: "padding-box",
});
globalStyle("::-webkit-scrollbar-track", { background: "transparent" });
