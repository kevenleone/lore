// @vitest-environment jsdom

// A note's summary and its related links come out of the file's own
// frontmatter — the Properties panel edits the links by hand, and nothing in
// Lore writes either field. Crediting them to an AI was the design's copy
// surviving into a build that has no such AI, so these assert the labels stay
// honest until something actually generates them.

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Item } from '../../store/types';

import { AiSummaryCard } from './AiSummaryCard';
import { RelatedCards } from './RelatedCards';

afterEach(cleanup);

const item = (over: Partial<Item> = {}): Item => ({
    createdAt: '2026-01-01T00:00:00.000Z',
    flags: {},
    id: 'i1',
    related: [],
    tags: [],
    title: 'A note',
    type: 'note',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
});

describe('the summary card', () => {
    it('says where the text came from, not that it was generated', () => {
        render(<AiSummaryCard points={[]} showPoints={false} summary="A short abstract." />);

        expect(screen.getByText('from the file')).toBeTruthy();
        expect(screen.queryByText('auto-generated')).toBeNull();
    });
});

describe('the related section', () => {
    it('does not credit the reader’s own links to an AI', () => {
        render(<RelatedCards related={[item({ id: 'i2', title: 'Another note' })]} />);

        expect(screen.getByText('Another note')).toBeTruthy();
        expect(screen.queryByText(/surfaced by AI/i)).toBeNull();
    });
});
