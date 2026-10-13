/// <reference types="vite/client" />

/** The build mode, substituted by `vite.config.ts` — see `src/lib/appMode.ts`. */
declare const __LORE_MODE__: import('./lib/appMode').LoreMode;

interface Window {
    /** Where Excalidraw looks for its fonts — see `components/canvas/CanvasEditor.tsx`. */
    EXCALIDRAW_ASSET_PATH?: string;
}
