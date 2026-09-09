// Expands a short theme seed into the full token map. Hand-authoring every
// token for every theme would drift; a seed names the dozen colours a palette
// actually publishes and the rest is derived from them.

export interface ThemeSeed {
    border: string;
    canvas: string;
    lanes: LaneHues;
    mode: 'dark' | 'light';
    surface: string;
    surface2: string;
    surface3: string;
    text: string;
    text2: string;
    text3: string;
    types: TypeHues;
}

interface LaneHues {
    empty: string;
    open: string;
    starter: string;
}

interface TypeHues {
    code: string;
    image: string;
    link: string;
    note: string;
    task: string;
}

const CHANNELS = (hex: string): [number, number, number] => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return [0, 0, 0];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const HEX = (n: number): string => Math.round(n).toString(16).padStart(2, '0');

function alpha(hex: string, a: number): string {
    const [r, g, b] = CHANNELS(hex);
    return `rgba(${r},${g},${b},${a})`;
}

/** Linear blend of two `#rrggbb` values; `t` is how much of `a` survives. */
function mix(a: string, b: string, t: number): string {
    const [ar, ag, ab] = CHANNELS(a);
    const [br, bg, bb] = CHANNELS(b);
    const at = Math.max(0, Math.min(1, t));
    return `#${HEX(ar * at + br * (1 - at))}${HEX(ag * at + bg * (1 - at))}${HEX(ab * at + bb * (1 - at))}`;
}

/**
 * The values that carry no hue: shadows, scrims and scrollbars read the same
 * across every palette of a given mode, so they come from the mode rather than
 * the seed.
 */
const NEUTRALS: Record<'dark' | 'light', Record<string, string>> = {
    dark: {
        '--float-shadow': '0 30px 72px -20px rgba(0,0,0,.66), 0 6px 16px rgba(0,0,0,.40)',
        '--scrim': 'rgba(6,6,10,.5)',
        '--scrollbar': 'rgba(255,255,255,.18)',
        '--scrollbar-hover': 'rgba(255,255,255,.30)',
        '--seg-shadow': '0 1px 2px rgba(0,0,0,.45)',
        '--sheet-shadow': '0 40px 90px -24px rgba(0,0,0,.72), 0 8px 20px rgba(0,0,0,.44)',
        '--swatch-border': 'rgba(255,255,255,.10)',
    },
    light: {
        '--float-shadow': '0 30px 72px -20px rgba(24,24,48,.42), 0 6px 16px rgba(0,0,0,.07)',
        '--scrim': 'rgba(20,20,30,.36)',
        '--scrollbar': 'rgba(0,0,0,.16)',
        '--scrollbar-hover': 'rgba(0,0,0,.28)',
        '--seg-shadow': '0 1px 2px rgba(0,0,0,.08)',
        '--sheet-shadow': '0 40px 90px -24px rgba(16,16,32,.5), 0 8px 20px rgba(0,0,0,.09)',
        '--swatch-border': 'rgba(0,0,0,.07)',
    },
};

export function buildTokens(seed: ThemeSeed): Record<string, string> {
    const dark = seed.mode === 'dark';
    const tint = (hue: string): string => mix(hue, seed.surface, dark ? 0.18 : 0.12);

    return {
        ...NEUTRALS[seed.mode],
        '--ac-border': alpha(seed.text2, 0.42),
        '--ac-tint': alpha(seed.text2, 0.2),
        // A GitHub alert is a severity, and the seed has no hue of its own for
        // one — so each reuses the closest hue the theme already declares. The
        // names are the alert's, not the borrowed feature's, so giving them
        // their own seed hues later touches nothing outside this file.
        '--alert-caution-fg': seed.types.image,
        '--alert-important-fg': seed.lanes.starter,
        '--alert-note-fg': seed.lanes.empty,
        '--alert-tip-fg': seed.lanes.open,
        '--alert-warning-fg': seed.types.note,
        '--border': seed.border,
        '--border-soft': mix(seed.border, seed.surface, 0.5),
        '--canvas': seed.canvas,
        '--dash': mix(seed.border, seed.text3, 0.65),
        '--faint': mix(seed.text3, seed.surface, 0.65),
        '--hover': mix(seed.surface2, seed.text, 0.94),
        '--kbd-bg': seed.surface,
        '--kbd-border': mix(seed.border, seed.text3, 0.8),
        '--knob': dark ? seed.text : '#ffffff',
        '--lane-empty-bg': tint(seed.lanes.empty),
        '--lane-empty-fg': seed.lanes.empty,
        '--lane-open-bg': tint(seed.lanes.open),
        '--lane-open-fg': seed.lanes.open,
        '--lane-starter-bg': tint(seed.lanes.starter),
        '--lane-starter-fg': seed.lanes.starter,
        '--sel': alpha(seed.text, dark ? 0.14 : 0.06),
        '--surface': seed.surface,
        '--surface-glass': alpha(seed.surface, 0.82),
        '--surface2': seed.surface2,
        '--surface3': seed.surface3,
        '--text': seed.text,
        '--text2': seed.text2,
        '--text3': seed.text3,
        '--titlebar': alpha(mix(seed.surface, seed.surface2, 0.5), 0.86),
        '--track-off': mix(seed.border, seed.text3, 0.75),
        '--type-code-bg': tint(seed.types.code),
        '--type-code-fg': seed.types.code,
        '--type-image-bg': tint(seed.types.image),
        '--type-image-fg': seed.types.image,
        '--type-link-bg': tint(seed.types.link),
        '--type-link-fg': seed.types.link,
        '--type-note-bg': tint(seed.types.note),
        '--type-note-fg': seed.types.note,
        '--type-task-bg': tint(seed.types.task),
        '--type-task-fg': seed.types.task,
    };
}
