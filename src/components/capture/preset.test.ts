import { describe, expect, it } from 'vitest';

import type { NewItem } from '../../data/repository';

import { applyCapturePreset } from './preset';

const task: NewItem = { flags: {}, related: [], tags: [], title: 'A task', type: 'task' };

describe('applyCapturePreset', () => {
    it('files a task into the column it was started from', () => {
        const preset = { collectionId: 'c1', status: 'doing', type: 'task' as const };

        expect(applyCapturePreset(task, preset)).toEqual({ ...task, status: 'doing' });
    });

    it('hands a task to the completing column already done', () => {
        const preset = { collectionId: 'c1', done: true, status: 'done', type: 'task' as const };

        expect(applyCapturePreset(task, preset)).toEqual({
            ...task,
            flags: { done: true },
            status: 'done',
        });
    });

    it('leaves everything that is not a task alone', () => {
        const link: NewItem = { ...task, title: 'A link', type: 'link' };
        const preset = { collectionId: 'c1', done: true, status: 'done', type: 'task' as const };

        expect(applyCapturePreset(link, preset)).toBe(link);
    });

    it('is a no-op with no preset, or one carrying no column', () => {
        expect(applyCapturePreset(task, null)).toBe(task);
        expect(applyCapturePreset(task, { collectionId: null, type: 'task' })).toBe(task);
    });
});
