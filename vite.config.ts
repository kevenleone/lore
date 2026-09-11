import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import modes from './lore.modes.json';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

/**
 * Which Lore this bundle is for. `scripts/tauri.mjs` puts LORE_MODE in the
 * environment before it runs `beforeDevCommand`/`beforeBuildCommand`; a bare
 * `pnpm dev` or `pnpm build` falls back the same way the wrapper does.
 */
function resolveMode(command: string): keyof typeof modes {
    // @ts-expect-error process is a nodejs global
    const requested: string = process.env.LORE_MODE ?? '';

    if (requested in modes) {
        return requested as keyof typeof modes;
    }

    return command === 'build' ? 'prod' : 'dev';
}

// https://vite.dev/config/
export default defineConfig(async ({ command }) => {
    const mode = resolveMode(command);

    return {
        // Four HTML entry points: the main KB window, the quick-capture window,
        // the menu-bar focus popover, and the offscreen print surface.
        build: {
            rollupOptions: {
                input: {
                    capture: 'capture.html',
                    focus: 'focus.html',
                    main: 'index.html',
                    print: 'print.html',
                },
            },
        },

        // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
        //
        // 1. prevent Vite from obscuring rust errors
        clearScreen: false,

        define: {
            __LORE_MODE__: JSON.stringify(mode),
        },

        plugins: [tailwindcss(), react()],

        // 2. tauri expects a fixed port, fail if that port is not available
        server: {
            hmr: host
                ? {
                      host,
                      port: modes[mode].vitePort + 1,
                      protocol: 'ws',
                  }
                : undefined,
            host: host || false,
            // Each mode serves on its own port: `strictPort` is on, so without
            // this a second `tauri dev` would die on the first one's 1420.
            port: modes[mode].vitePort,
            strictPort: true,
            watch: {
                // 3. tell Vite to ignore watching `src-tauri`
                ignored: ['**/src-tauri/**'],
            },
        },
        // The sidecar is a Bun package with its own `bun test` suite (`pnpm
        // test:sidecar`); vitest must not try to load `bun:test` from it.
        test: {
            exclude: ['sidecar/**', 'node_modules/**', 'dist/**'],
            include: ['src/**/*.{test,spec}.{ts,tsx}'],
        },
    };
});
