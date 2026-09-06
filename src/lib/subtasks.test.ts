import { describe, expect, it } from 'vitest';

import {
    joinBody,
    parseSubtasks,
    serializeSubtasks,
    stripSubtasks,
    toggleSubtask,
} from './subtasks';

describe('parseSubtasks', () => {
    it('reads the checkbox lines and leaves the prose alone', () => {
        const body = 'Ship the thing.\n\n- [ ] draft it\n- [x] review it';
        expect(parseSubtasks(body)).toEqual([
            { done: false, text: 'draft it' },
            { done: true, text: 'review it' },
        ]);
    });

    it('accepts every list marker and an uppercase X', () => {
        expect(parseSubtasks('* [X] a\n+ [ ] b\n  - [ ] c')).toHaveLength(3);
        expect(parseSubtasks('* [X] a')[0].done).toBe(true);
    });

    it('is empty for a body with no checklist', () => {
        expect(parseSubtasks('just prose')).toEqual([]);
        expect(parseSubtasks(undefined)).toEqual([]);
    });
});

describe('serializeSubtasks', () => {
    it('round-trips through parseSubtasks', () => {
        const subtasks = [
            { done: false, text: 'draft it' },
            { done: true, text: 'review it' },
        ];
        expect(parseSubtasks(serializeSubtasks(subtasks))).toEqual(subtasks);
    });

    it('drops entries with nothing in them', () => {
        expect(serializeSubtasks([{ done: false, text: '   ' }])).toBe('');
    });
});

describe('stripSubtasks', () => {
    it('leaves only the prose', () => {
        expect(stripSubtasks('Ship it.\n\n- [ ] a\n- [x] b')).toBe('Ship it.');
    });
});

describe('joinBody', () => {
    it('puts the description above the checklist', () => {
        expect(joinBody('Ship it.', [{ done: false, text: 'a' }])).toBe('Ship it.\n\n- [ ] a');
    });

    it('splits back into its two halves', () => {
        const body = joinBody('Ship it.', [{ done: true, text: 'a' }]);
        expect(stripSubtasks(body)).toBe('Ship it.');
        expect(parseSubtasks(body)).toEqual([{ done: true, text: 'a' }]);
    });

    it('omits the blank line when one half is missing', () => {
        expect(joinBody('', [{ done: false, text: 'a' }])).toBe('- [ ] a');
        expect(joinBody('Just prose.', [])).toBe('Just prose.');
    });
});

describe('toggleSubtask', () => {
    it('flips one entry and copies rather than mutates', () => {
        const subtasks = [
            { done: false, text: 'a' },
            { done: false, text: 'b' },
        ];
        const next = toggleSubtask(subtasks, 1);
        expect(next[1].done).toBe(true);
        expect(subtasks[1].done).toBe(false);
    });
});
