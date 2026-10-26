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
        "/Users/you/code/portal-web": {
            "collection": "Work Logs",
            "jira": "https://acme.atlassian.net",
            "vault": "/Users/you/Notes"
        }
    }
}
```

If this repository has an entry and its vault folder still exists, use it and
go to step 2 without asking.

Otherwise this is the first log for this repository. **Always ask the user
which vault and collection to use — never choose either for them,** even when
only one vault turns up. Ask in two steps, because the collections depend on
the vault:

1. **Which vault.** Run `lore vaults --json` (or `lore-dev` / `lore-agent`,
   whichever is on PATH). It lists every folder already used as a vault — the
   one open in Lore, ones opened before, the ones agents are connected to, the
   ones `/log-work` writes to for other repositories, and Lore's default — with
   the vault in use first and `sources` saying why each is listed. Offer the
   ones that `exist`, most likely first, labelled with the path and its
   sources, plus "another folder" for a path the user types. If your question
   tool takes a fixed number of options (often two to four), offer the top
   ones and let "another folder" cover the rest; with a single vault found,
   still ask, offering it and "another folder". If no `lore` command is
   installed, ask for the folder's path. Use an absolute path; expand `~`.
2. **Which collection.** List the chosen vault's top-level folders (skip
   dot-folders and `attachments/`) and offer them, plus a new one — `Work Logs`
   is a good default. A collection is just a folder; a new name creates it.

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
| `url`         | For a Jira ticket, its link: `<site>/browse/<KEY>`. See below. Omit it for anything that is not a Jira ticket.                               |
| `repository`  | The basename of the repository root.                                                                                                         |
| `branch`      | `git branch --show-current`.                                                                                                                 |
| `outcome`     | One of `resolved`, `partial`, `blocked`, `investigating` — your honest reading of the session, not the hoped-for one.                        |
| Commits       | `git log --oneline` for the commits made during this session.                                                                                |
| Files touched | `git diff --stat` against where the session started, plus uncommitted changes (`git status --short`).                                        |
| Tests         | What was run and what it reported. Say plainly if tests failed or were not run.                                                              |
| `duration`    | Only if the session makes it clear (`~1h40m`). Otherwise omit.                                                                               |

**The Jira link.** Take the site from, in order: a Jira link in the session
(`https://acme.atlassian.net/browse/AP-73`, or a `selectedIssue=AP-73` link);
a Jira tool you have (for example the Atlassian MCP's issue lookup, which also
confirms the key exists); the repository's `jira` setting in
`~/.config/lore/log-work.json`. Always write it as
`<site>/browse/<KEY>`. When the site is new, save it as that repository's
`jira` setting, the same way as the vault. When there is a ticket key but no
site anywhere, ask once whether it is a Jira ticket and on which site; if it is
not, leave `url` out and do not ask again for this repository — save
`"jira": null`.

Look for earlier logs of the same ticket: search the collection's `.md` files
for a line `ticket: <value>` (exactly `ticket:`, which the summaries in step 4
never use) and note their filename stems.

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
url: https://acme.atlassian.net/browse/APP-123
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
  `url` is the Jira link, so Lore shows it as the note's URL and offers to
  open and copy it.
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

## 4. Update the weekly and monthly summaries

Every log also lands in two summary notes in the same collection: one for its
week and one for its month. They exist so the user can see every ticket worked
on in a period at a glance, so each session log must appear in both. Use the
log's `created` date in the user's local time to place it.

| Summary | Week                                                                                                                                  | Month                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Period  | ISO week, Monday to Sunday: `2026-W44`                                                                                                | `2026-10`                                                                         |
| Title   | `Weekly summary - 26–30 Oct 2026` — Monday to Friday, or to Sunday if a log falls on the weekend; `29 Sep – 3 Oct 2026` across months | `Monthly summary - October 2026`                                                  |
| Tags    | `worklog`, `'log-work:summary'`, `'log-work:weekly'`, plus each quarter and month tag of the logs in it                               | `worklog`, `'log-work:summary'`, `'log-work:monthly'`, the quarter and month tags |
| File    | `weekly-summary-26-30-oct-2026.md`                                                                                                    | `monthly-summary-october-2026.md`                                                 |

**Find it first.** Search the collection for a file whose frontmatter has both
`log-work-summary: weekly` (or `monthly`) and `period:` with this period. If
there is one, update it; only create a new file when there is none, naming it
from the title as in step 3.

```markdown
---
title: Weekly summary - 26–30 Oct 2026
type: note
created: 2026-10-26T14:02:00.000Z
updated: 2026-10-28T17:40:00.000Z
tags: [worklog, 'log-work:summary', 'log-work:weekly', 'log-work:q4', 'log-work:october']
summary: Two tickets in portal-web across three sessions. AP-73 is resolved and in review; AP-80 is still being investigated.
related:
    - '[[ap-73-reduce-detector-link-clickable-area-on-alert-cards]]'
    - '[[ap-80-trace-slow-alert-list-queries]]'
    - '[[ap-80-add-index-for-alert-list-filter]]'
log-work-summary: weekly
period: 2026-W44
tickets: [AP-73, AP-80]
---

## Overview

- 3 sessions on 2 tickets, in portal-web
- Resolved: AP-73 · Partial: AP-80

## AP-73: Reduce detector link clickable area on alert cards

**Resolved** · portal-web · 1 session · [Jira](https://acme.atlassian.net/browse/AP-73)

The detector link no longer swallows clicks meant for the card; MR !1783 is up for review.

- 26 Oct — [[ap-73-reduce-detector-link-clickable-area-on-alert-cards]] — resolved

## AP-80: Slow alert list on large tenants

**Partial** · portal-web · 2 sessions · [Jira](https://acme.atlassian.net/browse/AP-80)

The slow query is traced to the unindexed status filter; an index is added, but the list is not yet measured on a large tenant.

- 27 Oct — [[ap-80-trace-slow-alert-list-queries]] — investigating
- 28 Oct — [[ap-80-add-index-for-alert-list-filter]] — partial

## Follow-ups

- [ ] Get MR !1783 reviewed and merged into `dev` (AP-73)
- [ ] Measure the alert list on a large tenant (AP-80)
```

The monthly summary has the same shape, with `log-work-summary: monthly`,
`period: 2026-10`, and every log of the month in it.

Rules for a summary:

- One section per ticket, headed `<TICKET>: <subject>`, in the order tickets
  first appeared in the period. Sessions without a ticket go under
  `## Other work`, one line each, before `Follow-ups`.
- Under a ticket's heading, the status line ends in `[Jira](<url>)` when its
  logs have a `url`. A summary has no `url` of its own: it covers many tickets.
- A ticket's status is the `outcome` of its latest session in the period; its
  paragraph says where the ticket stands now, in one or two sentences drawn from
  its logs. List every session as `- <day> <Mon> — [[stem]] — <outcome>`,
  oldest first.
- `related` lists every session log in the period, each quoted, oldest first.
  `tickets` lists every ticket in it. `summary` is one or two sentences on the
  whole period.
- `Overview` counts the sessions, tickets and repositories, and groups the
  tickets by status. Recount it from the logs in `related` — read them — rather
  than adjusting the old numbers.
- `Follow-ups` gathers the open follow-ups of the logs, each ending in its
  ticket. Never uncheck or drop a line the user ticked or wrote.

When updating, change only what this log touches: `updated`, `summary`,
`related`, `tickets`, missing tags, `Overview`, this ticket's section, and
`Follow-ups`. Keep every other key, section and line the user added exactly as
it is. If this log is already listed (a re-run), do not add it twice.

## 5. Confirm, then write

Show the user the full session note and the path it will be written to, and for
each summary its path, whether it will be created or updated, and the sections
that change. Write all three only when they agree, applying any changes they
ask for. Then say where they are, and that they are already in Lore.
