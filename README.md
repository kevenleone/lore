# Lore

An **offline-first** personal knowledge base with global-hotkey quick capture.
Built with **Tauri 2 + React 19 + TypeScript**. Press **⌥Space** anywhere to
capture a link, note, task, or code snippet; Lore files it into a local
library you can browse, search, and ask questions about.

> UI recreated pixel-for-pixel from the `Lore.dc.html` Claude Design
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
"Ask Lore" chat with zero network/keys. A real Claude-backed provider can
replace it behind the same interface (route calls through a Rust command so the
API key never reaches the renderer).

**First launch** shows `Onboarding` (`components/onboarding/`), the
`Lore Onboarding.dc.html` sheet: sign in with Apple / Google / an email link, or
start a local vault. The chosen lane is recorded as `auth.mode` and, with every
preference, persisted by `store/persisted.ts` (localStorage for now — swap that
module when there is a backend). Identity providers and mail delivery are stubs.

**Settings is a modal sheet** (`components/settings/`) over the KB window, with
the design's ten panes in a left rail. Accent, appearance, list density, text
size, AI location and the full switch set write through the store and persist;
panes that need a backend (devices, billing, calendar accounts) render the
design's copy against placeholder figures.

**Styling** uses inline styles referencing semantic CSS variables — `--ac` for
the accent (5 options) and the `--surface` / `--text` / `--border` token set in
`theme/tokens.ts` — plus vanilla-extract for global resets and `:hover` states.
`App.tsx` writes the Light or Dark token set onto the app root, so Look & Feel →
Appearance (including Auto, which follows the OS) repaints the whole app. A too-
dark accent is lifted on the dark ground exactly as the design specifies.

## Layout

```
src/
  App.tsx                  main KB window shell
  capture.tsx              Quick Capture window entry
  components/
    common/{Icon,glyphs}    SVG icon sets
    common/LoreMark          logo mark + serif wordmark font
    kb/                      TitleBar, Sidebar, ListPane, DetailPane,
                             AiSummaryCard, RelatedCards, AskLoreChat
    capture/                 CaptureApp, CommandBar (A), Composer (B)
    onboarding/              first-launch sheet (sign in / local vault / magic link)
    settings/                modal sheet, ten panes, shared controls
  data/                      repository seam + memory/local impls + schema
  store/                     types, seed, typeMeta, views (selectors), useStore,
                             persisted (prefs + auth)
  ai/                        AiProvider + MockAiProvider
  lib/                       format, capture helpers
  theme/                     global + util styles, light/dark tokens
src-tauri/
  src/{lib.rs, commands.rs}  plugins, ⌥Space shortcut, capture window control
  tauri.conf.json            window + bundle config
  capabilities/default.json  permission grants
  icons/app-icon.svg         Dock icon master — regenerate the rasters with
                             `pnpm tauri icon src-tauri/icons/app-icon.svg -o src-tauri/icons`
  icons/tray-icon.svg        menu-bar master (monochrome template, auto-inverts)
```

## Status

Phases 1–5 complete: scaffold, full KB UI on seed data, SQLite persistence,
quick-capture window + hotkey (both directions), and AI stubs with unit tests.
Phase 6 covers the Lore rebrand, the onboarding sheet, the settings modal, and
light/dark theming.

Deferred: real Claude AI provider, Convex remote sync, real auth and mail
delivery behind onboarding, and the Focus and Calendar surfaces — the designs
treat those as windows of their own, so only their preference panes are built.
