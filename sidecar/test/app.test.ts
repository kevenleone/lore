// The auth guard and origin policy are the sidecar's entire security surface,
// so they are what gets tested first. `app.handle()` runs the real middleware
// chain without binding a port.

import { describe, expect, it } from "bun:test";
import { createApp } from "../src/app";
import { handshakeLine, HANDSHAKE_PREFIX, loadConfig } from "../src/config";

const TOKEN = "test-token";
const app = createApp({ token: TOKEN, port: 0, vault: null, parentPid: null, dev: false });

const WEBVIEW = "tauri://localhost";

type Init = RequestInit & { origin?: string | null };

function req(path: string, init: Init = {}) {
  const { origin = WEBVIEW, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (origin) headers.set("origin", origin);
  else headers.delete("origin");
  return app.handle(new Request(`http://127.0.0.1${path}`, { ...rest, headers }));
}

const authed = (path: string, init: Init = {}) =>
  req(path, { ...init, headers: { ...init.headers, authorization: `Bearer ${TOKEN}` } });

describe("health", () => {
  it("answers without a token so the host can poll for readiness", async () => {
    const res = await req("/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
});

describe("auth guard", () => {
  it("rejects a request with no token", async () => {
    const res = await req("/nope");
    expect(res.status).toBe(401);
  });

  it("rejects a wrong token", async () => {
    const res = await req("/nope", { headers: { authorization: "Bearer wrong" } });
    expect(res.status).toBe(401);
  });

  it("rejects a bare token without the Bearer scheme", async () => {
    const res = await req("/nope", { headers: { authorization: TOKEN } });
    expect(res.status).toBe(401);
  });

  it("lets a correct token past the guard", async () => {
    // 404 rather than 401: the guard passed and routing simply found nothing.
    const res = await authed("/nope");
    expect(res.status).toBe(404);
  });

  it("accepts the token as a query param on /events only", async () => {
    // EventSource cannot set headers, so /events takes ?token= instead.
    expect((await req(`/events?token=${TOKEN}`)).status).not.toBe(401);
    // Every other route must not honour the query param.
    expect((await req(`/nope?token=${TOKEN}`)).status).toBe(401);
  });
});

describe("origin policy", () => {
  it("refuses a foreign origin even with a valid token", async () => {
    // A page in the user's browser must not reach the vault if it guesses
    // the port and somehow learns the token.
    const res = await authed("/health", { origin: "https://evil.example" });
    expect(res.status).toBe(403);
  });

  it("allows the webview origin", async () => {
    const res = await req("/health", { origin: WEBVIEW });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(WEBVIEW);
  });

  it("allows the vite dev origin", async () => {
    const res = await req("/health", { origin: "http://localhost:1420" });
    expect(res.status).toBe(200);
  });

  it("answers preflight before the auth guard", async () => {
    const res = await req("/items", { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-methods")).toContain("PATCH");
  });

  it("allows a request with no origin at all (curl, the host itself)", async () => {
    const res = await req("/health", { origin: null });
    expect(res.status).toBe(200);
  });
});

describe("config", () => {
  it("uses the supplied token and an ephemeral port in production", () => {
    const c = loadConfig({ LORE_TOKEN: "abc" });
    expect(c).toMatchObject({ token: "abc", port: 0, dev: false });
  });

  it("falls back to the fixed dev token and port when none is supplied", () => {
    const c = loadConfig({});
    expect(c.dev).toBe(true);
    expect(c.port).toBe(51789);
  });

  it("reads the vault and parent pid", () => {
    const c = loadConfig({ LORE_TOKEN: "t", LORE_VAULT: "/tmp/v", LORE_PARENT_PID: "42" });
    expect(c.vault).toBe("/tmp/v");
    expect(c.parentPid).toBe(42);
  });

  it("emits a single-line handshake the host can parse", () => {
    const line = handshakeLine(51234);
    expect(line).toStartWith(HANDSHAKE_PREFIX);
    expect(line).not.toInclude("\n");
    expect(JSON.parse(line.slice(HANDSHAKE_PREFIX.length))).toMatchObject({ port: 51234 });
  });

  it("never puts the token in the handshake", () => {
    expect(handshakeLine(1)).not.toInclude("token");
  });
});
