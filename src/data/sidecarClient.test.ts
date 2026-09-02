// The client's job is to hide engine restarts from every caller. A restart
// changes both the port and the token, so a stale endpoint fails as a network
// error — these tests pin the re-discover-and-retry behaviour that covers it.

import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...args: unknown[]) => invoke(...args) }));

const { HttpError, SidecarUnavailable, eventsUrl, forgetEndpoint, request } = await import(
  "./sidecarClient"
);

const ok = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), { status });

beforeEach(() => {
  invoke.mockReset();
  forgetEndpoint();
  invoke.mockResolvedValue({ url: "http://127.0.0.1:5000", token: "tok" });
});

describe("request", () => {
  it("sends the bearer token from the discovered endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ hi: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("/items")).resolves.toEqual({ hi: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:5000/items");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("discovers the endpoint once across many calls", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => ok({})));
    await request("/a");
    await request("/b");
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("re-discovers and retries after a connection failure", async () => {
    // The engine restarted: the old port is dead, and the new one has a new token.
    invoke
      .mockResolvedValueOnce({ url: "http://127.0.0.1:5000", token: "old" })
      .mockResolvedValueOnce({ url: "http://127.0.0.1:6000", token: "new" });
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(ok({ recovered: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("/items")).resolves.toEqual({ recovered: true });
    expect(fetchMock.mock.calls[1][0]).toBe("http://127.0.0.1:6000/items");
    expect((fetchMock.mock.calls[1][1].headers as Record<string, string>).Authorization).toBe(
      "Bearer new",
    );
  });

  it("gives up as SidecarUnavailable when the retry also fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(request("/items")).rejects.toBeInstanceOf(SidecarUnavailable);
  });

  it("does not retry an HTTP error — the engine answered, it just said no", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ error: "not_found" }, 404));
    vi.stubGlobal("fetch", fetchMock);

    await expect(request("/items/nope")).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces the status on an HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({}, 409)));
    await expect(request("/items")).rejects.toMatchObject({ status: 409 });
  });

  it("returns undefined for 204 rather than failing to parse a body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok(null, 204)));
    await expect(request("/items/x")).resolves.toBeUndefined();
  });

  it("sets a JSON content type only when there is a body", async () => {
    const fetchMock = vi.fn().mockImplementation(() => ok({}));
    vi.stubGlobal("fetch", fetchMock);

    await request("/items", { method: "POST", body: JSON.stringify({ a: 1 }) });
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );

    await request("/items");
    expect(
      (fetchMock.mock.calls[1][1].headers as Record<string, string>)["Content-Type"],
    ).toBeUndefined();
  });

  it("does not cache a failed discovery", async () => {
    // Both the attempt and its retry fail to discover, so the call gives up...
    invoke
      .mockRejectedValueOnce(new Error("engine not running"))
      .mockRejectedValueOnce(new Error("engine not running"));
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => ok({ ok: true })));

    await expect(request("/items")).rejects.toBeInstanceOf(SidecarUnavailable);

    // ...but the rejection must not be cached: once the engine is back, the
    // next call has to succeed rather than replaying the old failure.
    invoke.mockResolvedValue({ url: "http://127.0.0.1:7000", token: "t2" });
    await expect(request("/items")).resolves.toEqual({ ok: true });
  });
});

describe("eventsUrl", () => {
  it("carries the token as a query param, since EventSource cannot set headers", async () => {
    await expect(eventsUrl()).resolves.toBe("http://127.0.0.1:5000/events?token=tok");
  });

  it("escapes the token", async () => {
    invoke.mockResolvedValue({ url: "http://127.0.0.1:5000", token: "a b&c" });
    await expect(eventsUrl()).resolves.toContain("token=a%20b%26c");
  });
});
