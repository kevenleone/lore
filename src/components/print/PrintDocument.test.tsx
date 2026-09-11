// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Item } from '../../store/types';

import { PrintDocument } from './PrintDocument';

const ITEM: Item = {
    body: '## A heading\n\nSome prose.\n',
    createdAt: '2026-01-02T10:00:00.000Z',
    domain: 'linear.app',
    flags: {},
    id: 'i1',
    related: [],
    tags: ['product', 'research'],
    title: 'How Linear builds product',
    type: 'link',
    updatedAt: '2026-01-02T10:00:00.000Z',
    url: 'https://linear.app/blog',
};

afterEach(cleanup);

describe('PrintDocument', () => {
    it('heads the page with the type, collection, title and tags', () => {
        render(<PrintDocument collectionName="Reading List" item={ITEM} />);

        expect(screen.getByText('Link')).toBeTruthy();
        expect(screen.getByText('Reading List')).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'How Linear builds product' })).toBeTruthy();
        expect(screen.getByText('product')).toBeTruthy();
        expect(screen.getByText('research')).toBeTruthy();
    });

    it('renders the body through DocumentView', () => {
        render(<PrintDocument item={ITEM} />);

        expect(screen.getByRole('heading', { name: 'A heading' })).toBeTruthy();
        expect(screen.getByText('Some prose.')).toBeTruthy();
    });

    it('dates the page absolutely — a PDF outlives the day it was written', () => {
        render(<PrintDocument item={ITEM} />);

        // Never "Today, 10:00": the year has to be on the page.
        expect(screen.getByText(/linear\.app · .*2026/)).toBeTruthy();
    });

    it('omits the collection line for an item that sits at the vault root', () => {
        render(<PrintDocument item={ITEM} />);

        expect(screen.queryByText('Reading List')).toBeNull();
    });
});
