// Seed knowledge base — items i1–i9 and collections, ported verbatim from the
// Claude Design prototype (Lore.dc.html lines 426–488).
//
// The prototype used literal display strings ("2m", "Today, 14:30"); the README
// says to derive those at runtime. So each item carries a real `createdAt` ISO
// timestamp computed from a "minutes ago" offset, and the UI formats relative
// time / saved-date from it (see lib/format.ts). Offsets are chosen so a fresh
// launch reproduces the prototype's labels.

import type { Collection, Item } from './types';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** ISO timestamp `ago` ms before now. Computed at module load so labels stay fresh. */
const at = (ago: number): string => new Date(Date.now() - ago).toISOString();

export const SEED_COLLECTIONS: Collection[] = [
    { color: '#8a92b8', id: 'reading', name: 'Reading List' },
    { color: '#a88f6e', id: 'work', name: 'Work' },
    { color: '#82a896', id: 'design', name: 'Design Inspiration' },
    { color: '#b88a98', id: 'recipes', name: 'Recipes' },
];

/** Sidebar tag order, from the prototype's `tagNames`. */
export const SEED_TAG_ORDER = ['design', 'research', 'product', 'tools', 'work'];

export const SEED_ITEMS: Item[] = [
    {
        collectionId: 'reading',
        createdAt: at(2 * MINUTE),
        domain: 'linear.app',
        flags: { inbox: true },
        id: 'i1',
        points: [
            'Writing-first specs replace status meetings',
            'Ship in weekly cycles, not quarters',
            'Quality is a default, not a final phase',
        ],
        related: ['i2', 'i8'],
        summary:
            'An inside look at Linear’s opinionated, fast product process — small autonomous teams, weekly build cycles, and writing-first planning over meetings.',
        tags: ['product', 'research'],
        title: 'How Linear builds product',
        type: 'link',
        updatedAt: at(2 * MINUTE),
        url: 'https://linear.app/blog/how-linear-builds-product',
    },
    {
        collectionId: 'reading',
        createdAt: at(1 * HOUR),
        domain: 'fortelabs.com',
        flags: { inbox: true },
        id: 'i2',
        points: [
            'Capture only what resonates',
            'Organize by actionability, not topic',
            'Distill notes progressively over time',
        ],
        related: ['i1', 'i3'],
        summary:
            'The CODE method — Capture, Organize, Distill, Express — a system for turning saved notes into finished work instead of a graveyard of links.',
        tags: ['productivity', 'pkm'],
        title: 'Building a Second Brain',
        type: 'link',
        updatedAt: at(1 * HOUR),
        url: 'https://fortelabs.com/blog/basboverview/',
    },
    {
        body: 'Priorities locked: capture latency, AI tagging accuracy, then the mobile share sheet. Graph view deferred to Q4.',
        collectionId: 'work',
        createdAt: at(3 * HOUR),
        flags: { today: true },
        id: 'i3',
        points: [
            'Mobile share sheet → next sprint',
            'AI tagging needs an eval set',
            'Defer graph view to Q4',
        ],
        related: ['i4'],
        summary:
            'Decisions from the roadmap sync: ship the mobile share sheet first, invest in AI tagging accuracy, and defer the graph view.',
        tags: ['work', 'research'],
        title: 'Q3 roadmap sync — notes',
        type: 'note',
        updatedAt: at(3 * HOUR),
    },
    {
        body: 'Review and approve the new onboarding microcopy with Maya before Friday’s build.',
        collectionId: 'work',
        createdAt: at(5 * HOUR),
        flags: { inbox: true, today: true },
        id: 'i4',
        related: ['i3'],
        summary:
            'A reminder to review and sign off on the new onboarding microcopy with Maya this week.',
        tags: ['work'],
        title: 'Follow up with Maya re: onboarding copy',
        type: 'task',
        updatedAt: at(5 * HOUR),
    },
    {
        body: 'export function useDebounce(value, ms = 300) {\n  const [v, setV] = useState(value);\n  useEffect(() => {\n    const id = setTimeout(() => setV(value), ms);\n    return () => clearTimeout(id);\n  }, [value, ms]);\n  return v;\n}',
        createdAt: at(1 * DAY),
        flags: {},
        id: 'i5',
        related: ['i6'],
        summary:
            'A tiny hook that debounces a fast-changing value — handy for search inputs and live filters.',
        tags: ['tools'],
        title: 'useDebounce — React hook',
        type: 'code',
        updatedAt: at(1 * DAY),
    },
    {
        collectionId: 'design',
        createdAt: at(1 * DAY + 3 * HOUR),
        domain: 'oklch.com',
        flags: { starred: true },
        id: 'i6',
        points: ['Lightness stays perceptually even', 'Great for systematic, accessible scales'],
        related: ['i8', 'i5'],
        summary:
            'An interactive picker for OKLCH — a perceptually-uniform color space with predictable lightness, ideal for building accessible color scales.',
        tags: ['design', 'tools'],
        title: 'OKLCH Color Picker',
        type: 'link',
        updatedAt: at(1 * DAY + 3 * HOUR),
        url: 'https://oklch.com/',
    },
    {
        collectionId: 'design',
        createdAt: at(2 * DAY),
        flags: {},
        id: 'i7',
        related: ['i6'],
        summary:
            'A hand sketch of the balloon capture states and the AI filing pipeline, from keystroke to organized entry.',
        tags: ['design'],
        title: 'Whiteboard — capture flow sketch',
        type: 'image',
        updatedAt: at(2 * DAY),
    },
    {
        collectionId: 'design',
        createdAt: at(3 * DAY),
        domain: 'nngroup.com',
        flags: { starred: true },
        id: 'i8',
        points: ['Affordances suggest possible actions', 'Feedback closes the interaction loop'],
        related: ['i6', 'i1'],
        summary:
            'Norman’s foundations of usable design — affordances, signifiers, and feedback — the principles behind any good interface.',
        tags: ['design', 'research'],
        title: 'The Design of Everyday Things',
        type: 'link',
        updatedAt: at(3 * DAY),
        url: 'https://www.nngroup.com/books/design-everyday-things-revised/',
    },
    {
        body: 'Stock + miso, soft egg, scallions, chili oil. Under 20 minutes.',
        collectionId: 'recipes',
        createdAt: at(4 * DAY),
        flags: {},
        id: 'i9',
        related: [],
        summary: 'A quick miso ramen for busy weeknights — ready in under twenty minutes.',
        tags: ['food'],
        title: 'Weeknight miso ramen',
        type: 'note',
        updatedAt: at(4 * DAY),
    },
];

/** Canned Ask Lore conversation from the prototype's `messages`. */
export const SEED_CHAT = [
    {
        id: 'm1',
        role: 'user' as const,
        text: 'What did I save about color and design systems?',
    },
    {
        id: 'm2',
        role: 'ai' as const,
        sources: [{ itemId: 'i6' }, { itemId: 'i8' }],
        text: 'You’ve saved a few relevant things. The OKLCH Color Picker covers perceptually-uniform color, and “The Design of Everyday Things” grounds the principles behind a good system.',
    },
];
