// Single icon component carrying the 11 inline SVG path sets from the
// prototype's ICONS map. Rendered as stroked 24x24 glyphs (currentColor),
// matching the prototype's `icon()` helper.

import type { CSSProperties } from "react";
import type { IconName } from "../../store/types";

const PATHS: Record<IconName, string> = {
  link: '<path d="M9 17H7A5 5 0 0 1 7 7h2"></path><path d="M15 7h2a5 5 0 1 1 0 10h-2"></path><line x1="8" y1="12" x2="16" y2="12"></line>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="13" y2="17"></line>',
  task: '<rect x="3" y="3" width="18" height="18" rx="5"></rect><path d="m8 12 3 3 5-6"></path>',
  code: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="4"></rect><circle cx="8.5" cy="8.5" r="1.6"></circle><path d="m21 16-4.5-4.5L7 21"></path>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path>',
  inbox:
    '<path d="M22 12h-6l-2 3h-4l-2-3H2"></path><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5z"></path>',
  layers:
    '<path d="m12 3 9 5-9 5-9-5z"></path><path d="m3 13 9 5 9-5"></path>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2.5"></rect><line x1="3" y1="9.5" x2="21" y2="9.5"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="16" y1="3" x2="16" y2="7"></line>',
  star: '<polygon points="12 3 14.5 8.6 20.6 9.3 16 13.4 17.3 19.4 12 16.2 6.7 19.4 8 13.4 3.4 9.3 9.5 8.6"></polygon>',
  hash: '<line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line>',
};

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  style?: CSSProperties;
}

export function Icon({ name, size = 16, strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "none", display: "block", ...style }}
      dangerouslySetInnerHTML={{ __html: PATHS[name] ?? "" }}
    />
  );
}
