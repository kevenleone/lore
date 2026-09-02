// Self-write suppression. The mechanism was written but never wired up: every
// save Lore made triggered its own watcher event, so each edit cost a reconcile
// and a refresh round-trip back to the UI for a change it already knew about.

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Workspace } from "../src/workspace";

let root: string;
let workspace: Workspace;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "lore-selfwrite-"));
  workspace = new Workspace();
  await workspace.open(root);
});

afterEach(async () => {
  await workspace.close();
  await rm(root, { recursive: true, force: true });
});

const settle = (ms = 700) => Bun.sleep(ms);

describe("self-write suppression", () => {
  it("does not notify for a write Lore made itself", async () => {
    let notifications = 0;
    workspace.subscribe(() => {
      notifications += 1;
    });

    await workspace.current.createItem({
      type: "note", title: "Written by Lore", tags: [], flags: {}, related: [],
    });
    await settle();

    // The route emits its own notify(); the watcher must not add a second one.
    expect(notifications).toBe(0);
  });

  it("still notifies for a write someone else made", async () => {
    let notifications = 0;
    workspace.subscribe(() => {
      notifications += 1;
    });

    await writeFile(join(root, "external.md"), "---\ntitle: External\n---\n\nb\n", "utf8");
    await settle();

    expect(notifications).toBeGreaterThan(0);
  });

  it("notices an external edit to a file Lore wrote a moment earlier", async () => {
    // The suppression is one-shot per write, so it must not swallow a real
    // change that lands on the same path afterwards.
    const item = await workspace.current.createItem({
      type: "note", title: "Both", tags: [], flags: {}, related: [],
    });
    await settle();

    let notifications = 0;
    workspace.subscribe(() => {
      notifications += 1;
    });

    const path = join(root, "both.md");
    await writeFile(path, "---\ntitle: Both edited outside\n---\n\nb\n", "utf8");
    await settle();

    expect(notifications).toBeGreaterThan(0);
    expect(workspace.current.getItem(item.id)?.title ?? "").toBe("Both edited outside");
  });
});
