// Turning a template into the item it describes.
//
// The placeholders are deliberately few. A template is a Markdown file the user
// maintains by hand, and a syntax with more than a handful of names is one they
// have to look up every time — anything a placeholder cannot say is better
// typed into the note once it is open.

import type { NewItem } from '../data/repository';
import type { Template } from '../store/types';

import { dayKey } from '../store/tasks';
import { BUILTIN_TEMPLATES } from './builtinTemplates';

export function applyTemplate(
    template: Template,
    options: { now?: Date; title?: string } = {},
): NewItem {
    const now = options.now ?? new Date();
    // The caller's title wins — today's note is named for the day, whatever the
    // template says. Otherwise the template's own, then its filename: a new item
    // has to be findable in the list the moment it is written, and "Untitled"
    // is not.
    const title = options.title ?? expand(template.title ?? template.name, template.name, now);

    return {
        body: expand(template.body, title, now),
        collectionId: template.collectionId,
        flags: {},
        related: [],
        tags: template.tags,
        title,
        type: template.type,
    };
}

/**
 * The built-ins a vault has not replaced. Writing a `.lore/templates/Daily.md`
 * is how you take one over: the vault's own always wins, so a template that
 * has been made your own does not also sit in the menu in its original form.
 */
export function availableBuiltins(vault: readonly Template[]): Template[] {
    return BUILTIN_TEMPLATES.filter(
        (builtin) => !vault.some((template) => template.name === builtin.name),
    );
}

/**
 * `{{date}}`, `{{time}}` and `{{title}}`, in both the body and the title. An
 * unknown placeholder is left exactly as written rather than blanked, so a
 * typo is visible in the note instead of silently eating text.
 */
export function expand(text: string, title: string, now: Date): string {
    return text.replace(/\{\{(date|time|title)\}\}/g, (whole, name: string) => {
        if (name === 'date') {
            return dayKey(now);
        }

        if (name === 'time') {
            return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return title || whole;
    });
}

/** Looks a template up by name, the vault's own ahead of Lore's. */
export function findTemplate(vault: readonly Template[], name: string): null | Template {
    return (
        vault.find((template) => template.name === name) ??
        BUILTIN_TEMPLATES.find((template) => template.name === name) ??
        null
    );
}
