// Seed knowledge base — items i1–i9 and collections, ported verbatim from the
// Claude Design prototype (Balloon.dc.html lines 426–488).
//
// The prototype used literal display strings ("2m", "Today, 14:30"); the README
// says to derive those at runtime. So each item carries a real `createdAt` ISO
// timestamp computed from a "minutes ago" offset, and the UI formats relative
// time / saved-date from it (see lib/format.ts). Offsets are chosen so a fresh
// launch reproduces the prototype's labels.

import type { Collection, Item } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** ISO timestamp `ago` ms before now. Computed at module load so labels stay fresh. */
const at = (ago: number): string => new Date(Date.now() - ago).toISOString();

export const SEED_COLLECTIONS: Collection[] = [
  { id: "reading", name: "Reading List", color: "#8a92b8" },
  { id: "work", name: "Work", color: "#a88f6e" },
  { id: "design", name: "Design Inspiration", color: "#82a896" },
  { id: "recipes", name: "Recipes", color: "#b88a98" },
];

/** Sidebar tag order, from the prototype's `tagNames`. */
export const SEED_TAG_ORDER = ["design", "research", "product", "tools", "work"];

export const SEED_ITEMS: Item[] = [
  {
    id: "i1",
    type: "link",
    title: "How Linear builds product",
    domain: "linear.app",
    collectionId: "reading",
    tags: ["product", "research"],
    flags: { inbox: true },
    summary:
      "An inside look at Linear’s opinionated, fast product process — small autonomous teams, weekly build cycles, and writing-first planning over meetings.",
    points: [
      "Writing-first specs replace status meetings",
      "Ship in weekly cycles, not quarters",
      "Quality is a default, not a final phase",
    ],
    related: ["i2", "i8"],
    createdAt: at(2 * MINUTE),
    updatedAt: at(2 * MINUTE),
  },
  {
    id: "i2",
    type: "link",
    title: "Building a Second Brain",
    domain: "fortelabs.com",
    collectionId: "reading",
    tags: ["productivity", "pkm"],
    flags: { inbox: true },
    summary:
      "The CODE method — Capture, Organize, Distill, Express — a system for turning saved notes into finished work instead of a graveyard of links.",
    points: [
      "Capture only what resonates",
      "Organize by actionability, not topic",
      "Distill notes progressively over time",
    ],
    related: ["i1", "i3"],
    createdAt: at(1 * HOUR),
    updatedAt: at(1 * HOUR),
  },
  {
    id: "i3",
    type: "note",
    title: "Q3 roadmap sync — notes",
    collectionId: "work",
    tags: ["work", "research"],
    flags: { today: true },
    snippet:
      "Priorities locked: capture latency, AI tagging accuracy, then the mobile share sheet. Graph view deferred to Q4.",
    summary:
      "Decisions from the roadmap sync: ship the mobile share sheet first, invest in AI tagging accuracy, and defer the graph view.",
    points: [
      "Mobile share sheet → next sprint",
      "AI tagging needs an eval set",
      "Defer graph view to Q4",
    ],
    related: ["i4"],
    createdAt: at(3 * HOUR),
    updatedAt: at(3 * HOUR),
  },
  {
    id: "i4",
    type: "task",
    title: "Follow up with Maya re: onboarding copy",
    collectionId: "work",
    tags: ["work"],
    flags: { today: true, inbox: true },
    snippet:
      "Review and approve the new onboarding microcopy with Maya before Friday’s build.",
    summary:
      "A reminder to review and sign off on the new onboarding microcopy with Maya this week.",
    related: ["i3"],
    createdAt: at(5 * HOUR),
    updatedAt: at(5 * HOUR),
  },
  {
    id: "i5",
    type: "code",
    title: "useDebounce — React hook",
    tags: ["tools"],
    flags: {},
    snippet:
      "export function useDebounce(value, ms = 300) {\n  const [v, setV] = useState(value);\n  useEffect(() => {\n    const id = setTimeout(() => setV(value), ms);\n    return () => clearTimeout(id);\n  }, [value, ms]);\n  return v;\n}",
    summary:
      "A tiny hook that debounces a fast-changing value — handy for search inputs and live filters.",
    related: ["i6"],
    createdAt: at(1 * DAY),
    updatedAt: at(1 * DAY),
  },
  {
    id: "i6",
    type: "link",
    title: "OKLCH Color Picker",
    domain: "oklch.com",
    collectionId: "design",
    tags: ["design", "tools"],
    flags: { starred: true },
    summary:
      "An interactive picker for OKLCH — a perceptually-uniform color space with predictable lightness, ideal for building accessible color scales.",
    points: [
      "Lightness stays perceptually even",
      "Great for systematic, accessible scales",
    ],
    related: ["i8", "i5"],
    createdAt: at(1 * DAY + 3 * HOUR),
    updatedAt: at(1 * DAY + 3 * HOUR),
  },
  {
    id: "i7",
    type: "image",
    title: "Whiteboard — capture flow sketch",
    collectionId: "design",
    tags: ["design"],
    flags: {},
    summary:
      "A hand sketch of the balloon capture states and the AI filing pipeline, from keystroke to organized entry.",
    related: ["i6"],
    createdAt: at(2 * DAY),
    updatedAt: at(2 * DAY),
  },
  {
    id: "i8",
    type: "link",
    title: "The Design of Everyday Things",
    domain: "nngroup.com",
    collectionId: "design",
    tags: ["design", "research"],
    flags: { starred: true },
    summary:
      "Norman’s foundations of usable design — affordances, signifiers, and feedback — the principles behind any good interface.",
    points: [
      "Affordances suggest possible actions",
      "Feedback closes the interaction loop",
    ],
    related: ["i6", "i1"],
    createdAt: at(3 * DAY),
    updatedAt: at(3 * DAY),
  },
  {
    id: "i9",
    type: "note",
    title: "Weeknight miso ramen",
    collectionId: "recipes",
    tags: ["food"],
    flags: {},
    snippet: "Stock + miso, soft egg, scallions, chili oil. Under 20 minutes.",
    summary:
      "A quick miso ramen for busy weeknights — ready in under twenty minutes.",
    related: [],
    createdAt: at(4 * DAY),
    updatedAt: at(4 * DAY),
  },
];

/** Canned Ask Balloon conversation from the prototype's `messages`. */
export const SEED_CHAT = [
  {
    id: "m1",
    role: "user" as const,
    text: "What did I save about color and design systems?",
  },
  {
    id: "m2",
    role: "ai" as const,
    text: "You’ve saved a few relevant things. The OKLCH Color Picker covers perceptually-uniform color, and “The Design of Everyday Things” grounds the principles behind a good system.",
    sources: [{ itemId: "i6" }, { itemId: "i8" }],
  },
];
