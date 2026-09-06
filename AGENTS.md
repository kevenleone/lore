# Agent Instructions

This file is the single source of truth for agent instructions in this repository.

## What This Is

XXX

## Commands

XXX

## Architecture

XXX

## Styling

Tailwind CSS v4 is the only styling system. `src/theme/tailwind.css` is the
single stylesheet, imported by all three window entries. Two things differ from
a stock Tailwind setup, both deliberately:

- **Every length is px, not rem.** `--spacing` is `4px`, so the numbers are
  Tailwind's own — `p-4` is still 16px and snippets from the docs translate —
  but they resolve in px. `App.tsx` scales the whole tree with `zoom` for the
  Text size preference, and px keeps that arithmetic predictable. (Measured in
  Chromium, `rem` and `px` do scale identically under `zoom`; the px choice
  means the answer never has to be re-derived for another engine.) The type and
  radius scales are px for the same reason.
- **There is no `dark:` variant, and there must not be one.** The colour tokens
  in `src/theme/tokens.ts` flip wholesale between `LIGHT_TOKENS` and
  `DARK_TOKENS`, so `bg-surface` is already correct in both themes. If you need
  a colour that differs by theme, add the key to **both** token maps and bridge
  it in the `@theme inline` block — do not reach for `dark:`.

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

Comment sparingly. A comment earns its place only when the code alone would let
someone break something important — otherwise leave it out and let the code speak.

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

Prefer one tight line over three. If a comment needs a paragraph, the code
probably needs a better name or a smaller function instead.

## Commit Rules

Use [Conventional Commits](https://www.conventionalcommits.org/): `<prefix>: <description>`.

- Run `bun format` before committing; if Prettier modifies files, stage them and add a final `chore: Source Format` commit as the last commit in the sequence.
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

1. Before committing, run `bun format` at the project root
2. If `prettier` modified any files, stage those changes and add a final commit:
    ```
    chore: Source Format
    ```
3. This formatting commit must be the last in the sequence
