import { describe, expect, it } from 'vitest';

import type { Template } from '../store/types';

import { BUILTIN_TEMPLATES } from './builtinTemplates';
import { applyTemplate, availableBuiltins, expand, findTemplate } from './templates';

const NOON = new Date(2026, 8, 23, 14, 30);

const template = (over: Partial<Template> = {}): Template => ({
    body: '',
    name: 'Meeting',
    tags: [],
    type: 'note',
    ...over,
});

describe('expand', () => {
    it('writes the day in the same shape a daily note is named', () => {
        expect(expand('{{date}}', '', NOON)).toBe('2026-09-23');
    });

    it('writes the time', () => {
        expect(expand('Started {{time}}', '', NOON)).toMatch(/^Started \d{2}:\d{2}/);
    });

    it('writes the title wherever it is asked for', () => {
        expect(expand('# {{title}}\n\n{{title}} notes', 'Standup', NOON)).toBe(
            '# Standup\n\nStandup notes',
        );
    });

    it('leaves an unknown placeholder alone rather than eating it', () => {
        expect(expand('{{weather}}', 'x', NOON)).toBe('{{weather}}');
    });

    it('leaves {{title}} standing when there is no title to put there', () => {
        expect(expand('{{title}}', '', NOON)).toBe('{{title}}');
    });
});

describe('applyTemplate', () => {
    it('carries the frontmatter onto the new item', () => {
        const item = applyTemplate(
            template({ collectionId: 'Work', tags: ['meeting'], type: 'task' }),
            { now: NOON },
        );

        expect(item.type).toBe('task');
        expect(item.tags).toEqual(['meeting']);
        expect(item.collectionId).toBe('Work');
    });

    it('names the item after the template when it suggests no title', () => {
        expect(applyTemplate(template(), { now: NOON }).title).toBe('Meeting');
    });

    it('expands the placeholders in the title the template does suggest', () => {
        expect(applyTemplate(template({ title: 'Standup {{date}}' }), { now: NOON }).title).toBe(
            'Standup 2026-09-23',
        );
    });

    it('lets the caller name it instead, which is what the daily note does', () => {
        const item = applyTemplate(template({ body: '# {{title}}', title: 'Standup' }), {
            now: NOON,
            title: '2026-09-23',
        });

        expect(item.title).toBe('2026-09-23');
        expect(item.body).toBe('# 2026-09-23');
    });
});

describe('Lore’s own templates', () => {
    it('are offered when the vault has none', () => {
        expect(availableBuiltins([]).map((template) => template.name)).toEqual(
            BUILTIN_TEMPLATES.map((template) => template.name),
        );
    });

    it('step aside for a vault file of the same name', () => {
        const mine = template({ body: 'mine', name: 'Daily' });

        expect(availableBuiltins([mine]).some((entry) => entry.name === 'Daily')).toBe(false);
    });

    it('file nowhere, since a built-in cannot know a vault’s folders', () => {
        expect(BUILTIN_TEMPLATES.every((entry) => entry.collectionId === undefined)).toBe(true);
    });

    it('are each named once', () => {
        const names = BUILTIN_TEMPLATES.map((entry) => entry.name);

        expect(new Set(names).size).toBe(names.length);
    });
});

describe('findTemplate', () => {
    it('prefers the vault’s own over Lore’s', () => {
        const mine = template({ body: 'mine', name: 'Daily' });

        expect(findTemplate([mine], 'Daily')?.body).toBe('mine');
    });

    it('falls back to Lore’s', () => {
        expect(findTemplate([], 'Daily')?.name).toBe('Daily');
    });

    it('answers nothing for a name neither has', () => {
        expect(findTemplate([], 'Nope')).toBeNull();
    });
});
