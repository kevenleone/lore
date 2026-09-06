// The Elysia app: auth guard, CORS allowlist, and the routes mounted on top.
//
// Building the app separately from starting the server (src/index.ts) is what
// lets `bun test` exercise it via `app.handle(new Request(...))` with no port
// and no process, which is how the whole route surface gets tested.

import { Elysia } from 'elysia';

import type { Config } from './config';

import { routes } from './routes';
import { Workspace } from './workspace';

/**
 * Origins allowed to call the sidecar. The webview runs on `tauri://localhost`;
 * the Vite dev server on 1420. Anything else — notably a page in the user's
 * normal browser — is refused, so a visited website cannot reach the vault even
 * if it somehow guessed the port.
 */
const ALLOWED_ORIGINS = new Set([
    'http://127.0.0.1:1420',
    'http://localhost:1420',
    'http://tauri.localhost',
    'https://tauri.localhost',
    'tauri://localhost',
]);

export type App = ReturnType<typeof createApp>;

export function createApp(config: Config, workspace = new Workspace()) {
    return (
        new Elysia()
            .onRequest(({ request, set }) => {
                const url = new URL(request.url);
                const origin = request.headers.get('origin');
                Object.assign(set.headers, corsHeaders(origin));

                // Preflight never carries credentials; answer it before the guard.
                if (request.method === 'OPTIONS') {
                    set.status = 204;
                    return '';
                }

                // A cross-origin request from a disallowed origin is refused outright
                // rather than relying on the browser to enforce the CORS response.
                if (origin && !ALLOWED_ORIGINS.has(origin)) {
                    set.status = 403;
                    return { error: 'origin_not_allowed' };
                }

                if (url.pathname === '/health') return;

                if (!isAuthorized(request, url, config.token)) {
                    set.status = 401;
                    return { error: 'unauthorized' };
                }
            })

            /**
             * Unauthenticated on purpose: the host polls it to know the process is up
             * before handing the endpoint to the renderer. It reveals nothing about
             * the vault.
             */
            .get('/health', () => ({
                dev: config.dev,
                ok: true,
                pid: process.pid,
                workspace: workspace.path,
            }))

            .use(routes(workspace))
    );
}

function corsHeaders(origin: null | string): Record<string, string> {
    const allowed = origin && ALLOWED_ORIGINS.has(origin);
    return {
        'Access-Control-Allow-Headers': 'Authorization,Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Origin': allowed ? origin : 'null',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
    };
}

/**
 * Bearer check.
 *
 * Two paths are the exception, both because the browser API that consumes them
 * cannot set request headers: `/events` (`EventSource`) and reading an
 * attachment (`<img src>`). They carry the token as a query parameter instead.
 * These are localhost URLs which never leave the machine, and the origin
 * allowlist above still applies to both.
 */
function isAuthorized(request: Request, url: URL, token: string): boolean {
    const header = request.headers.get('authorization');
    if (header === `Bearer ${token}`) return true;
    if (url.searchParams.get('token') !== token) return false;
    if (url.pathname === '/events') return true;
    // Reading only — an upload still has to carry the header.
    return request.method === 'GET' && url.pathname.startsWith('/attachments/');
}
