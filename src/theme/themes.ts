import type { ThemeSeed } from './palette';

import { buildTokens } from './palette';

export interface ThemeDefinition {
    id: ThemeId;
    mode: 'dark' | 'light';
    name: string;
    tokens: Record<string, string>;
}

export type ThemeId =
    | 'catppuccin-frappe'
    | 'catppuccin-latte'
    | 'catppuccin-mocha'
    | 'dracula'
    | 'github-light'
    | 'gruvbox-dark'
    | 'gruvbox-light'
    | 'lore-dark'
    | 'lore-light'
    | 'midnight'
    | 'nord'
    | 'obsidian'
    | 'one-dark-pro'
    | 'rose-pine-dawn'
    | 'rose-pine'
    | 'solarized-dark'
    | 'solarized-light'
    | 'tokyo-night';

export const LIGHT_TOKENS: Record<string, string> = {
    '--ac-border': '#dedee5',
    '--ac-tint': '#eeeef2',
    '--border': '#ececef',
    '--border-soft': '#f0f0f2',
    '--canvas': '#e7e5df',
    '--dash': '#d2d2dc',
    '--faint': '#a8a8b0',
    '--float-shadow': '0 30px 72px -20px rgba(24,24,48,.42), 0 6px 16px rgba(0,0,0,.07)',
    '--hover': '#f0f0f2',
    '--kbd-bg': '#ffffff',
    '--kbd-border': '#e2e2e7',
    '--knob': '#ffffff',
    '--lane-empty-bg': '#e9edf9',
    '--lane-empty-fg': '#3b5bbf',
    '--lane-open-bg': '#e7f1ea',
    '--lane-open-fg': '#3f8f6a',
    '--lane-starter-bg': '#efeaf7',
    '--lane-starter-fg': '#6b4fa8',
    '--scrim': 'rgba(20,20,30,.36)',
    '--scrollbar': 'rgba(0,0,0,.16)',
    '--scrollbar-hover': 'rgba(0,0,0,.28)',
    '--seg-shadow': '0 1px 2px rgba(0,0,0,.08)',
    '--sel': '#f4f4f6',
    '--sheet-shadow': '0 40px 90px -24px rgba(16,16,32,.5), 0 8px 20px rgba(0,0,0,.09)',
    '--surface': '#ffffff',
    '--surface-glass': 'rgba(255,255,255,.82)',
    '--surface2': '#fafafa',
    '--surface3': '#f1f1f3',
    '--swatch-border': 'rgba(0,0,0,.07)',
    '--text': '#1a1a1f',
    '--text2': '#6b6b76',
    '--text3': '#9a9aa5',
    '--titlebar': 'rgba(252,252,253,.86)',
    '--track-off': '#d9d9e0',
    '--type-code-bg': '#eef0f3',
    '--type-code-fg': '#5b6472',
    '--type-image-bg': '#f7ecef',
    '--type-image-fg': '#a86b7c',
    '--type-link-bg': '#ecedfb',
    '--type-link-fg': '#5b5bd6',
    '--type-note-bg': '#f6f1e8',
    '--type-note-fg': '#9e7b46',
    '--type-task-bg': '#e8f2ec',
    '--type-task-fg': '#4d855f',
};

export const DARK_TOKENS: Record<string, string> = {
    '--ac-border': 'rgba(184,186,201,.42)',
    '--ac-tint': 'rgba(184,186,201,.20)',
    '--border': '#34343d',
    '--border-soft': '#2c2c34',
    '--canvas': '#15151a',
    '--dash': '#3e3e48',
    '--faint': '#646470',
    '--float-shadow': '0 30px 72px -20px rgba(0,0,0,.66), 0 6px 16px rgba(0,0,0,.40)',
    '--hover': '#2f2f38',
    '--kbd-bg': '#2c2c34',
    '--kbd-border': '#3c3c46',
    '--knob': '#f4f4f8',
    '--lane-empty-bg': 'rgba(110,140,220,.18)',
    '--lane-empty-fg': '#93aae8',
    '--lane-open-bg': 'rgba(110,180,140,.16)',
    '--lane-open-fg': '#7fc39a',
    '--lane-starter-bg': 'rgba(150,120,210,.18)',
    '--lane-starter-fg': '#b9a3e0',
    '--scrim': 'rgba(6,6,10,.5)',
    '--scrollbar': 'rgba(255,255,255,.18)',
    '--scrollbar-hover': 'rgba(255,255,255,.30)',
    '--seg-shadow': '0 1px 2px rgba(0,0,0,.45)',
    '--sel': 'rgba(184,186,201,.16)',
    '--sheet-shadow': '0 40px 90px -24px rgba(0,0,0,.72), 0 8px 20px rgba(0,0,0,.44)',
    '--surface': '#1f1f25',
    '--surface-glass': 'rgba(38,38,46,.82)',
    '--surface2': '#26262d',
    '--surface3': '#2c2c34',
    '--swatch-border': 'rgba(255,255,255,.10)',
    '--text': '#f1f1f5',
    '--text2': '#a6a6b0',
    '--text3': '#7a7a85',
    '--titlebar': 'rgba(33,33,40,.86)',
    '--track-off': '#3d3d47',
    '--type-code-bg': 'rgba(139,152,173,.18)',
    '--type-code-fg': '#a9b4c4',
    '--type-image-bg': 'rgba(200,140,160,.16)',
    '--type-image-fg': '#d29fb0',
    '--type-link-bg': 'rgba(122,122,230,.20)',
    '--type-link-fg': '#a3a3f0',
    '--type-note-bg': 'rgba(190,150,90,.16)',
    '--type-note-fg': '#d3ac72',
    '--type-task-bg': 'rgba(110,180,140,.16)',
    '--type-task-fg': '#7fc39a',
};

const SEEDS: { id: ThemeId; name: string; seed: ThemeSeed }[] = [
    {
        id: 'catppuccin-latte',
        name: 'Catppuccin Latte',
        seed: {
            border: '#ccd0da',
            canvas: '#dce0e8',
            lanes: { empty: '#1e66f5', open: '#40a02b', starter: '#8839ef' },
            mode: 'light',
            surface: '#eff1f5',
            surface2: '#e6e9ef',
            surface3: '#dce0e8',
            text: '#4c4f69',
            text2: '#6c6f85',
            text3: '#9ca0b0',
            types: {
                code: '#179299',
                image: '#ea76cb',
                link: '#1e66f5',
                note: '#df8e1d',
                task: '#40a02b',
            },
        },
    },
    {
        id: 'rose-pine-dawn',
        name: 'Rosé Pine Dawn',
        seed: {
            border: '#dfdad9',
            canvas: '#f2e9e1',
            lanes: { empty: '#286983', open: '#56949f', starter: '#907aa9' },
            mode: 'light',
            surface: '#fffaf3',
            surface2: '#faf4ed',
            surface3: '#f2e9e1',
            text: '#575279',
            text2: '#797593',
            text3: '#9893a5',
            types: {
                code: '#907aa9',
                image: '#d7827e',
                link: '#286983',
                note: '#ea9d34',
                task: '#56949f',
            },
        },
    },
    {
        id: 'solarized-light',
        name: 'Solarized Light',
        seed: {
            border: '#e0d9c3',
            canvas: '#eee8d5',
            lanes: { empty: '#268bd2', open: '#859900', starter: '#6c71c5' },
            mode: 'light',
            surface: '#fdf6e3',
            surface2: '#f5eeda',
            surface3: '#eee8d5',
            text: '#073642',
            text2: '#586e75',
            text3: '#93a1a1',
            types: {
                code: '#2aa198',
                image: '#d33682',
                link: '#268bd2',
                note: '#b58900',
                task: '#859900',
            },
        },
    },
    {
        id: 'github-light',
        name: 'GitHub Light',
        seed: {
            border: '#d1d9e0',
            canvas: '#eff2f5',
            lanes: { empty: '#0969da', open: '#1a7f37', starter: '#8250df' },
            mode: 'light',
            surface: '#ffffff',
            surface2: '#f6f8fa',
            surface3: '#eff2f5',
            text: '#1f2328',
            text2: '#59636e',
            text3: '#818b98',
            types: {
                code: '#57606a',
                image: '#bc4c00',
                link: '#0969da',
                note: '#9a6700',
                task: '#1a7f37',
            },
        },
    },
    {
        id: 'gruvbox-light',
        name: 'Gruvbox Light',
        seed: {
            border: '#d5c4a1',
            canvas: '#ebdbb2',
            lanes: { empty: '#076678', open: '#79740e', starter: '#8f3f71' },
            mode: 'light',
            surface: '#fbf1c7',
            surface2: '#f2e5bc',
            surface3: '#ebdbb2',
            text: '#3c3836',
            text2: '#504945',
            text3: '#928374',
            types: {
                code: '#427b58',
                image: '#8f3f71',
                link: '#076678',
                note: '#b57614',
                task: '#79740e',
            },
        },
    },
    {
        id: 'midnight',
        name: 'Midnight',
        seed: {
            border: '#23232b',
            canvas: '#050507',
            lanes: { empty: '#8f9bf0', open: '#7fc39a', starter: '#b9a3e0' },
            mode: 'dark',
            surface: '#101014',
            surface2: '#0a0a0d',
            surface3: '#17171d',
            text: '#ececf1',
            text2: '#9a9aa6',
            text3: '#6a6a76',
            types: {
                code: '#7fc7c0',
                image: '#d08fa8',
                link: '#8f9bf0',
                note: '#d3ac72',
                task: '#7fc39a',
            },
        },
    },
    {
        id: 'obsidian',
        name: 'Obsidian',
        seed: {
            border: '#202024',
            canvas: '#000000',
            lanes: { empty: '#7f95d8', open: '#74b892', starter: '#a894d4' },
            mode: 'dark',
            surface: '#000000',
            surface2: '#060607',
            surface3: '#131317',
            text: '#f2f2f4',
            text2: '#9c9ca4',
            text3: '#6e6e76',
            types: {
                code: '#74b8b2',
                image: '#c8869c',
                link: '#7f95d8',
                note: '#c69f6a',
                task: '#74b892',
            },
        },
    },
    {
        id: 'dracula',
        name: 'Dracula',
        seed: {
            border: '#44475a',
            canvas: '#1a1b23',
            lanes: { empty: '#bd93f9', open: '#50fa7b', starter: '#ff79c6' },
            mode: 'dark',
            surface: '#282a36',
            surface2: '#21222c',
            surface3: '#343746',
            text: '#f8f8f2',
            text2: '#b6b8c8',
            text3: '#6272a4',
            types: {
                code: '#8be9fd',
                image: '#ff79c6',
                link: '#bd93f9',
                note: '#f1fa8c',
                task: '#50fa7b',
            },
        },
    },
    {
        id: 'catppuccin-mocha',
        name: 'Catppuccin Mocha',
        seed: {
            border: '#313244',
            canvas: '#11111b',
            lanes: { empty: '#89b4fa', open: '#a6e3a1', starter: '#cba6f7' },
            mode: 'dark',
            surface: '#1e1e2e',
            surface2: '#181825',
            surface3: '#313244',
            text: '#cdd6f4',
            text2: '#a6adc8',
            text3: '#7f849c',
            types: {
                code: '#94e2d5',
                image: '#f5c2e7',
                link: '#89b4fa',
                note: '#f9e2af',
                task: '#a6e3a1',
            },
        },
    },
    {
        id: 'catppuccin-frappe',
        name: 'Catppuccin Frappé',
        seed: {
            border: '#414559',
            canvas: '#232634',
            lanes: { empty: '#8caaee', open: '#a6d189', starter: '#ca9ee6' },
            mode: 'dark',
            surface: '#303446',
            surface2: '#292c3c',
            surface3: '#414559',
            text: '#c6d0f5',
            text2: '#a5adce',
            text3: '#838ba7',
            types: {
                code: '#81c8be',
                image: '#f4b8e4',
                link: '#8caaee',
                note: '#e5c890',
                task: '#a6d189',
            },
        },
    },
    {
        id: 'rose-pine',
        name: 'Rosé Pine',
        seed: {
            border: '#26233a',
            canvas: '#16141f',
            lanes: { empty: '#9ccfd8', open: '#ebbcba', starter: '#c4a7e7' },
            mode: 'dark',
            surface: '#1f1d2e',
            surface2: '#191724',
            surface3: '#26233a',
            text: '#e0def4',
            text2: '#908caa',
            text3: '#6e6a86',
            types: {
                code: '#c4a7e7',
                image: '#eb6f92',
                link: '#9ccfd8',
                note: '#f6c177',
                task: '#ebbcba',
            },
        },
    },
    {
        id: 'nord',
        name: 'Nord',
        seed: {
            border: '#3b4252',
            canvas: '#242933',
            lanes: { empty: '#81a1c1', open: '#a3be8c', starter: '#b48ead' },
            mode: 'dark',
            surface: '#2e3440',
            surface2: '#292e39',
            surface3: '#3b4252',
            text: '#eceff4',
            text2: '#d8dee9',
            text3: '#7b8494',
            types: {
                code: '#8fbcbb',
                image: '#b48ead',
                link: '#88c0d0',
                note: '#ebcb8b',
                task: '#a3be8c',
            },
        },
    },
    {
        id: 'one-dark-pro',
        name: 'One Dark Pro',
        seed: {
            border: '#3e4451',
            canvas: '#1b1e24',
            lanes: { empty: '#61afef', open: '#98c379', starter: '#c678dd' },
            mode: 'dark',
            surface: '#282c34',
            surface2: '#21252b',
            surface3: '#2c313a',
            text: '#dcdfe4',
            text2: '#abb2bf',
            text3: '#5c6370',
            types: {
                code: '#56b6c2',
                image: '#e06c75',
                link: '#61afef',
                note: '#e5c07b',
                task: '#98c379',
            },
        },
    },
    {
        id: 'tokyo-night',
        name: 'Tokyo Night',
        seed: {
            border: '#292e42',
            canvas: '#13131a',
            lanes: { empty: '#7aa2f7', open: '#9ece6a', starter: '#bb9af7' },
            mode: 'dark',
            surface: '#1a1b26',
            surface2: '#16161e',
            surface3: '#24283b',
            text: '#c0caf5',
            text2: '#a9b1d6',
            text3: '#565f89',
            types: {
                code: '#7dcfff',
                image: '#f7768e',
                link: '#7aa2f7',
                note: '#e0af68',
                task: '#9ece6a',
            },
        },
    },
    {
        id: 'solarized-dark',
        name: 'Solarized Dark',
        seed: {
            border: '#0f4451',
            canvas: '#001f27',
            lanes: { empty: '#268bd2', open: '#859900', starter: '#6c71c5' },
            mode: 'dark',
            surface: '#002b36',
            surface2: '#00252e',
            surface3: '#073642',
            text: '#eee8d5',
            text2: '#93a1a1',
            text3: '#657b83',
            types: {
                code: '#2aa198',
                image: '#d33682',
                link: '#268bd2',
                note: '#b58900',
                task: '#859900',
            },
        },
    },
    {
        id: 'gruvbox-dark',
        name: 'Gruvbox Dark',
        seed: {
            border: '#3c3836',
            canvas: '#191919',
            lanes: { empty: '#83a598', open: '#b8bb26', starter: '#d3869b' },
            mode: 'dark',
            surface: '#282828',
            surface2: '#1d2021',
            surface3: '#3c3836',
            text: '#ebdbb2',
            text2: '#bdae93',
            text3: '#928374',
            types: {
                code: '#8ec07c',
                image: '#d3869b',
                link: '#83a598',
                note: '#fabd2f',
                task: '#b8bb26',
            },
        },
    },
];

/**
 * Lore's own two palettes carry their hand-tuned maps rather than a seed, so
 * the app looks exactly as it did for anyone who never opens the gallery.
 */
export const THEMES: readonly ThemeDefinition[] = [
    { id: 'lore-light', mode: 'light', name: 'Lore Light', tokens: LIGHT_TOKENS },
    { id: 'lore-dark', mode: 'dark', name: 'Lore Dark', tokens: DARK_TOKENS },
    ...SEEDS.map((s): ThemeDefinition => ({
        id: s.id,
        mode: s.seed.mode,
        name: s.name,
        tokens: buildTokens(s.seed),
    })),
];

export const DEFAULT_DARK_THEME: ThemeId = 'lore-dark';
export const DEFAULT_LIGHT_THEME: ThemeId = 'lore-light';

/**
 * A stale id in localStorage, or one belonging to the other mode, must never
 * leave the app uncoloured — fall back to the mode's default.
 */
export function themeById(id: ThemeId, mode: 'dark' | 'light'): ThemeDefinition {
    const found = THEMES.find((t) => t.id === id && t.mode === mode);
    if (found) return found;
    return THEMES.find((t) => t.mode === mode) as ThemeDefinition;
}

/** Themes of one mode, defaults first, in the order the gallery shows them. */
export function themesFor(mode: 'dark' | 'light'): ThemeDefinition[] {
    return THEMES.filter((t) => t.mode === mode);
}
