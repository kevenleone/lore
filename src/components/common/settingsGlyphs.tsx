// Glyphs introduced by the Lore Settings and Onboarding designs: the settings
// rail's ten pane icons, the device icons in the Sync pane, and the identity
// providers on the onboarding card. Shared chrome glyphs stay in glyphs.tsx.

import type { CSSProperties } from "react";

/** Stroked 24x24 path sets, keyed exactly as in the designs' `ICONS` map. */
const PATHS = {
  gear: '<circle cx="12" cy="12" r="3.4"></circle><path d="M12 2.6v3M12 18.4v3M4.6 7.2l2.6 1.5M16.8 15.3l2.6 1.5M4.6 16.8l2.6-1.5M16.8 8.7l2.6-1.5"></path>',
  user: '<circle cx="12" cy="8" r="3.6"></circle><path d="M4.8 20.4a7.4 7.4 0 0 1 14.4 0"></path>',
  palette:
    '<path d="M12 3.2a8.8 8.8 0 1 0 0 17.6h1.4a2.4 2.4 0 0 0 0-4.8H13a2 2 0 0 1 0-4h4.4A3.4 3.4 0 0 0 20.8 8.6C20.8 5.6 16.9 3.2 12 3.2z"></path><circle cx="8.2" cy="9.2" r="1.1"></circle><circle cx="12.2" cy="7.2" r="1.1"></circle>',
  keyboard:
    '<rect x="2.6" y="6" width="18.8" height="12" rx="2.6"></rect><line x1="7.5" y1="14.6" x2="16.5" y2="14.6"></line><line x1="6.4" y1="10" x2="6.5" y2="10"></line><line x1="10" y1="10" x2="10.1" y2="10"></line><line x1="13.6" y1="10" x2="13.7" y2="10"></line><line x1="17.2" y1="10" x2="17.3" y2="10"></line>',
  bell: '<path d="M18 8.4a6 6 0 1 0-12 0c0 5.6-2.4 6.6-2.4 6.6h16.8S18 14 18 8.4z"></path><path d="M10.2 19a2 2 0 0 0 3.6 0"></path>',
  sparkle:
    '<path d="M12 2.9l1.6 4.8a3 3 0 0 0 1.9 1.9l4.8 1.6-4.8 1.6a3 3 0 0 0-1.9 1.9L12 19.5l-1.6-4.8a3 3 0 0 0-1.9-1.9L3.7 11.2l4.8-1.6a3 3 0 0 0 1.9-1.9z"></path>',
  cloud:
    '<path d="M17.4 19.4a4.4 4.4 0 0 0 .5-8.76A6 6 0 0 0 6.2 10.6a3.9 3.9 0 0 0 .3 8.8z"></path><path d="M12 16.6v-5.2"></path><path d="M9.9 13.5 12 11.4l2.1 2.1"></path>',
  timer:
    '<circle cx="12" cy="13.6" r="7.6"></circle><path d="M12 9.8v4l2.4 1.8"></path><path d="M9.2 2.6h5.6"></path><path d="M12 2.6v2.4"></path>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2.6"></rect><line x1="3" y1="9.6" x2="21" y2="9.6"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="16" y1="3" x2="16" y2="7"></line>',
  info: '<circle cx="12" cy="12" r="8.8"></circle><line x1="12" y1="11" x2="12" y2="16.4"></line><line x1="12" y1="7.7" x2="12.01" y2="7.7"></line>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="2"></rect><path d="M2.5 19.4h19"></path>',
  phone:
    '<rect x="7" y="2.6" width="10" height="18.8" rx="2.6"></rect><line x1="10.6" y1="18.6" x2="13.4" y2="18.6"></line>',
  globe:
    '<circle cx="12" cy="12" r="9"></circle><line x1="3" y1="12" x2="21" y2="12"></line><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z"></path>',
  mail: '<path d="M3 6h18v12H3z"></path><path d="M3 7l9 6 9-6"></path>',
  lock: '<path d="M6 11h12v9H6z"></path><path d="M9 11V8a3 3 0 0 1 6 0v3"></path>',
  chevronRight: '<path d="M9 5l7 7-7 7"></path>',
  screen: '<path d="M4 6h16v12H4z"></path><path d="M8 20h8"></path>',
  spark4: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"></path>',
  noSync: '<path d="M4 4l16 16"></path><path d="M9 7h9v9"></path>',
  check: '<path d="m5 12 4 4 10-10"></path>',
  chevronUp: '<polyline points="6 14 12 8 18 14"></polyline>',
  chevronDown: '<polyline points="6 10 12 16 18 10"></polyline>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
  search: '<circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.5" y2="16.5"></line>',
  close: '<line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line>',
} as const;

export type SettingsIconName = keyof typeof PATHS;

interface GlyphProps {
  name: SettingsIconName;
  size?: number;
  sw?: number;
  style?: CSSProperties;
}

export function SettingsIcon({ name, size = 15, sw = 1.75, style }: GlyphProps) {
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
      style={{ flex: "none", display: "block", ...style }}
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}

/** Apple's monochrome mark — inherits `currentColor` so it works on any button. */
export function AppleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" style={{ display: "block", flex: "none" }}>
      <path d="M16.4 12.7c0-2.5 2-3.7 2.1-3.8-1.1-1.7-2.9-1.9-3.6-1.9-1.5-.2-3 .9-3.8.9s-2-.9-3.3-.9c-1.7 0-3.2 1-4.1 2.5-1.7 3-.4 7.5 1.3 10 .8 1.2 1.8 2.5 3.1 2.5 1.2-.1 1.7-.8 3.2-.8s1.9.8 3.2.8 2.2-1.2 3-2.4c.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.4-.9-2.4-3.6zM14 4.9c.7-.8 1.1-2 1-3.2-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.3z" />
    </svg>
  );
}

/** Google's four-colour G — fixed brand colours, never tinted. */
export function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} style={{ display: "block", flex: "none" }}>
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 1.9-1.6 4.9-4.5 6.9l6.9 5.3c4.1-3.8 6.6-9.4 6.6-15.5z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.8 1.3-4.3 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8.1 41.1 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.8-2.9-.8-4.5s.3-3.1.7-4.5l-7.1-5.5C2.8 17 2 20.4 2 24s.8 7 2.3 10z" />
      <path fill="#EA4335" d="M24 9.5c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 3.4 29.9 1 24 1 15.4 1 8.1 5.9 4.3 13l7.1 5.5C13.3 13.3 18.2 9.5 24 9.5z" />
    </svg>
  );
}
