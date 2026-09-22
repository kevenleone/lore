// A task's checklist, stored as GitHub-flavoured Markdown in the item's body
// rather than in frontmatter.
//
// That is the whole point: `- [ ] thing` is what a checklist looks like in
// Obsidian, in a diff, and in `cat`. A frontmatter array would be Lore-only,
// and the body is already "everything below the frontmatter".
//
// The description is the prose above the first checkbox; the checklist is the
// run of checkbox lines at the end. `split` and `join` are inverses.

export interface Subtask {
    done: boolean;
    text: string;
}

/** Matches a checkbox line with any of the list markers Markdown allows. */
const CHECKBOX = /^\s*[-*+]\s+\[([ xX])\]\s?(.*)$/;

/**
 * A renamed subtask, or — when the new text is empty — the list without it.
 * Emptying is the delete: a checklist line with no text is not a subtask.
 */
export function editSubtask(subtasks: readonly Subtask[], index: number, text: string): Subtask[] {
    const trimmed = text.trim();

    if (!trimmed) {
        return subtasks.filter((_, i) => i !== index);
    }

    return subtasks.map((subtask, i) => (i === index ? { ...subtask, text: trimmed } : subtask));
}

/** Description + checklist, in that order, with a blank line between them. */
export function joinBody(description: string, subtasks: readonly Subtask[]): string {
    const list = serializeSubtasks(subtasks);

    return [description.trim(), list].filter(Boolean).join('\n\n');
}

export function parseSubtasks(body: string | undefined): Subtask[] {
    if (!body) {
        return [];
    }

    const out: Subtask[] = [];

    for (const line of body.split('\n')) {
        const match = CHECKBOX.exec(line);

        if (match) {
            out.push({ done: match[1] !== ' ', text: match[2].trim() });
        }
    }

    return out;
}

export function serializeSubtasks(subtasks: readonly Subtask[]): string {
    return subtasks
        .filter((subtask) => subtask.text.trim())
        .map((subtask) => `- [${subtask.done ? 'x' : ' '}] ${subtask.text.trim()}`)
        .join('\n');
}

/** The prose part of a body: everything that is not a checkbox line. */
export function stripSubtasks(body: string | undefined): string {
    if (!body) {
        return '';
    }

    return body
        .split('\n')
        .filter((line) => !CHECKBOX.test(line))
        .join('\n')
        .trim();
}

export function toggleSubtask(subtasks: readonly Subtask[], index: number): Subtask[] {
    return subtasks.map((subtask, i) => (i === index ? { ...subtask, done: !subtask.done } : subtask));
}
