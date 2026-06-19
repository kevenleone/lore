import { describe, expect, it } from "vitest";
import { SEED_ITEMS, SEED_TAG_ORDER } from "./seed";
import {
  collectionCount,
  detailFlags,
  filterByView,
  relatedItems,
  sortItems,
  tagCounts,
  viewCounts,
  viewTitle,
} from "./views";
import type { Collection, Item } from "./types";

const COLLECTIONS: Collection[] = [
  { id: "reading", name: "Reading List", color: "#8a92b8" },
  { id: "work", name: "Work", color: "#a88f6e" },
];

describe("viewCounts", () => {
  it("counts all/inbox/today/starred from flags", () => {
    const c = viewCounts(SEED_ITEMS);
    expect(c.all).toBe(SEED_ITEMS.length);
    expect(c.inbox).toBe(SEED_ITEMS.filter((i) => i.flags.inbox).length);
    expect(c.today).toBe(SEED_ITEMS.filter((i) => i.flags.today).length);
    expect(c.starred).toBe(SEED_ITEMS.filter((i) => i.flags.starred).length);
  });
});

describe("filterByView", () => {
  it("filters by collection and sorts newest first", () => {
    const reading = filterByView(SEED_ITEMS, { kind: "collection", val: "reading" });
    expect(reading.every((i) => i.collectionId === "reading")).toBe(true);
    for (let k = 1; k < reading.length; k++) {
      expect(reading[k - 1].createdAt >= reading[k].createdAt).toBe(true);
    }
  });

  it("filters by tag", () => {
    const design = filterByView(SEED_ITEMS, { kind: "tag", val: "design" });
    expect(design.every((i) => i.tags.includes("design"))).toBe(true);
    expect(design.length).toBeGreaterThan(0);
  });

  it("returns everything for the 'all' view", () => {
    expect(filterByView(SEED_ITEMS, { kind: "all", val: null })).toHaveLength(SEED_ITEMS.length);
  });
});

describe("sortItems", () => {
  it("sorts newest/oldest by createdAt and title alphabetically", () => {
    const newest = sortItems(SEED_ITEMS, "newest");
    const oldest = sortItems(SEED_ITEMS, "oldest");
    expect(newest[0].id).toBe(oldest[oldest.length - 1].id);

    const byTitle = sortItems(SEED_ITEMS, "title").map((i) => i.title);
    expect(byTitle).toEqual([...byTitle].sort((a, b) => a.localeCompare(b)));
  });
});

describe("tagCounts", () => {
  it("respects the seed order and counts occurrences", () => {
    const tags = tagCounts(SEED_ITEMS, SEED_TAG_ORDER);
    const names = tags.map((t) => t.name);
    expect(names.slice(0, SEED_TAG_ORDER.length)).toEqual(
      SEED_TAG_ORDER.filter((t) => names.includes(t)),
    );
    const design = tags.find((t) => t.name === "design");
    expect(design?.count).toBe(SEED_ITEMS.filter((i) => i.tags.includes("design")).length);
  });
});

describe("collectionCount", () => {
  it("counts items in a collection", () => {
    expect(collectionCount(SEED_ITEMS, "work")).toBe(
      SEED_ITEMS.filter((i) => i.collectionId === "work").length,
    );
  });
});

describe("viewTitle", () => {
  it("maps each view kind to a label", () => {
    expect(viewTitle({ kind: "all", val: null }, COLLECTIONS)).toBe("All Items");
    expect(viewTitle({ kind: "starred", val: null }, COLLECTIONS)).toBe("Flagged");
    expect(viewTitle({ kind: "collection", val: "work" }, COLLECTIONS)).toBe("Work");
    expect(viewTitle({ kind: "tag", val: "design" }, COLLECTIONS)).toBe("#design");
  });
});

describe("detailFlags", () => {
  const link = SEED_ITEMS.find((i) => i.type === "link")!;
  const code = SEED_ITEMS.find((i) => i.type === "code")!;

  it("shows a preview for links and a code block for code", () => {
    expect(detailFlags(link, true, 2).showPreview).toBe(true);
    expect(detailFlags(code, true, 0).detIsCode).toBe(true);
  });

  it("hides AI sections when aiAssist is off", () => {
    const f = detailFlags(link, false, 2);
    expect(f.showSummary).toBe(false);
    expect(f.showRelated).toBe(false);
  });
});

describe("relatedItems", () => {
  it("resolves related ids to items, dropping unknowns", () => {
    const item: Item = { ...SEED_ITEMS[0], related: ["i2", "does-not-exist"] };
    const related = relatedItems(item, SEED_ITEMS);
    expect(related.map((r) => r.id)).toEqual(["i2"]);
  });
});
