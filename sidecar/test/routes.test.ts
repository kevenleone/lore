// The HTTP surface, exercised through the real middleware chain. This is the
// contract the renderer's VaultRepository will be written against, so the
// shapes here are the ones that matter.

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Item } from "@lore/types";
import { createApp } from "../src/app";
import { Workspace } from "../src/workspace";

const TOKEN = "t";
let root: string;
let workspace: Workspace;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "lore-routes-"));
  workspace = new Workspace();
  app = createApp({ token: TOKEN, port: 0, vault: null, parentPid: null, dev: false }, workspace);
});

afterEach(async () => {
  await workspace.close();
  await rm(root, { recursive: true, force: true });
});

async function call(method: string, path: string, body?: unknown) {
  const res = await app.handle(
    new Request(`http://127.0.0.1${path}`, {
      method,
      headers: {
        authorization: `Bearer ${TOKEN}`,
        origin: "tauri://localhost",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const openVault = () => call("POST", "/workspace/open", { path: root });

const newItem = (over: Partial<Item> = {}) => ({
  type: "note", title: "A note", tags: [], flags: {}, related: [], ...over,
});

describe("workspace routes", () => {
  it("refuses item routes until a workspace is open", async () => {
    const res = await call("GET", "/items");
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "no_workspace" });
  });

  it("opens a vault and reports the item count", async () => {
    const res = await openVault();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ path: root, itemCount: 0 });
  });

  it("reports the open workspace on /health", async () => {
    await openVault();
    const res = await call("GET", "/health");
    expect(res.body.workspace).toBe(root);
  });
});

describe("item routes", () => {
  beforeEach(openVault);

  it("creates, lists, reads and deletes", async () => {
    const created = await call("POST", "/items", newItem({ title: "Hello", body: "Body text" }));
    expect(created.status).toBe(201);
    const id = created.body.id;

    const listed = await call("GET", "/items");
    expect(listed.body).toHaveLength(1);
    // listItems omits the body so a refresh stays cheap...
    expect(listed.body[0].body).toBeUndefined();
    expect(listed.body[0].snippet).toBe("Body text");

    // ...and getItem is the only route that returns one.
    const one = await call("GET", `/items/${id}`);
    expect(one.body.body).toBe("Body text");

    expect((await call("DELETE", `/items/${id}`)).status).toBe(204);
    expect((await call("GET", `/items/${id}`)).status).toBe(404);
  });

  it("404s an unknown id rather than erroring", async () => {
    expect((await call("GET", "/items/nope")).status).toBe(404);
    expect((await call("PATCH", "/items/nope", { title: "x" })).status).toBe(404);
    expect((await call("DELETE", "/items/nope")).status).toBe(404);
  });

  it("patches partially, leaving other fields alone", async () => {
    const created = await call("POST", "/items", newItem({ title: "Before", body: "keep me" }));
    const patched = await call("PATCH", `/items/${created.body.id}`, { title: "After" });
    expect(patched.body.title).toBe("After");
    expect(patched.body.body).toBe("keep me");
  });
});

describe("collection routes", () => {
  beforeEach(openVault);

  it("creates a collection and files an item into it", async () => {
    const c = await call("POST", "/collections", { name: "Work", color: "#8a92b8" });
    expect(c.status).toBe(201);

    const item = await call("POST", "/items", newItem({ title: "Filed", collectionId: "Work" }));
    expect(item.body.collectionId).toBe("Work");

    const list = await call("GET", "/collections");
    expect(list.body.map((x: { id: string }) => x.id)).toContain("Work");
  });

  it("unfiles children when a collection is deleted", async () => {
    await call("POST", "/collections", { name: "Work", color: "#8a92b8" });
    const item = await call("POST", "/items", newItem({ title: "Filed", collectionId: "Work" }));

    expect((await call("DELETE", "/collections/Work")).status).toBe(204);

    const after = await call("GET", `/items/${item.body.id}`);
    expect(after.body.collectionId).toBeUndefined();
  });

  it("requires a name", async () => {
    expect((await call("POST", "/collections", {})).status).toBe(400);
  });
});

describe("derived reads", () => {
  beforeEach(openVault);

  it("counts tags", async () => {
    await call("POST", "/items", newItem({ title: "A", tags: ["design"] }));
    await call("POST", "/items", newItem({ title: "B", tags: ["design", "work"] }));
    const res = await call("GET", "/tags");
    expect(res.body).toEqual([
      { name: "design", count: 2 },
      { name: "work", count: 1 },
    ]);
  });

  it("searches bodies via the index", async () => {
    await call("POST", "/items", newItem({ title: "Opaque", body: "perceptual uniformity" }));
    await call("POST", "/items", newItem({ title: "Other", body: "unrelated" }));
    const res = await call("GET", "/search?q=perceptual");
    expect(res.body.map((i: Item) => i.title)).toEqual(["Opaque"]);
  });
});

describe("events", () => {
  it("streams a ready event and then changes", async () => {
    await openVault();
    const res = await app.handle(
      new Request(`http://127.0.0.1/events?token=${TOKEN}`, {
        headers: { origin: "tauri://localhost" },
      }),
    );
    expect(res.headers.get("content-type")).toContain("text/event-stream");

    const reader = res.body!.getReader();
    // Chunks may arrive as strings or bytes depending on the runtime.
    const text = (v: unknown) =>
      typeof v === "string" ? v : new TextDecoder().decode(v as Uint8Array);

    expect(text((await reader.read()).value)).toContain("event: ready");

    // A write through the API must reach a subscriber.
    const changed = reader.read();
    await call("POST", "/items", newItem({ title: "Triggers an event" }));
    expect(text((await changed).value)).toContain("event: changed");

    await reader.cancel();
  });
});
