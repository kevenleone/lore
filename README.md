# Baloon

An **offline-first** personal knowledge base with global-hotkey quick capture.
Built with **Tauri 2 + React 19 + TypeScript**. Press **⌥Space** anywhere to
capture a link, note, task, or code snippet; Baloon files it into a local
library you can browse, search, and ask questions about.

> UI recreated pixel-for-pixel from the `Balloon.dc.html` Claude Design
> prototype.

## Run

```bash
pnpm install
pnpm tauri dev        # launches the desktop app (first run compiles Rust)
```

Other scripts:

```bash
pnpm build            # type-check + build the web bundles
pnpm test             # run unit tests (vitest)
pnpm tauri build      # produce a distributable .app/.dmg
```

## Architecture

**Offline-first, Convex-ready.** Everything goes through a single
`KnowledgeRepository` seam (`src/data/repository.ts`), so the app is agnostic to
where data lives:

| Implementation | When it's used | Role |
| --- | --- | --- |
| `LocalRepository` (`localRepository.ts`) | inside Tauri | **source of truth** — SQLite via `@tauri-apps/plugin-sql` |
| `MemoryRepository` (`memoryRepository.ts`) | Vite preview, unit tests | seed-backed |
| `convexRepository` | *(deferred)* | optional remote sync |

`src/data/index.ts` picks the implementation at runtime. The SQLite schema
(`src/data/schema.ts`) already carries `dirty` / `synced_at` / `deleted_at`
columns, so optional **Convex** sync can be layered in later as a
last-writer-wins outbox + tombstones — without touching the UI. No dedicated
backend is needed for local use; if multi-device sync is ever wanted, Convex
*is* the backend.

**Two windows** (`src-tauri/tauri.conf.json`):

- `main` — the three-pane knowledge base (sidebar · list · detail/chat).
- `capture` — a frameless, always-on-top Quick Capture panel toggled by **⌥Space**
  (registered in `src-tauri/src/lib.rs`; window control in `commands.rs`). It
  offers **both** capture directions: a **Command bar** (type anything, AI
  detects the type) and a **Composer** (pick a type, add structure). On save it
  writes through the repository and emits `item:created`; the main window
  listens and refreshes.

**AI is pluggable** (`src/ai/aiProvider.ts`). The deterministic
`MockAiProvider` powers summaries, tag suggestions, type detection, and the
"Ask Balloon" chat with zero network/keys. A real Claude-backed provider can
replace it behind the same interface (route calls through a Rust command so the
API key never reaches the renderer).

**Styling** uses inline styles referencing the `--ac` accent CSS variable
(themeable, 4 accents) plus vanilla-extract for global resets and `:hover`
states — mirroring the prototype's `--ac` model.

## Layout

```
src/
  App.tsx                  main KB window shell
  capture.tsx              Quick Capture window entry
  components/
    common/{Icon,glyphs}    SVG icon sets
    kb/                      TitleBar, Sidebar, ListPane, DetailPane,
                             AiSummaryCard, RelatedCards, AskBalloonChat
    capture/                 CaptureApp, CommandBar (A), Composer (B)
  data/                      repository seam + memory/local impls + schema
  store/                     types, seed, typeMeta, views (selectors), useStore
  ai/                        AiProvider + MockAiProvider
  lib/                       format, capture helpers
  theme/                     global + util styles
src-tauri/
  src/{lib.rs, commands.rs}  plugins, ⌥Space shortcut, capture window control
  tauri.conf.json            window + bundle config
  capabilities/default.json  permission grants
```

## Status

Phases 1–5 complete: scaffold, full KB UI on seed data, SQLite persistence,
quick-capture window + hotkey (both directions), and AI stubs with unit tests.
Deferred / optional: real Claude AI provider, and Convex remote sync.
