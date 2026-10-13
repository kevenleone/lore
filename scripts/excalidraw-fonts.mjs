import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Excalidraw fetches its fonts from a CDN unless they are served beside the
// app, and Lore has to draw with the network off.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const from = resolve(root, 'node_modules/@excalidraw/excalidraw/dist/prod/fonts');
const to = resolve(root, 'public/excalidraw/fonts');

if (!existsSync(from)) {
    throw new Error(`Excalidraw's fonts are missing at ${from}; run pnpm install.`);
}

rmSync(to, { force: true, recursive: true });
cpSync(from, to, {
    // The CJK handwriting font is 12 MB of the 13; those labels fall back to a
    // system font instead.
    filter: (source) => !source.split(/[\\/]/).includes('Xiaolai'),
    recursive: true,
});
