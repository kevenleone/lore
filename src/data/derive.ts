// Fields that are computed from an item's stored content rather than persisted
// alongside it. Every repository runs these on read, so the rule "`snippet` and
// `domain` are derived, never written" holds no matter where the data lives.

import type { Item, SubtaskCount } from '../store/types';

import { parseSubtasks, stripSubtasks } from '../lib/subtasks';
import { firstPlainLine } from './plainText';

const SNIPPET_MAX = 200;

/** Best-effort hostname, mirroring `hostOf` in lib/captureActions. */
export function deriveDomain(url: string | undefined): string | undefined {
    if (!url) return undefined;
    try {
        return new URL(url).hostname.replace(/^www\./, '') || undefined;
    } catch {
        return undefined;
    }
}

/**
 * The item's own words, above any checklist. `snippet` answers "something to
 * show in a list row, whatever it takes" and falls back to a subtask count when
 * there is no prose; a board card draws the tally separately, so it needs the
 * question answered strictly: the prose, or nothing.
 */
export function deriveProse(body: string | undefined): string | undefined {
    const prose = stripSubtasks(body);
    return prose ? firstPlainLine(prose) || undefined : undefined;
}

/**
 * The one-line preview the list pane shows. A link with no notes of its own
 * falls back to what the page says about itself, then the URL.
 */
export function deriveSnippet(
    item: Pick<Item, 'body' | 'description' | 'type' | 'url'>,
): string | undefined {
    const body = item.body?.trim();
    if (body) {
        // A task's body may open with its checklist. Previewing that verbatim put
        // raw `- [ ]` markers in the list, so the prose wins and the checklist
        // falls back to a count.
        const prose = stripSubtasks(body);
        if (prose) {
            const line = firstPlainLine(prose);
            if (line) return line.slice(0, SNIPPET_MAX);
        }
        const subtasks = parseSubtasks(body);
        if (subtasks.length) {
            const done = subtasks.filter((t) => t.done).length;
            return `${done}/${subtasks.length} subtasks · ${subtasks[0].text}`.slice(
                0,
                SNIPPET_MAX,
            );
        }
        return firstPlainLine(body).slice(0, SNIPPET_MAX) || undefined;
    }
    if (item.type === 'link') return item.description?.trim() || item.url || undefined;
    return undefined;
}

/**
 * The checklist tally a board card draws its progress bar from. Derived rather
 * than stored for the same reason `snippet` is: the checklist lives in the body
 * as plain `- [ ]` Markdown, and a count beside it would be a second copy free
 * to disagree with the first.
 */
export function deriveSubtaskCounts(body: string | undefined): SubtaskCount | undefined {
    const subtasks = parseSubtasks(body);
    if (subtasks.length === 0) return undefined;
    return { done: subtasks.filter((s) => s.done).length, total: subtasks.length };
}

/**
 * Stamps the derived fields onto a stored item. Callers pass the record as it
 * came out of storage; `domain` is only recomputed when it wasn't stored, so
 * existing rows keep whatever they already had.
 */
export function withDerived(item: Item): Item {
    return {
        ...item,
        domain: item.domain ?? deriveDomain(item.url),
        prose: deriveProse(item.body),
        snippet: deriveSnippet(item),
        subtasks: deriveSubtaskCounts(item.body),
    };
}

/**
 * Strips the body for list responses. The derived fields stay: they are what a
 * list row and a board card are drawn from. `listItems()` is re-run after every
 * mutation, so shipping every body through it would mean serializing the whole
 * vault on each keystroke-triggered save; `getItem()` is the only method that
 * returns one. Establishing that contract here keeps the eventual move to the
 * file-backed store a transport swap rather than a UI change.
 */
export function withoutBody(item: Item): Item {
    const { body: _body, ...rest } = item;
    return rest;
}
