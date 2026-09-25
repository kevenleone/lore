# Agent Instructions

This file is the single source of truth for agent instructions in this repository.

## What This Is

Lore is an offline-first personal knowledge base: a Tauri 2 desktop app over a
folder of Markdown files. The files _are_ the data — there is no database to
export from. A global hotkey opens a capture panel; the library browses,
searches and links what you captured.

The principles that decide arguments, in the order they usually come up:

- **The filesystem is the database.** A folder is a collection, a file is an
  item, and a collection id _is_ its path. Move a file in Finder and it is
  refiled. Never write a `collection:` key into frontmatter — it would be a
  second source of truth for something the path already says.
- **Never lose what the user typed.** Unknown frontmatter keys, unknown
  `.lore/workspace.json` keys and unresolved `[[wikilinks]]` all survive a
  round-trip byte-for-byte. Any change to the Markdown pipeline needs a fixture
  proving it.
- **Derived state is disposable.** `.lore/index.db` is rebuilt from the files
  and is never migrated — bump `SCHEMA_VERSION` and it is thrown away.
- **The renderer is not trusted.** It gets no shell permission. The data engine
  is spawned by Rust and reached over a loopback port with a bearer token passed
  by environment variable, never argv.
- **No surprise renames.** Retitling an item does not rename its file.
- **Lore never runs git.** The vault is a folder; committing it is the user's.

The README is user-facing and current; read it for what the app does. This file
is for how to work on it.

## Commands

`pnpm` only — the repo is a pnpm workspace (root plus `sidecar/`).

| Command                          | What it does                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm test`                      | Both suites: Vitest for the renderer, then `bun test` for the engine. **This is the one to run.** |
| `pnpm test:sidecar`              | The engine suite alone. It runs against real temporary vaults on disk.                            |
| `npx vitest run <path>`          | One renderer test file, while iterating.                                                          |
| `pnpm lint`                      | ESLint. It does **not** pass clean — see below.                                                   |
| `pnpm format`                    | Prettier over everything. Required before committing.                                             |
| `npx tsc --noEmit`               | Typecheck the renderer. `pnpm --filter @lore/sidecar typecheck` for the engine.                   |
| `LORE_MODE=agent pnpm tauri dev` | Run the app. **Always use `agent`** — see the next section.                                       |

`pnpm lint` reports a standing count of pre-existing errors, nearly all
`no-restricted-syntax` on single-letter parameters in older files. Treat the
count as the baseline: note it before you start and make sure you have not added
to it. Do not "fix" unrelated ones in a feature branch.

Three guard tests fail the build on their own terms, by design:

- `src/store/switches.test.ts` — a settings switch with no reader outside
  `src/components/settings/` is a toggle that does nothing.
- `src/theme/palette.test.ts` — a token missing from any of the theme maps.
- `src/components/kb/sidebarRails.test.tsx` — the sidebar's two indented
  sections drifting out of alignment.

## Architecture

Three processes, four windows.

**Renderer** (`src/`) — React 19, Zustand, TipTap 3, Tailwind v4, Vite 7. Four
window entries, each its own HTML file and root: `main`, `capture`, `focus`,
`print` (`vite.config.ts`, `src-tauri/src/lib.rs`).

**Data engine** (`sidecar/`) — a Bun + Elysia HTTP server that owns the vault:
reading and writing Markdown, the SQLite FTS5 index, the file watcher, link
resolution. It is the source of truth. Rust spawns it, and it announces its
ephemeral port back over stdout as a handshake (`src-tauri/src/sidecar.rs`).

**Host** (`src-tauri/`) — Rust: windows, tray, global shortcut, menus, PDF
printing, and spawning the engine.

Two seams matter more than the rest:

- **`src/data/repository.ts`** — every store and UI interaction goes through
  `KnowledgeRepository`. `src/data/index.ts` picks `VaultRepository` inside
  Tauri and `MemoryRepository` everywhere else, which is why the UI runs in a
  browser and in jsdom with no vault at all. Keep the interface narrow.
- **`src/store/views.ts`** and **`src/store/tasks.ts`** — pure selectors over
  plain item lists. Rules belong here, where they are testable without a DOM,
  not in a component.

### Build modes

`lore.modes.json` defines `prod`, `dev` and `agent`, and is read by `build.rs`,
`vite.config.ts` and the sidecar alike, so a port or a name is never written
twice. Each mode has its own bundle identifier — and therefore **its own vault**,
because Tauri derives the data directory from the identifier.

| Mode    | Identifier           | Vite | Engine dev port | Capture shortcut (macOS) |
| ------- | -------------------- | ---- | --------------- | ------------------------ |
| `prod`  | `com.lore.app`       | 1420 | 51789           | ⌥Space                   |
| `dev`   | `com.lore.app.dev`   | 1430 | 51799           | ⌥⇧Space                  |
| `agent` | `com.lore.app.agent` | 1440 | 51809           | ⌥⌃Space                  |

**Run the app as `LORE_MODE=agent pnpm tauri dev`, always.** It opens a separate
vault with a violet accent and an `AGENT` badge, so an experiment cannot touch
the library the installed app is using.

A vault also records which build claimed it, in `.lore/owner.json`, and a dev or
agent build refuses to open one that belongs to another Lore — two builds
rebuilding one index over each other has already cost a real evening. Production
is never refused and takes ownership back, because locking someone out of their
own library is the worse failure. Delete the file to hand a vault over
deliberately.

### The vault on disk

```
Work/                    a collection — the folder name is the id
  Work/Projects/         nested: the id is `Work/Projects`
    note.md              an item: YAML frontmatter + Markdown body
attachments/             reserved; never a collection
.lore/
  collections.json       colours and order — never the membership
  boards.json            per-collection board columns
  workspace.json         per-vault settings, committed, hand-editable
  templates/*.md         user templates
  index.db               derived, disposable, gitignored
  owner.json             which build claimed this folder; local, gitignored
  trash/                 deletes move here
```

Anything hand-editable is validated on read and keeps the keys this version does
not own (`sidecar/src/markdown.ts` carries them through an `extra` bag).

## Styling

Tailwind CSS v4 is the only styling system. `src/theme/tailwind.css` is the
single stylesheet, imported by all four window entries. Two things differ from
a stock Tailwind setup, both deliberately:

- **Every length is px, not rem.** `--spacing` is `4px`, so the numbers are
  Tailwind's own — `p-4` is still 16px and snippets from the docs translate —
  but they resolve in px. `App.tsx` scales the whole tree with `zoom` for the
  Text size preference, and px keeps that arithmetic predictable. (Measured in
  Chromium, `rem` and `px` do scale identically under `zoom`; the px choice
  means the answer never has to be re-derived for another engine.) The type and
  radius scales are px for the same reason.
- **There is no `dark:` variant, and there must not be one.** A theme is a whole
  token map, served by the registry in `src/theme/themes.ts`, and `paintTheme`
  swaps the map wholesale — so `bg-surface` is already correct in every theme. If
  you need a colour that differs by theme, add the key to **every** map — the two
  literal ones (`LIGHT_TOKENS`, `DARK_TOKENS`) and `buildTokens()` in
  `src/theme/palette.ts` — and bridge it in the `@theme inline` block. Do not
  reach for `dark:`. `src/theme/palette.test.ts` fails if a map falls behind.

Other conventions:

- Compose conditional classes with `cn()` from `src/lib/cn.ts`, never by
  hand-building a ternary that repeats the base classes.
- Colours come from tokens (`bg-surface`, `text-text2`, `border-border`) with no
  hex fallback — `theme/bootstrap.ts` paints the tokens before the first render.
- An inline `style` is right only for values a class genuinely cannot carry: a
  computed length, a colour the user picked, or a layout constant shared with JS.
  Say which in a comment.

## Code Style

- `interface` for object shapes, `type` for unions/aliases
- Composition over inheritance
- Early returns over nested conditionals; optional chaining (`?.`) and nullish coalescing (`??`)
- Explicit return types on exported functions
- File names: kebab-case; component names: PascalCase
- Functional components only; no class components
- Generics: descriptive names (`TResponse`, not `T`)
- No `any` — TypeScript strict mode enforced everywhere
- No abbreviations in identifiers (`subscription`, not `s`; `priority`, not `prio`)
- No inline `if` expressions

### Imports

- ES modules only (`import`/`export`)
- Group imports: external libraries, then aliased internal modules, then relative
- Type-only imports use the `type` keyword: `import type { Message } from '...'`
- Use the package's path alias for cross-folder imports; keep relative paths within a directory

### Naming

- Components: PascalCase (`ThemedText`, `HomeScreen`)
- Files: kebab-case (`use-theme-color.ts`, `themed-text.tsx`)
- Hooks: camelCase starting with `use` (`useThemeColor`)
- True constants: UPPER_SNAKE_CASE
- Types/interfaces: PascalCase, descriptive

### File Organization

- Co-locate related files (component + styles + types)
- Use platform-specific extensions when needed (`.ios.tsx`, `.web.ts`)

### Comments

**The default is no comment.** Most code needs none, and most comments that get
written are restating what the code already says. A comment earns its place only
when the code alone would let someone break something important — otherwise
leave it out and let the code speak.

Write one when, and only when:

- Removing it would let a reader silently break correctness or security (e.g. why
  webhook signatures verify against the raw body, not the re-serialized JSON).
- Ordering or placement is load-bearing and not obvious from reading top to bottom.
- The code looks wrong or redundant but is deliberate (a loop that intentionally
  does not short-circuit, an early return that is safe despite appearances).
- An external contract is being matched (a provider's wire format, a spec).

Do **not** write one to:

- Restate what the next line does (`// Only whether a secret exists` above
  `hasSecret: !!secretCiphertext`).
- Label a section, a constant, or an obviously-named function.
- Explain where code was placed or which folder it belongs to.
- Narrate a change, decision history, or what the code used to do.
- Summarise a file at the top of it. A module's job should be evident from its
  name and its exports.
- Document a parameter, field or return whose name already says it.
- Record why a bug happened. That belongs in the commit message; the fix belongs
  in a test that fails without it.

**Prefer one tight line over three, and no comment over one tight line.** If a
comment needs a paragraph, the code probably needs a better name or a smaller
function instead. A file where comments outnumber a handful of lines is a file
that has been narrated rather than written.

## Commit Rules

Use [Conventional Commits](https://www.conventionalcommits.org/): `<prefix>: <description>`.

- Run `pnpm format` before committing; if Prettier modifies files, stage them and add a final `chore: Source Format` commit as the last commit in the sequence.
- Do **not** add `Co-authored-by:` trailers.
- Do **not** add AI attribution footers anywhere — no "🤖 Generated with Claude Code" (or similar) in commit messages, PR descriptions, or issue comments.
- Avoid commit bodies/footers unless the change has a breaking or high-impact side effect.
- Split commits by logical area; keep each commit focused on one concern.

| Prefix     | Use when                           |
| ---------- | ---------------------------------- |
| `feat`     | New feature                        |
| `fix`      | Bug fix                            |
| `refactor` | No bug fix, no new feature         |
| `style`    | Formatting/whitespace only         |
| `docs`     | Documentation only                 |
| `test`     | Adding/updating tests              |
| `chore`    | Maintenance, deps, tooling         |
| `perf`     | Performance improvement            |
| `ci`       | CI/CD changes                      |
| `build`    | Build system or dependency changes |

### Commit Splitting

- Split changes into one or more commits by area, context, or logical grouping
- Do not add hard rules by commit type — use your judgment
- Keep each commit focused on a single concern

### Co-Author Trailer

- Never add `Co-authored-by:` for the agent under any circumstances

### Formatting Workflow

1. Before committing, run `pnpm format` at the project root
2. If `prettier` modified any files, stage those changes and add a final commit:
    ```
    chore: Source Format
    ```
3. This formatting commit must be the last in the sequence
