// Talks to the Bun data engine over localhost HTTP.
//
// Native `fetch`, not @tauri-apps/plugin-http: the webview origin is
// `tauri://localhost` and `http://127.0.0.1` counts as a secure context, so
// there is no mixed-content problem — and the plugin cannot stream, which
// `EventSource` needs for live updates.

export interface Endpoint {
    token: string;
    url: string;
}

/** The engine restarts with a new port and token, so this is never cached hard. */
let cached: null | Promise<Endpoint> = null;

export class HttpError extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

export class SidecarUnavailable extends Error {
    constructor(readonly reason: unknown) {
        super('the data engine is not reachable');
        this.name = 'SidecarUnavailable';
    }
}

/**
 * A readable URL for a vault-relative attachment path, token included — an
 * `<img src>` cannot set headers either. Resolved at render rather than stored,
 * because the engine restarts on a new port.
 */
export async function attachmentUrl(relPath: string): Promise<string> {
    const { token, url } = await endpoint();
    const rest = relPath.replace(/^attachments\//, '');
    const encoded = rest.split('/').map(encodeURIComponent).join('/');
    return `${url}/attachments/${encoded}?token=${encodeURIComponent(token)}`;
}

export function endpoint(): Promise<Endpoint> {
    if (!cached)
        cached = discover().catch((e) => {
            cached = null;
            throw e;
        });
    return cached;
}

/** The `/events` URL, token included — `EventSource` cannot set headers. */
export async function eventsUrl(): Promise<string> {
    const { token, url } = await endpoint();
    return `${url}/events?token=${encodeURIComponent(token)}`;
}

/** Forces re-discovery — used after a connection failure or a restart. */
export function forgetEndpoint(): void {
    cached = null;
}

/**
 * One request, with one retry after re-discovery.
 *
 * A restart changes both the port and the token, so a stale endpoint surfaces
 * as a connection error rather than a 401 — retrying once after re-discovering
 * covers the whole crash-recovery path without the caller knowing.
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    try {
        return await attempt<T>(path, init);
    } catch (e) {
        if (e instanceof HttpError) throw e;
        forgetEndpoint();
        try {
            return await attempt<T>(path, init);
        } catch (retryError) {
            if (retryError instanceof HttpError) throw retryError;
            throw new SidecarUnavailable(retryError);
        }
    }
}

async function attempt<T>(path: string, init: RequestInit): Promise<T> {
    const { token, url } = await endpoint();
    // FormData sets its own Content-Type, boundary included; forcing JSON on it
    // would make the body unparseable on the other end.
    const json = !!init.body && !(init.body instanceof FormData);
    const res = await fetch(`${url}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(json ? { 'Content-Type': 'application/json' } : {}),
            ...init.headers,
        },
    });

    if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new HttpError(res.status, detail || res.statusText);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}

async function discover(): Promise<Endpoint> {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke<Endpoint>('sidecar_endpoint');
}
