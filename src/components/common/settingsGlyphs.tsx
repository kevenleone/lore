// Glyphs introduced by the Lore Settings and Onboarding designs: the settings
// rail's pane icons and the vault-lane icons on the onboarding card. Shared
// chrome glyphs stay in glyphs.tsx.

import type { CSSProperties } from 'react';

/** Stroked 24x24 path sets, keyed exactly as in the designs' `ICONS` map. */
const PATHS = {
    bell: '<path d="M18 8.4a6 6 0 1 0-12 0c0 5.6-2.4 6.6-2.4 6.6h16.8S18 14 18 8.4z"></path><path d="M10.2 19a2 2 0 0 0 3.6 0"></path>',
    calendar:
        '<rect x="3" y="5" width="18" height="16" rx="2.6"></rect><line x1="3" y1="9.6" x2="21" y2="9.6"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="16" y1="3" x2="16" y2="7"></line>',
    check: '<path d="m5 12 4 4 10-10"></path>',
    chevronDown: '<polyline points="6 10 12 16 18 10"></polyline>',
    chevronRight: '<path d="M9 5l7 7-7 7"></path>',
    chevronUp: '<polyline points="6 14 12 8 18 14"></polyline>',
    close: '<line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line>',
    cloud: '<path d="M17.4 19.4a4.4 4.4 0 0 0 .5-8.76A6 6 0 0 0 6.2 10.6a3.9 3.9 0 0 0 .3 8.8z"></path><path d="M12 16.6v-5.2"></path><path d="M9.9 13.5 12 11.4l2.1 2.1"></path>',
    folder: '<path d="M3 7h6l2 2h10v9H3z"></path>',
    gear: '<circle cx="12" cy="12" r="3.4"></circle><path d="M12 2.6v3M12 18.4v3M4.6 7.2l2.6 1.5M16.8 15.3l2.6 1.5M4.6 16.8l2.6-1.5M16.8 8.7l2.6-1.5"></path>',
    globe: '<circle cx="12" cy="12" r="9"></circle><line x1="3" y1="12" x2="21" y2="12"></line><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"></path>',
    info: '<circle cx="12" cy="12" r="8.8"></circle><line x1="12" y1="11" x2="12" y2="16.4"></line><line x1="12" y1="7.7" x2="12.01" y2="7.7"></line>',
    keyboard:
        '<rect x="2.6" y="6" width="18.8" height="12" rx="2.6"></rect><line x1="7.5" y1="14.6" x2="16.5" y2="14.6"></line><line x1="6.4" y1="10" x2="6.5" y2="10"></line><line x1="10" y1="10" x2="10.1" y2="10"></line><line x1="13.6" y1="10" x2="13.7" y2="10"></line><line x1="17.2" y1="10" x2="17.3" y2="10"></line>',
    laptop: '<rect x="4" y="5" width="16" height="11" rx="2"></rect><path d="M2.5 19.4h19"></path>',
    lock: '<path d="M6 11h12v9H6z"></path><path d="M9 11V8a3 3 0 0 1 6 0v3"></path>',
    mail: '<path d="M3 6h18v12H3z"></path><path d="M3 7l9 6 9-6"></path>',
    noSync: '<path d="M4 4l16 16"></path><path d="M9 7h9v9"></path>',
    palette:
        '<path d="M12 3.2a8.8 8.8 0 1 0 0 17.6h1.4a2.4 2.4 0 0 0 0-4.8H13a2 2 0 0 1 0-4h4.4A3.4 3.4 0 0 0 20.8 8.6C20.8 5.6 16.9 3.2 12 3.2z"></path><circle cx="8.2" cy="9.2" r="1.1"></circle><circle cx="12.2" cy="7.2" r="1.1"></circle>',
    phone: '<rect x="7" y="2.6" width="10" height="18.8" rx="2.6"></rect><line x1="10.6" y1="18.6" x2="13.4" y2="18.6"></line>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
    screen: '<path d="M4 6h16v12H4z"></path><path d="M8 20h8"></path>',
    search: '<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.5" y2="16.5"></line>',
    spark4: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"></path>',
    sparkle:
        '<path d="M12 2.9l1.6 4.8a3 3 0 0 0 1.9 1.9l4.8 1.6-4.8 1.6a3 3 0 0 0-1.9 1.9L12 19.5l-1.6-4.8a3 3 0 0 0-1.9-1.9L3.7 11.2l4.8-1.6a3 3 0 0 0 1.9-1.9z"></path>',
    timer: '<circle cx="12" cy="13.6" r="7.6"></circle><path d="M12 9.8v4l2.4 1.8"></path><path d="M9.2 2.6h5.6"></path><path d="M12 2.6v2.4"></path>',
    unpack: '<path d="M12 3v10"></path><path d="M8.5 6.5 12 3l3.5 3.5"></path><path d="M5 15v5h14v-5"></path>',
    user: '<circle cx="12" cy="8" r="3.6"></circle><path d="M4.8 20.4a7.4 7.4 0 0 1 14.4 0"></path>',
} as const;

export type SettingsIconName = keyof typeof PATHS;

interface GlyphProps {
    name: SettingsIconName;
    size?: number;
    style?: CSSProperties;
    sw?: number;
}

export function SettingsIcon({ name, size = 15, style, sw = 1.75 }: GlyphProps) {
    return (
        <svg
            dangerouslySetInnerHTML={{ __html: PATHS[name] }}
            fill="none"
            height={size}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={sw}
            style={{ display: 'block', flex: 'none', ...style }}
            viewBox="0 0 24 24"
            width={size}
        />
    );
}
