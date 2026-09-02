// The vault engine, against real temp directories. These are the tests the
// data layer never had while it was SQLite-only.

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VaultStore } from "../src/index/store";
import { parseFile, serializeFile, splitFrontmatter, toItem } from "../src/markdown";
import { slugify, uniqueStem } from "../src/slug";
import { parseWikilink, rewriteRelated } from "../src/links";
import { safeJoin, collectionOf, hashColor, stemOf } from "../src/vault";
import type { Item } from "@lore/types";

let root: string;
let store: VaultStore;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "lore-vault-"));
});

afterEach(async () => {
  store?.close();
  await rm(root, { recursive: true, force: true });
});

const open = async () => {
  store = await VaultStore.open(root);
  return store;
};

const write = async (rel: string, text: string) => {
  await mkdir(join(root, rel, ".."), { recursive: true });
  await writeFile(join(root, rel), text, "utf8");
};

const baseItem = (over: Partial<Item> = {}): Omit<Item, "id" | "createdAt" | "updatedAt"> => ({
  type: "note",
  title: "A note",
  tags: [],
  flags: {},
  related: [],
  ...over,
});

/* ------------------------------------------------------------------ */

describe("slugify", () => {
  it("makes a filesystem-safe stem from a title", () => {
    expect(slugify("How Linear builds product")).toBe("how-linear-builds-product");
  });

  it("strips accents rather than emitting them", () => {
    expect(slugify("Café résumé")).toBe("cafe-resume");
  });

  it("drops path separators so a title can never escape its folder", () => {
    expect(slugify("../../etc/passwd")).toBe("etc-passwd");
  });

  it("avoids Windows reserved names", () => {
    expect(slugify("CON")).toBe("con-note");
  });

  it("falls back to an id when the title slugs to nothing", () => {
    expect(uniqueStem("🎉🎉", "01ABCDEF", new Set())).toBe("untitled-abcdef");
  });

  it("suffixes on collision instead of overwriting", () => {
    const taken = new Set(["notes", "notes-2"]);
    expect(uniqueStem("Notes", "X", taken)).toBe("notes-3");
  });
});

describe("safeJoin", () => {
  it("refuses to escape the vault", () => {
    expect(() => safeJoin("/vault", "../etc/passwd")).toThrow();
    expect(() => safeJoin("/vault", "a/../../b")).toThrow();
  });

  it("allows paths inside the vault", () => {
    expect(safeJoin("/vault", "Work/note.md")).toBe("/vault/Work/note.md");
  });
});

describe("path helpers", () => {
  it("reads the collection from the parent folder", () => {
    expect(collectionOf("Reading List/a.md")).toBe("Reading List");
    expect(collectionOf("a.md")).toBe("");
    expect(stemOf("Reading List/a.md")).toBe("a");
  });

  it("gives a folder a stable colour without collections.json", () => {
    expect(hashColor("Work")).toBe(hashColor("Work"));
    expect(hashColor("Work")).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("markdown format", () => {
  it("round-trips an item through serialize and parse", () => {
    const item: Item = {
      id: "ID1", type: "link", title: "Linear", url: "https://linear.app",
      tags: ["product"], flags: { inbox: true, starred: true },
      summary: "S", points: ["p1", "p2"], description: "D", image: "https://i",
      related: [], body: "My notes.", createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const text = serializeFile(item, ["[[other]]"]);
    const parsed = parseFile(text);
    const back = toItem(parsed, { stem: "linear", id: "ID1", mtime: "", relatedIds: [] });

    expect(back.title).toBe("Linear");
    expect(back.url).toBe("https://linear.app");
    expect(back.tags).toEqual(["product"]);
    expect(back.flags).toEqual({ inbox: true, starred: true });
    expect(back.points).toEqual(["p1", "p2"]);
    expect(back.body).toBe("My notes.");
    expect(back.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("writes flags flat and omits the false ones", () => {
    const text = serializeFile(
      { ...baseItem(), id: "I", createdAt: "", updatedAt: "", flags: { starred: true } } as Item,
      [],
    );
    expect(text).toContain("starred: true");
    expect(text).not.toContain("inbox:");
    expect(text).not.toContain("flags:");
  });

  it("never writes collectionId — the folder is the collection", () => {
    const text = serializeFile(
      { ...baseItem({ collectionId: "Work" }), id: "I", createdAt: "", updatedAt: "" } as Item,
      [],
    );
    expect(text).not.toContain("collectionId");
  });

  it("treats a plain markdown file with no frontmatter as a note", () => {
    const parsed = parseFile("# Hello\n\nSome text.");
    const item = toItem(parsed, { stem: "hello", id: "I", mtime: "2026-01-01T00:00:00.000Z", relatedIds: [] });
    expect(item.type).toBe("note");
    // Falls back to the first heading for a title.
    expect(item.title).toBe("Hello");
    expect(item.body).toContain("Some text.");
  });

  it("falls back to the filename when there is no title or heading", () => {
    const item = toItem(parseFile("just text"), {
      stem: "my-file", id: "I", mtime: "2026-01-01T00:00:00.000Z", relatedIds: [],
    });
    expect(item.title).toBe("my-file");
  });

  it("survives malformed YAML instead of dropping the file", () => {
    const parsed = parseFile("---\n: : bad\n---\n\nbody");
    expect(parsed.body).toBe("body");
  });

  it("preserves unknown frontmatter keys another tool added", () => {
    const parsed = parseFile("---\ntitle: T\nobsidianField: keep-me\n---\n\nb");
    expect(parsed.extra).toEqual({ obsidianField: "keep-me" });
    const text = serializeFile(
      { ...baseItem({ title: "T" }), id: "I", createdAt: "", updatedAt: "" } as Item,
      [],
      parsed.extra,
    );
    expect(text).toContain("obsidianField: keep-me");
  });

  it("splits frontmatter only when it opens on the first line", () => {
    expect(splitFrontmatter("no fm").yaml).toBeNull();
    expect(splitFrontmatter("---\na: 1\n---\nbody").yaml).toBe("a: 1\n");
  });
});

describe("wikilinks", () => {
  it("strips alias and heading down to the target", () => {
    expect(parseWikilink("[[note#Heading|Alias]]")).toBe("note");
  });

  it("rewrites a target while keeping alias and heading", () => {
    expect(rewriteRelated(["[[old#H|A]]", "[[other]]"], "old", "new")).toEqual([
      "[[new#H|A]]",
      "[[other]]",
    ]);
  });
});

/* ------------------------------------------------------------------ */

describe("store: items", () => {
  it("creates a file named after the title, in the collection folder", async () => {
    const s = await open();
    await s.createCollection("Reading List", "#8a92b8");
    const item = await s.createItem(baseItem({ title: "How Linear builds product", collectionId: "Reading List" }));

    const text = await readFile(join(root, "Reading List/how-linear-builds-product.md"), "utf8");
    expect(text).toStartWith("---\n");
    expect(text).toContain("title: How Linear builds product");
    expect(item.collectionId).toBe("Reading List");
  });

  it("puts an uncollected item at the vault root", async () => {
    const s = await open();
    await s.createItem(baseItem({ title: "Loose note" }));
    expect(await Bun.file(join(root, "loose-note.md")).exists()).toBe(true);
  });

  it("omits the body from listItems but returns it from getItem", async () => {
    const s = await open();
    const created = await s.createItem(baseItem({ title: "With body", body: "Line one\nLine two" }));

    const listed = s.listItems().find((i) => i.id === created.id)!;
    expect(listed.body).toBeUndefined();
    // The preview still works, because snippet is derived.
    expect(listed.snippet).toBe("Line one");

    expect(s.getItem(created.id)!.body).toBe("Line one\nLine two");
  });

  it("derives a link's snippet and domain without storing them", async () => {
    const s = await open();
    const created = await s.createItem(
      baseItem({ type: "link", title: "L", url: "https://www.example.com/x", description: "Desc" }),
    );
    const item = s.getItem(created.id)!;
    expect(item.snippet).toBe("Desc");
    expect(item.domain).toBe("example.com");

    const text = await readFile(join(root, "l.md"), "utf8");
    expect(text).not.toContain("snippet:");
    expect(text).not.toContain("domain:");
  });

  it("moves the file when the collection changes", async () => {
    const s = await open();
    await s.createCollection("Work", "#8a92b8");
    const item = await s.createItem(baseItem({ title: "Movable" }));
    expect(await Bun.file(join(root, "movable.md")).exists()).toBe(true);

    await s.updateItem(item.id, { collectionId: "Work" });
    expect(await Bun.file(join(root, "movable.md")).exists()).toBe(false);
    expect(await Bun.file(join(root, "Work/movable.md")).exists()).toBe(true);
    expect(s.getItem(item.id)!.collectionId).toBe("Work");
  });

  it("does not rename the file when the title changes", async () => {
    const s = await open();
    const item = await s.createItem(baseItem({ title: "Original" }));
    await s.updateItem(item.id, { title: "Completely different" });

    // Renaming would churn git history and break inbound wikilinks.
    expect(await Bun.file(join(root, "original.md")).exists()).toBe(true);
    expect(s.getItem(item.id)!.title).toBe("Completely different");
  });

  it("deletes to trash rather than unlinking", async () => {
    const s = await open();
    const item = await s.createItem(baseItem({ title: "Doomed" }));
    await s.deleteItem(item.id);

    expect(s.getItem(item.id)).toBeNull();
    expect(await Bun.file(join(root, "doomed.md")).exists()).toBe(false);
    const trashed = await s.vault.listMarkdown();
    expect(trashed).toEqual([]); // trash is not scanned
    const { readdir } = await import("node:fs/promises");
    expect((await readdir(join(root, ".lore/trash"))).length).toBe(1);
  });
});

describe("store: collections", () => {
  it("treats a bare folder as a collection with no collections.json", async () => {
    await write("Imported/a.md", "---\ntitle: A\n---\n\nbody");
    const s = await open();
    const collections = await s.listCollections();
    expect(collections.map((c) => c.id)).toContain("Imported");
    expect(collections.find((c) => c.id === "Imported")!.color).toMatch(/^#/);
  });

  it("unfiles children to the root when a collection is deleted", async () => {
    // This is the contract memoryRepository.test.ts asserts, as a file move.
    const s = await open();
    await s.createCollection("Work", "#8a92b8");
    const item = await s.createItem(baseItem({ title: "Filed", collectionId: "Work" }));

    await s.deleteCollection("Work");

    expect((await s.listCollections()).map((c) => c.id)).not.toContain("Work");
    expect(s.getItem(item.id)!.collectionId).toBeUndefined();
    expect(await Bun.file(join(root, "filed.md")).exists()).toBe(true);
  });

  it("keeps item ids when a collection is renamed", async () => {
    const s = await open();
    await s.createCollection("Work", "#8a92b8");
    const item = await s.createItem(baseItem({ title: "Kept", collectionId: "Work" }));

    await s.updateCollection("Work", { name: "Job" });

    expect(s.getItem(item.id)!.collectionId).toBe("Job");
    expect(await Bun.file(join(root, "Job/kept.md")).exists()).toBe(true);
  });

  it("ignores dot-directories and attachments/", async () => {
    await mkdir(join(root, "attachments"), { recursive: true });
    await write("attachments/pic.md", "# not an item");
    const s = await open();
    expect((await s.listCollections()).map((c) => c.id)).not.toContain("attachments");
    expect(s.listItems().length).toBe(0);
  });
});

describe("store: wikilinks", () => {
  it("resolves related to ids in memory and writes stems to disk", async () => {
    const s = await open();
    const a = await s.createItem(baseItem({ title: "Alpha" }));
    const b = await s.createItem(baseItem({ title: "Beta", related: [a.id] }));

    expect(s.getItem(b.id)!.related).toEqual([a.id]);
    const text = await readFile(join(root, "beta.md"), "utf8");
    expect(text).toContain("[[alpha]]");
    expect(text).not.toContain(a.id);
  });

  it("preserves a link whose target does not exist yet", async () => {
    // Linking to a note you have not written is the normal workflow; Lore must
    // never be the reason it disappears on the next save.
    await write("a.md", "---\ntitle: A\nrelated:\n  - \"[[not-yet-written]]\"\n---\n\nbody");
    const s = await open();
    const item = s.listItems()[0];

    expect(item.related).toEqual([]);

    await s.updateItem(item.id, { title: "A renamed" });
    const text = await readFile(join(root, "a.md"), "utf8");
    expect(text).toContain("[[not-yet-written]]");
  });

  it("heals a dead link once its target appears", async () => {
    await write("a.md", "---\ntitle: A\nrelated:\n  - \"[[later]]\"\n---\n\nb");
    const s = await open();
    expect(s.listItems()[0].related).toEqual([]);

    await write("later.md", "---\ntitle: Later\n---\n\nb");
    await s.reconcile();

    const a = s.listItems().find((i) => i.title === "A")!;
    const later = s.listItems().find((i) => i.title === "Later")!;
    expect(a.related).toEqual([later.id]);
  });
});

describe("store: index", () => {
  it("rebuilds from the files after the index is deleted", async () => {
    const s = await open();
    await s.createItem(baseItem({ title: "Durable", body: "content" }));
    s.close();

    await rm(join(root, ".lore/index.db"), { force: true });
    store = await VaultStore.open(root);

    const item = store.listItems().find((i) => i.title === "Durable")!;
    expect(item).toBeDefined();
    expect(store.getItem(item.id)!.body).toBe("content");
  });

  it("picks up an external edit on reconcile", async () => {
    const s = await open();
    const item = await s.createItem(baseItem({ title: "Edited" }));

    // Simulate an edit from Obsidian or a git pull.
    const path = join(root, "edited.md");
    const text = await readFile(path, "utf8");
    await writeFile(path, text.replace("title: Edited", "title: Edited elsewhere"), "utf8");
    await s.reconcile();

    expect(s.getItem(item.id)!.title).toBe("Edited elsewhere");
  });

  it("notices a change even when the mtime lies", async () => {
    // git checkout, rsync and `cp -p` all set mtimes backwards.
    const s = await open();
    const item = await s.createItem(baseItem({ title: "Sneaky", body: "one" }));
    const path = join(root, "sneaky.md");
    const before = await import("node:fs/promises").then((fs) => fs.stat(path));

    const text = await readFile(path, "utf8");
    await writeFile(path, text.replace("one", "two-different-length"), "utf8");
    const { utimes } = await import("node:fs/promises");
    await utimes(path, before.atime, before.mtime);

    await s.reconcile();
    expect(s.getItem(item.id)!.body).toContain("two-different-length");
  });

  it("drops items whose files are gone", async () => {
    const s = await open();
    const item = await s.createItem(baseItem({ title: "Vanishing" }));
    await rm(join(root, "vanishing.md"));
    await s.reconcile();
    expect(s.getItem(item.id)).toBeNull();
  });
});

describe("store: search and tags", () => {
  it("finds an item by a word in its body", async () => {
    const s = await open();
    await s.createItem(baseItem({ title: "Nothing obvious", body: "mentions perceptual uniformity" }));
    const hits = s.search("perceptual");
    expect(hits.map((i) => i.title)).toEqual(["Nothing obvious"]);
  });

  it("prefix-matches so search works while typing", async () => {
    const s = await open();
    await s.createItem(baseItem({ title: "Roadmap" }));
    expect(s.search("roadm").length).toBe(1);
  });

  it("returns nothing rather than throwing on a malformed query", async () => {
    const s = await open();
    await s.createItem(baseItem({ title: "X" }));
    expect(s.search('"""').length).toBe(0);
  });

  it("counts tags across items", async () => {
    const s = await open();
    await s.createItem(baseItem({ title: "A", tags: ["design", "work"] }));
    await s.createItem(baseItem({ title: "B", tags: ["design"] }));
    expect(s.listTags()).toEqual([
      { name: "design", count: 2 },
      { name: "work", count: 1 },
    ]);
  });
});
