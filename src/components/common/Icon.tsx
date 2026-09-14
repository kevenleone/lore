// Single icon component carrying the sidebar and type glyphs. Rendered as
// stroked 24x24 paths in `currentColor`, matching the prototype's `icon()`
// helper — the shapes are `Lore Tasks.dc.html`'s own `I` map.

import type { CSSProperties } from 'react';

import type { IconName } from '../../store/types';

const PATHS: Record<IconName, string> = {
    board: '<path d="M4 4h5.2v16H4z"></path><path d="M14.8 4H20v10h-5.2z"></path>',
    calendar:
        '<rect x="3" y="5" width="18" height="16" rx="2.5"></rect><line x1="3" y1="9.5" x2="21" y2="9.5"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="16" y1="3" x2="16" y2="7"></line>',
    code: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path>',
    globe: '<path d="M12 3.4a8.6 8.6 0 1 1 0 17.2 8.6 8.6 0 0 1 0-17.2z"></path><path d="M3.6 12h16.8"></path><path d="M12 3.4a13 13 0 0 1 0 17.2 13 13 0 0 1 0-17.2z"></path>',
    image: '<rect x="3" y="3" width="18" height="18" rx="4"></rect><circle cx="8.5" cy="8.5" r="1.6"></circle><path d="m21 16-4.5-4.5L7 21"></path>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"></path><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5z"></path>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"></path><path d="m3 13 9 5 9-5"></path>',
    link: '<path d="M9 17H7A5 5 0 0 1 7 7h2"></path><path d="M15 7h2a5 5 0 1 1 0 10h-2"></path><line x1="8" y1="12" x2="16" y2="12"></line>',
    note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="13" y2="17"></line>',
    sun: '<path d="M12 5.4V3"></path><path d="M12 21v-2.4"></path><path d="M5.4 12H3"></path><path d="M21 12h-2.4"></path><path d="M7.2 7.2 5.5 5.5"></path><path d="M18.5 18.5l-1.7-1.7"></path><path d="M7.2 16.8 5.5 18.5"></path><path d="M18.5 5.5l-1.7 1.7"></path><path d="M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6z"></path>',
    tag: '<path d="M4 4h7.5L20 12.5 12.5 20 4 11.5z"></path><path d="M8 8h.01"></path>',
    task: '<rect x="3" y="3" width="18" height="18" rx="5"></rect><path d="m8 12 3 3 5-6"></path>',
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
            dangerouslySetInnerHTML={{ __html: PATHS[name] ?? '' }}
            fill="none"
            height={size}
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={strokeWidth}
            style={{ display: 'block', flex: 'none', ...style }}
            viewBox="0 0 24 24"
            width={size}
        />
    );
}
