// Talks to the Bun data engine over localhost HTTP.
//
// Native `fetch`, not @tauri-apps/plugin-http: the webview origin is
// `tauri://localhost` and `http://127.0.0.1` counts as a secure context, so
// there is no mixed-content problem — and the plugin cannot stream, which
// `EventSource` needs for live updates.

export interface Endpoint {
  url: string;
  token: string;
}

/** The engine restarts with a new port and token, so this is never cached hard. */
let cached: Promise<Endpoint> | null = null;

async function discover(): Promise<Endpoint> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<Endpoint>("sidecar_endpoint");
}

export function endpoint(): Promise<Endpoint> {
  if (!cached) cached = discover().catch((e) => {
    cached = null;
    throw e;
  });
  return cached;
}

/** Forces re-discovery — used after a connection failure or a restart. */
export function forgetEndpoint(): void {
  cached = null;
}

export class SidecarUnavailable extends Error {
  constructor(readonly reason: unknown) {
    super("the data engine is not reachable");
    this.name = "SidecarUnavailable";
  }
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

export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

async function attempt<T>(path: string, init: RequestInit): Promise<T> {
  const { url, token } = await endpoint();
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new HttpError(res.status, detail || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** The `/events` URL, token included — `EventSource` cannot set headers. */
export async function eventsUrl(): Promise<string> {
  const { url, token } = await endpoint();
  return `${url}/events?token=${encodeURIComponent(token)}`;
}
