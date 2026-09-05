// One-off "chrome" SVG glyphs used across the UI (search, chevrons, send, the
// filled AI sparkle, the globe domain mark, etc.) — ported verbatim from the
// prototype's inline SVGs. Item/view type icons live in Icon.tsx instead.

import type { CSSProperties, ReactNode } from 'react';

import { cn } from '../../lib/cn';

interface GlyphProps {
    className?: string;
    size?: number;
    style?: CSSProperties;
    sw?: number;
}

export function Back({ className, size = 15, style, sw = 2 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <polyline points="14 6 8 12 14 18" />
        </Stroke>
    );
}

export function Calendar({ className, size = 13, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <rect height="16" rx="2.5" width="18" x="3" y="5" />
            <line x1="3" x2="21" y1="9.5" y2="9.5" />
            <line x1="8" x2="8" y1="3" y2="7" />
            <line x1="16" x2="16" y1="3" y2="7" />
        </Stroke>
    );
}

export function Check({ className, size = 12, style, sw = 2.4 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <path d="m5 12 4 4 10-10" />
        </Stroke>
    );
}

export function ChevronDown({ className, size = 13, style, sw = 2 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <polyline points="6 9 12 15 18 9" />
        </Stroke>
    );
}

export function ChevronRight({ className, size = 16, style, sw = 2 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <polyline points="9 6 15 12 9 18" />
        </Stroke>
    );
}

export function Close({ className, size = 18, style, sw = 1.9 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <line x1="6" x2="18" y1="6" y2="18" />
            <line x1="18" x2="6" y1="6" y2="18" />
        </Stroke>
    );
}

/** Arrows to opposite corners — "give this the whole window". */
export function Expand({ className, size = 14, style, sw = 2 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" x2="14" y1="3" y2="10" />
            <line x1="3" x2="10" y1="21" y2="14" />
        </Stroke>
    );
}

export function External({ className, size = 13, style, sw = 2 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <line x1="7" x2="17" y1="17" y2="7" />
            <polyline points="8 7 17 7 17 16" />
        </Stroke>
    );
}

export function FileGlyph({ className, size = 20, style, sw = 1.7 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
        </Stroke>
    );
}

export function Filter({ className, size = 14, style, sw = 1.9 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <polygon points="3 5 21 5 14 13 14 20 10 18 10 13" />
        </Stroke>
    );
}

export function Globe({ className, size = 13, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <circle cx="12" cy="12" r="9" />
            <line x1="3" x2="21" y1="12" y2="12" />
            <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />
        </Stroke>
    );
}

export function History({ className, size = 13, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
            <polyline points="3 3.5 3 8 7.5 8" />
            <polyline points="12 7.5 12 12 15.5 13.8" />
        </Stroke>
    );
}

export function Info({ className, size = 13, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <circle cx="12" cy="12" r="9" />
            <line x1="12" x2="12" y1="11" y2="16.5" />
            <line x1="12" x2="12" y1="7.6" y2="8.2" />
        </Stroke>
    );
}

export function Link({ className, size = 13, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <path d="M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.5 1.5" />
            <path d="M14 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.5-1.5" />
        </Stroke>
    );
}

export function Message({ className, size = 16, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />
        </Stroke>
    );
}

/** Filled pause bars — the transport button in both focus surfaces. */
export function OpenDrawer({ className, size = 14, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <rect height="16" rx="2.4" width="18" x="3" y="4" />
            <line x1="14" x2="14" y1="4" y2="20" />
        </Stroke>
    );
}

export function OpenPage({ className, size = 14, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <rect height="16" rx="2.4" width="18" x="3" y="4" />
            <line x1="3" x2="21" y1="9" y2="9" />
        </Stroke>
    );
}

/** Mirror of `SidebarToggle`: the divider sits on the right. */
export function PanelRight({ className, size = 17, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <rect height="16" rx="2.5" width="18" x="3" y="4" />
            <line x1="14.5" x2="14.5" y1="4" y2="20" />
        </Stroke>
    );
}

export function Pause({ className, size = 14, style }: GlyphProps) {
    return (
        <svg
            className={cn('block flex-none', className)}
            fill="currentColor"
            height={size}
            style={style}
            viewBox="0 0 24 24"
            width={size}
        >
            <rect height="14" rx="1.3" width="4" x="6" y="5" />
            <rect height="14" rx="1.3" width="4" x="14" y="5" />
        </svg>
    );
}

export function Pencil({ className, size = 14, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </Stroke>
    );
}

/** Filled play triangle. */
export function Play({ className, size = 14, style }: GlyphProps) {
    return (
        <svg
            className={cn('block flex-none', className)}
            fill="currentColor"
            height={size}
            style={style}
            viewBox="0 0 24 24"
            width={size}
        >
            <path d="M7 4.8 19 12 7 19.2z" />
        </svg>
    );
}

export function Plus({ className, size = 14, style, sw = 2.2 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <line x1="12" x2="12" y1="5" y2="19" />
            <line x1="5" x2="19" y1="12" y2="12" />
        </Stroke>
    );
}

/** Counter-clockwise arrow — "start this interval over". */
export function Restart({ className, size = 15, style, sw = 2 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <polyline points="3 4 3 9 8 9" />
        </Stroke>
    );
}

export function Search({ className, size = 15, style, sw = 1.9 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <circle cx="11" cy="11" r="7" />
            <line x1="21" x2="16.5" y1="21" y2="16.5" />
        </Stroke>
    );
}

export function Send({ className, size = 16, style, sw = 1.9 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <line x1="22" x2="11" y1="2" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </Stroke>
    );
}

export function Settings({ className, size = 16, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <line x1="4" x2="20" y1="8" y2="8" />
            <line x1="4" x2="20" y1="16" y2="16" />
            <circle cx="9" cy="8" r="2.2" />
            <circle cx="15" cy="16" r="2.2" />
        </Stroke>
    );
}

export function SidebarToggle({ className, size = 17, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <rect height="16" rx="2.5" width="18" x="3" y="4" />
            <line x1="9.5" x2="9.5" y1="4" y2="20" />
        </Stroke>
    );
}

/** Play-to-end bar — "skip to the next interval". */
export function SkipForward({ className, size = 15, style, sw = 2 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <polyline points="6 5 15 12 6 19" />
            <line x1="18" x2="18" y1="5" y2="19" />
        </Stroke>
    );
}

export function Sort({ className, size = 16, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <path d="M11 6h10M11 12h7M11 18h4" />
            <path d="M3 8l3-3 3 3" />
            <line x1="6" x2="6" y1="5" y2="19" />
        </Stroke>
    );
}

/** Filled four-point sparkle — Lore's AI accent mark. */
export function Sparkle({ className, size = 16, style }: GlyphProps) {
    return (
        <svg
            className={cn('block flex-none', className)}
            fill="currentColor"
            height={size}
            style={style}
            viewBox="0 0 24 24"
            width={size}
        >
            <path d="M12 2.6l1.7 5.1a3 3 0 0 0 1.9 1.9l5.1 1.7-5.1 1.7a3 3 0 0 0-1.9 1.9L12 20l-1.7-5.1a3 3 0 0 0-1.9-1.9L3.3 11.3l5.1-1.7a3 3 0 0 0 1.9-1.9z" />
        </svg>
    );
}

export function StarOutline({ className, size = 18, style, sw = 1.7 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <polygon points="12 3 14.5 8.6 20.6 9.3 16 13.4 17.3 19.4 12 16.2 6.7 19.4 8 13.4 3.4 9.3 9.5 8.6" />
        </Stroke>
    );
}

/** Filled square — end the session, not just this interval. */
export function Stop({ className, size = 13, style }: GlyphProps) {
    return (
        <svg
            className={cn('block flex-none', className)}
            fill="currentColor"
            height={size}
            style={style}
            viewBox="0 0 24 24"
            width={size}
        >
            <rect height="14" rx="2.2" width="14" x="5" y="5" />
        </svg>
    );
}

/** The clock face used by the focus chip in the title bar. */
export function Timer({ className, size = 13, style, sw = 2 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l2.5 2" />
            <path d="M9 2h6" />
        </Stroke>
    );
}

export function Trash({ className, size = 16, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
        </Stroke>
    );
}

export function ViewCards({ className, size = 15, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <rect height="7" rx="1.6" width="7" x="4" y="4" />
            <rect height="7" rx="1.6" width="7" x="13" y="4" />
            <rect height="7" rx="1.6" width="7" x="4" y="13" />
            <rect height="7" rx="1.6" width="7" x="13" y="13" />
        </Stroke>
    );
}

export function ViewList({ className, size = 16, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <line x1="8" x2="20" y1="6" y2="6" />
            <line x1="8" x2="20" y1="12" y2="12" />
            <line x1="8" x2="20" y1="18" y2="18" />
            <circle cx="4" cy="6" r="1" />
            <circle cx="4" cy="12" r="1" />
            <circle cx="4" cy="18" r="1" />
        </Stroke>
    );
}

export function ViewRows({ className, size = 15, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <line x1="4" x2="20" y1="7" y2="7" />
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="17" y2="17" />
        </Stroke>
    );
}

export function ViewTable({ className, size = 15, style, sw = 1.8 }: GlyphProps) {
    return (
        <Stroke className={className} size={size} style={style} sw={sw}>
            <rect height="14" rx="2" width="18" x="3" y="5" />
            <line x1="3" x2="21" y1="10" y2="10" />
            <line x1="10" x2="10" y1="10" y2="19" />
        </Stroke>
    );
}

function Stroke({
    children,
    className,
    size = 16,
    style,
    sw = 1.8,
}: { children: ReactNode } & GlyphProps) {
    return (
        <svg
            className={cn('block flex-none', className)}
            fill="none"
            height={size}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={sw}
            style={style}
            viewBox="0 0 24 24"
            width={size}
        >
            {children}
        </svg>
    );
}
