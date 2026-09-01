import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), vanillaExtractPlugin()],

  // The sidecar is a Bun package with its own `bun test` suite (`pnpm
  // test:sidecar`); vitest must not try to load `bun:test` from it.
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["sidecar/**", "node_modules/**", "dist/**"],
  },

  // Two HTML entry points: the main KB window and the quick-capture window.
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        capture: "capture.html",
      },
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
