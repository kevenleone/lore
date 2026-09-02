// The Elysia app: auth guard, CORS allowlist, and the routes mounted on top.
//
// Building the app separately from starting the server (src/index.ts) is what
// lets `bun test` exercise it via `app.handle(new Request(...))` with no port
// and no process, which is how the whole route surface gets tested.

import { Elysia } from "elysia";
import type { Config } from "./config";
import { routes } from "./routes";
import { Workspace } from "./workspace";

/**
 * Origins allowed to call the sidecar. The webview runs on `tauri://localhost`;
 * the Vite dev server on 1420. Anything else — notably a page in the user's
 * normal browser — is refused, so a visited website cannot reach the vault even
 * if it somehow guessed the port.
 */
const ALLOWED_ORIGINS = new Set([
  "tauri://localhost",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "http://localhost:1420",
  "http://127.0.0.1:1420",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

/**
 * Bearer check.
 *
 * `/events` is the exception: it is consumed by `EventSource`, which cannot set
 * request headers, so it carries the token as a query parameter instead. That
 * is a localhost URL which never leaves the machine.
 */
function isAuthorized(request: Request, url: URL, token: string): boolean {
  const header = request.headers.get("authorization");
  if (header === `Bearer ${token}`) return true;
  if (url.pathname === "/events" && url.searchParams.get("token") === token) return true;
  return false;
}

export function createApp(config: Config, workspace = new Workspace()) {
  return (
    new Elysia()
      .onRequest(({ request, set }) => {
        const url = new URL(request.url);
        const origin = request.headers.get("origin");
        Object.assign(set.headers, corsHeaders(origin));

        // Preflight never carries credentials; answer it before the guard.
        if (request.method === "OPTIONS") {
          set.status = 204;
          return "";
        }

        // A cross-origin request from a disallowed origin is refused outright
        // rather than relying on the browser to enforce the CORS response.
        if (origin && !ALLOWED_ORIGINS.has(origin)) {
          set.status = 403;
          return { error: "origin_not_allowed" };
        }

        if (url.pathname === "/health") return;

        if (!isAuthorized(request, url, config.token)) {
          set.status = 401;
          return { error: "unauthorized" };
        }
      })

      /**
       * Unauthenticated on purpose: the host polls it to know the process is up
       * before handing the endpoint to the renderer. It reveals nothing about
       * the vault.
       */
      .get("/health", () => ({
        ok: true,
        pid: process.pid,
        dev: config.dev,
        workspace: workspace.path,
      }))

      .use(routes(workspace))
  );
}

export type App = ReturnType<typeof createApp>;
