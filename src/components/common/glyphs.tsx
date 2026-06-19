// One-off "chrome" SVG glyphs used across the UI (search, chevrons, send, the
// filled AI sparkle, the globe domain mark, etc.) — ported verbatim from the
// prototype's inline SVGs. Item/view type icons live in Icon.tsx instead.

import type { CSSProperties, ReactNode } from "react";

interface GlyphProps {
  size?: number;
  sw?: number;
  style?: CSSProperties;
}

function Stroke({
  size = 16,
  sw = 1.8,
  style,
  children,
}: GlyphProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "block", flex: "none", ...style }}
    >
      {children}
    </svg>
  );
}

/** Filled four-point sparkle — Baloon's AI accent mark. */
export function Sparkle({ size = 16, style }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      style={{ display: "block", flex: "none", ...style }}
    >
      <path d="M12 2.6l1.7 5.1a3 3 0 0 0 1.9 1.9l5.1 1.7-5.1 1.7a3 3 0 0 0-1.9 1.9L12 20l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.3 11.3l5.1-1.7a3 3 0 0 0 1.9-1.9z" />
    </svg>
  );
}

export function Globe({ size = 13, sw = 1.8, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <circle cx="12" cy="12" r="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
    </Stroke>
  );
}

export function Search({ size = 15, sw = 1.9, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </Stroke>
  );
}

export function ChevronDown({ size = 13, sw = 2, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <polyline points="6 9 12 15 18 9" />
    </Stroke>
  );
}

export function ChevronRight({ size = 16, sw = 2, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <polyline points="9 6 15 12 9 18" />
    </Stroke>
  );
}

export function Send({ size = 16, sw = 1.9, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </Stroke>
  );
}

export function Close({ size = 18, sw = 1.9, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </Stroke>
  );
}

export function Plus({ size = 14, sw = 2.2, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Stroke>
  );
}

export function External({ size = 13, sw = 2, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="8 7 17 7 17 16" />
    </Stroke>
  );
}

export function Sort({ size = 16, sw = 1.8, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <path d="M11 6h10M11 12h7M11 18h4" />
      <path d="M3 8l3-3 3 3" />
      <line x1="6" y1="5" x2="6" y2="19" />
    </Stroke>
  );
}

export function SidebarToggle({ size = 17, sw = 1.8, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <line x1="9.5" y1="4" x2="9.5" y2="20" />
    </Stroke>
  );
}

export function ViewList({ size = 16, sw = 1.8, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <line x1="8" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="4" cy="12" r="1" />
      <circle cx="4" cy="18" r="1" />
    </Stroke>
  );
}

export function Settings({ size = 16, sw = 1.8, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <line x1="4" y1="8" x2="20" y2="8" />
      <line x1="4" y1="16" x2="20" y2="16" />
      <circle cx="9" cy="8" r="2.2" />
      <circle cx="15" cy="16" r="2.2" />
    </Stroke>
  );
}

export function Message({ size = 16, sw = 1.8, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />
    </Stroke>
  );
}

export function Check({ size = 12, sw = 2.4, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <path d="m5 12 4 4 10-10" />
    </Stroke>
  );
}

export function StarOutline({ size = 18, sw = 1.7, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <polygon points="12 3 14.5 8.6 20.6 9.3 16 13.4 17.3 19.4 12 16.2 6.7 19.4 8 13.4 3.4 9.3 9.5 8.6" />
    </Stroke>
  );
}

export function FileGlyph({ size = 20, sw = 1.7, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </Stroke>
  );
}

export function Trash({ size = 16, sw = 1.8, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </Stroke>
  );
}

export function Calendar({ size = 13, sw = 1.8, style }: GlyphProps) {
  return (
    <Stroke size={size} sw={sw} style={style}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <line x1="3" y1="9.5" x2="21" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </Stroke>
  );
}
