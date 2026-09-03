import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
    // Two HTML entry points: the main KB window and the quick-capture window.
    build: {
        rollupOptions: {
            input: {
                capture: 'capture.html',
                main: 'index.html',
            },
        },
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,

    plugins: [react(), vanillaExtractPlugin()],

    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
        hmr: host
            ? {
                  host,
                  port: 1421,
                  protocol: 'ws',
              }
            : undefined,
        host: host || false,
        port: 1420,
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
}));
