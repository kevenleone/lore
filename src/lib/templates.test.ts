import { describe, expect, it } from 'vitest';

import type { Template } from '../store/types';

import { applyTemplate, expand } from './templates';

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
