---
name: log-work
description: Log what was done in this coding session as a note in the user's Lore vault — the ticket, the goal, what changed, whether it worked, decisions, commits and follow-ups — in one standard shape. Use when the user runs /log-work or asks to log, record or write up the work of this session for Lore.
---

# Log this session's work into Lore

Write one note that a reader can open in a month and know what happened in this
session: what was asked, what was done, whether it worked, and what is left. The
note goes into a Lore vault, which is a plain folder of Markdown files — you
write the file, and Lore picks it up live.

## 1. Find where this repository logs to

The setting lives in `~/.config/lore/log-work.json`, keyed by the repository's
root (`git rev-parse --show-toplevel`; the working directory if it is not a git
repository):

```json
{
    "repositories": {
        "/Users/you/code/portal-web": { "collection": "Work Logs", "vault": "/Users/you/Notes" }
    }
}
```

If this repository has an entry and its vault folder still exists, use it and
go to step 2 without asking.

Otherwise this is the first log for this repository. Ask the user, in one go:

1. **Which vault.** Offer what you can find: run `lore doctor` (or `lore-dev` /
   `lore-agent doctor`, whichever is installed) — its first line names the
   default vault. Any other folder of Markdown is a vault too. Use an absolute
   path; expand `~`.
2. **Which collection.** List the vault's top-level folders (skip dot-folders
   and `attachments/`) and offer them, plus a new one — `Work Logs` is a good
   default. A collection is just a folder; a new name creates it.

Then save the answer into the file, creating it and `~/.config/lore/` if they do
not exist. Read the file first and keep every other repository and every key
you do not recognise exactly as it was. Tell the user where the setting lives,
so they can change it by hand.

## 2. Gather the facts

Collect these from the session and from git — never invent one. If something is
unknown, leave it out.

| Fact          | Where it comes from                                                                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `ticket`      | What the user said (`APP-123`, `#128`, a Jira or GitHub link), else the branch name (`fix/APP-123-…`). Ask if neither has one; none is fine. |
| `repository`  | The basename of the repository root.                                                                                                         |
| `branch`      | `git branch --show-current`.                                                                                                                 |
| `outcome`     | One of `resolved`, `partial`, `blocked`, `investigating` — your honest reading of the session, not the hoped-for one.                        |
| Commits       | `git log --oneline` for the commits made during this session.                                                                                |
| Files touched | `git diff --stat` against where the session started, plus uncommitted changes (`git status --short`).                                        |
| Tests         | What was run and what it reported. Say plainly if tests failed or were not run.                                                              |
| `duration`    | Only if the session makes it clear (`~1h40m`). Otherwise omit.                                                                               |

Look for earlier logs of the same ticket: search the collection's `.md` files
for a `ticket:` line with the same value, and note their filename stems.

## 3. Write the note

One note per session, in `<vault>/<collection>/`. The filename comes from the
title: lowercase, strip accents and apostrophes, every run of other characters
becomes one `-`, trim `-`, at most 80 characters. If that file already exists,
append `-2`, `-3`, … — never overwrite a file.

Title: `<TICKET>: <what the session was about>` — or just the subject when there
is no ticket. Keep it under ~70 characters.

```markdown
---
title: 'APP-123: Fix duplicate invoices on retry'
type: note
created: 2026-10-26T14:02:00.000Z
updated: 2026-10-26T14:02:00.000Z
tags: [worklog, portal-web, app-123, 'log-work:q4', 'log-work:october']
summary: Retries reused a stale idempotency key, so a timeout could bill twice. The key is now derived per attempt; fixed and covered by a regression test.
points:
    - Root cause in the invoice service's retry wrapper
    - Regression test added; full suite green
related:
    - '[[app-123-reproduce-duplicate-invoices]]'
ticket: APP-123
repository: portal-web
branch: fix/app-123-duplicate-invoices
outcome: resolved
duration: ~1h40m
---

## Goal

What the user asked for, and the problem behind it, in two or three sentences.

## What was done

- The steps that mattered, in order: what was investigated, what was found, what was changed and why.

## Outcome

Resolved, partly resolved, or not — and the evidence: tests run and their result, what was checked by hand.

## Decisions

- Choices made along the way and the reason for each, including approaches tried and dropped.

## Files touched

- `src/billing/retry.ts` — derive the idempotency key per attempt

## Commits

- `a1b2c3d` fix(billing): derive idempotency key per attempt

## Follow-ups

- [ ] Backfill the duplicate invoices created before the fix
```

Rules:

- Frontmatter keys in exactly that order; omit any key you have no value for.
  `created` and `updated` are now, in UTC ISO 8601.
- `tags`: always `worklog`, the repository name, the ticket, and two for
  filtering by period: `log-work:q1` … `log-work:q4` for the quarter and
  `log-work:<month>` with the month's full English name (`log-work:july`), both
  from `created` in the user's local time. All lowercase, no `#`; quote the
  `log-work:` ones, since they contain `:`.
- `summary` is one to three sentences that stand alone. `points` are the two to
  four takeaways.
- `related` holds the earlier logs of the same ticket, each quoted
  (`'[[stem]]'`). Omit the key when there are none.
- Quote any frontmatter string containing `:`, `#`, `[`, `{` or starting with
  `-`, `*`, `&` or `!`.
- Never write a `collection:` key — the folder is the collection — and never a
  `source:` key.
- Do not repeat the title as a `#` heading. Leave out any section with nothing
  true to say. `Follow-ups` is a checklist and is always the last thing.
- Write for a reader who was not there: no "I", no "the user"; name things
  (files, functions, errors) rather than describing them vaguely. Keep secrets,
  tokens and customer data out of it.

## 4. Confirm, then write

Show the user the full note and the path it will be written to. Write it only
when they agree, applying any changes they ask for. Then say where it is, and
that it is already in Lore.
