---
name: lore-docs
description: Write Markdown files that Lore (the offline-first knowledge base) reads as first-class items — notes, links, tasks, code snippets and images — with the right YAML frontmatter, filename, folder and body conventions. Use whenever asked to create, generate, import or convert notes/docs/tasks "for Lore", "into the vault", or as Lore items, or to write .md files that must show up correctly in a Lore vault.
---

# Writing Lore documents

A Lore vault is a plain folder of `.md` files. **The files are the data** — there
is no import step. Drop a correctly shaped file into the vault and Lore picks it
up live, indexes it for search, and renders it. This skill describes that shape.

Lore is forgiving: a file with no frontmatter at all is a valid note. But every
field below that you get right is one more thing that works — typing, tags,
boards, due dates, related links. Aim for the full shape.

## 1. Where the file goes

```
<vault>/
  some-unfiled-note.md        ← vault root = no collection
  Reading List/               ← a folder is a collection
    how-linear-builds-product.md
  Work/
    ship-the-release.md
  attachments/                ← reserved for pasted files; never a collection
  .lore/                      ← Lore's own state; never write here
```

- **The parent folder is the collection.** Never write a `collection` or
  `collectionId` key — Lore derives it from the path. To file an item, put it in
  the folder. Use one level of folders; nested collections are not supported.
- A new folder becomes a new collection automatically.
- Lore ignores dotfiles/dot-folders, `attachments/`, `node_modules/`, and
  editor temp files (`*~`, `*.swp`). Only `*.md` is read.

## 2. The filename

The filename stem is how other files link to this one (`[[stem]]`), so derive it
the way Lore does:

1. Start from the title. Strip accents (`café` → `cafe`) and drop apostrophes.
2. Lowercase; replace every run of non `a-z0-9` characters with a single `-`.
3. Trim leading/trailing `-`; cap at 80 characters (trim a trailing `-` again).
4. If the result is empty (emoji-only, CJK), use `untitled-<6 random chars>`.
   If it is a Windows reserved name (`con`, `aux`, `nul`, `prn`, `com1`–`com9`,
   `lpt1`–`lpt9`), append `-note`.
5. If the stem is already taken in the vault, append `-2`, `-3`, …

`How Linear Builds Product!` → `how-linear-builds-product.md`

The title is **not** the identity — renaming a title later does not rename the
file. Pick the filename once and keep it.

## 3. The frontmatter

YAML between `---` fences, as the very first thing in the file. Write keys in
this order — it is the order Lore writes them back in, so matching it means a
later edit in Lore produces no diff noise. Omit any key you have no value for.

| Key           | Type / values                                   | Notes                                                                                      |
| ------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `id`          | string                                          | Optional. Omit it and Lore assigns one. If you set it, it must be unique across the vault. |
| `title`       | string                                          | Display title. Falls back to the first `#` heading, then the filename.                     |
| `type`        | `note` \| `link` \| `task` \| `code` \| `image` | Anything else (or missing) means `note`.                                                   |
| `url`         | string                                          | **Links only.** The page the item points at.                                               |
| `created`     | ISO 8601 datetime                               | e.g. `2026-09-21T10:12:04.000Z`. Falls back to file mtime.                                 |
| `updated`     | ISO 8601 datetime                               | Falls back to `created`.                                                                   |
| `tags`        | list of strings                                 | Lowercase, no `#` (a leading `#` is stripped anyway). Flow style: `[product, research]`.   |
| `inbox`       | `true`                                          | Flags are flat booleans. **Only write them when true** — omit, never write `false`.        |
| `today`       | `true`                                          | Shows in Today.                                                                            |
| `starred`     | `true`                                          |                                                                                            |
| `done`        | `true`                                          | Tasks: finished.                                                                           |
| `completed`   | ISO 8601 datetime                               | Only alongside `done: true`.                                                               |
| `due`         | `YYYY-MM-DD`                                    | A calendar day, no time.                                                                   |
| `priority`    | `low` \| `high` \| `urgent`                     | Omit for normal — never write `priority: normal`.                                          |
| `status`      | board column id                                 | Tasks only. Default board: `todo`, `doing`, `done`. Omit = first column.                   |
| `image`       | URL or `attachments/<file>`                     | Banner/preview image; for `type: image`, the image itself.                                 |
| `imageCredit` | `{provider: unsplash, name, profileUrl}`        | Only with `image`, only for an Unsplash photo. Otherwise omit.                             |
| `description` | string                                          | **Links:** the page's own meta description.                                                |
| `summary`     | string                                          | A one-to-three-sentence summary of the item.                                               |
| `points`      | list of strings                                 | Key takeaways, shown under the summary.                                                    |
| `related`     | list of `'[[stem]]'`                            | Links to other items. **Quote each entry** — `[[` is YAML syntax otherwise.                |
| `comments`    | list of `{body, at?, author?, id?}`             | Notes left on the item. Only `body` is required.                                           |

Rules that matter:

- **Any other key is preserved untouched.** Adding your own metadata
  (`author:`, `source_llm:`) is safe; Lore carries it through every save. Put it
  after Lore's keys.
- **Never write `source:`** unless you really are mirroring a GitHub Markdown
  file. `source` makes the item read-only and Lore will overwrite the body from
  upstream.
- **`related` is what builds backlinks.** A `[[wikilink]]` in the body is kept
  and readable, but only `related` entries show up in the target's backlinks and
  Related panel. If two items are genuinely connected, put the link in `related`.
- Linking to a stem that does not exist yet is fine — Lore preserves it verbatim
  and it resolves itself when that file appears. `[[stem|alias]]` and
  `[[stem#heading]]` are accepted.
- Malformed YAML does not break the vault, but the file silently loses all its
  metadata and becomes a bare note. Quote strings containing `:`, `#`, `[`, `{`,
  or a leading `-`/`*`/`&`/`!`.

## 4. The body

Everything after the closing `---` (leave one blank line) is the body: GitHub
flavoured Markdown. Do **not** repeat the title as a `# H1` at the top — Lore
already shows `title` above the body.

**Editable in Lore's editor** — prefer these:

- paragraphs; headings `#` to `####` (start sections at `##`; `#####`+ is not modelled)
- `**bold**`, `*italic*`, `~~strike~~`, `` `inline code` ``, `[links](https://…)`
- bullet and numbered lists (nesting allowed), `- [ ]` / `- [x]` task lists
- `> blockquotes`, fenced code blocks with a language, `---` rules

**Preserved but read-only** — Lore keeps these byte-for-byte and renders them,
but a reader cannot edit them in place. Use them when the content needs them, not
by default: tables, images `![](…)`, footnotes, raw HTML, math (`$$`),
Obsidian callouts (`> [!note]`), `:::` directives.

Write the body as clean, standard Markdown: blank line between blocks, `-` for
bullets, fenced (not indented) code, ATX (`##`) headings, LF line endings.

## 5. Per type

### `note` — anything written

```markdown
---
title: Why local-first software matters
type: note
created: 2026-09-21T09:00:00.000Z
updated: 2026-09-21T09:00:00.000Z
tags: [architecture, local-first]
summary: Ownership, offline access and longevity are the reasons to keep data on-device first and sync second.
related:
    - '[[crdts-explained]]'
---

Local-first software treats the copy on your device as the primary one…

## Seven ideals

1. Fast — no spinners waiting on a server.
2. Multi-device.
```

### `link` — a web page, with your notes on it

`url` is required. `description` is the page's own blurb; `summary` and
`points` are yours. The body holds notes about the link, not a copy of the page.

```markdown
---
title: How Linear builds product
type: link
url: https://linear.app/blog/how-linear-builds-product
created: 2026-08-30T10:12:04.000Z
updated: 2026-08-30T10:12:04.000Z
tags: [product, research]
inbox: true
description: A look inside Linear's product development process.
summary: Linear ships with small teams, a strong written culture and few meetings.
points:
    - Specs are short and written by the person building
    - Quality is a feature, not a phase
---

Worth rereading before planning next quarter.
```

### `task` — something to do

Prose first, then the checklist as the **last** thing in the body. Each
`- [ ]` line is a subtask; Lore draws progress from them. Keep checkbox lines
flat and one line each.

```markdown
---
title: Ship the 1.15 release
type: task
created: 2026-09-21T09:00:00.000Z
updated: 2026-09-21T09:00:00.000Z
tags: [release]
today: true
due: 2026-09-26
priority: high
status: doing
---

Cut the release once the backlinks work has landed.

- [x] Merge backlinks PR
- [ ] Update CHANGELOG
- [ ] Tag and build the .dmg
```

A finished task: `done: true`, `completed: <datetime>`, and `status: done`.

### `code` — a snippet

The body is the **raw code with no fence**. Put what it does in `summary`.

```markdown
---
title: useDebounce — React hook
type: code
created: 2026-09-20T09:00:00.000Z
updated: 2026-09-20T09:00:00.000Z
tags: [react, tools]
summary: Debounces a fast-changing value — handy for search inputs.
---

export function useDebounce(value, ms = 300) {
const [debounced, setDebounced] = useState(value);
useEffect(() => {
const timer = setTimeout(() => setDebounced(value), ms);
return () => clearTimeout(timer);
}, [value, ms]);
return debounced;
}
```

### `image`

`image` holds a URL or a vault-relative `attachments/<file>` path (only if that
file really exists there). The body is an optional caption or notes.

## 6. Checklist before writing a file

- [ ] Frontmatter is the first line of the file, fenced by `---`, valid YAML.
- [ ] `type` is one of the five values; `url` present iff `type: link`.
- [ ] Timestamps are ISO 8601 with `Z`; `due` is `YYYY-MM-DD`.
- [ ] No `false` flags, no `priority: normal`, no `collectionId`, no `source`.
- [ ] Every `related` entry is a quoted `'[[stem]]'` matching a real or intended filename.
- [ ] Filename is the slugged title, unique in its folder, ending in `.md`.
- [ ] Body does not repeat the title as `# H1`; tasks end with their checklist;
      code bodies are unfenced.
- [ ] If you generated many files at once, `id`s (if set) are unique and
      cross-file `related` stems match the filenames you actually wrote.
