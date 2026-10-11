// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Item } from '../../store/types';

import { provideAi } from '../../ai';
import { FakeAi } from '../../ai/fakeAi';
import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { SummarySuggestion } from './SummarySuggestion';

const NOTE: Item = {
    createdAt: '2026-09-21T10:00:00.000Z',
    flags: {},
    id: 'bread',
    related: [],
    tags: ['baking'],
    title: 'Bread log',
    type: 'note',
    updatedAt: '2026-09-21T10:00:00.000Z',
};

let ai: FakeAi;
const updateItem = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
    ai = new FakeAi();
    ai.proposal = {
        points: ['78% hydration.'],
        summary: 'A Sunday bake.',
        tags: ['sourdough', 'oven'],
    };
    provideAi(ai);
    updateItem.mockClear();
    useStore.setState({ prefs: { ...DEFAULT_PREFS, aiBackend: 'anthropic' }, updateItem });
});

afterEach(() => {
    cleanup();
    provideAi(null);
});

describe('SummarySuggestion', () => {
    it('offers nothing while no model is chosen', () => {
        useStore.setState({ prefs: DEFAULT_PREFS });

        const { container } = render(<SummarySuggestion item={NOTE} />);

        expect(container.innerHTML).toBe('');
    });

    it('writes nothing until the proposal is accepted, and leaves off a tag clicked away', async () => {
        render(<SummarySuggestion item={NOTE} />);
        fireEvent.click(screen.getByRole('button', { name: 'Summarize' }));

        expect(await screen.findByText('A Sunday bake.')).toBeTruthy();
        expect(ai.enriched).toEqual([{ itemId: 'bread', want: ['summary', 'tags'] }]);
        expect(updateItem).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: '#oven' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save to note' }));

        expect(updateItem).toHaveBeenCalledWith('bread', {
            points: ['78% hydration.'],
            summary: 'A Sunday bake.',
            tags: ['baking', 'sourdough'],
        });
    });

    it('discards a proposal without touching the note', async () => {
        render(<SummarySuggestion item={NOTE} />);
        fireEvent.click(screen.getByRole('button', { name: 'Summarize' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));

        expect(updateItem).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Summarize' })).toBeTruthy();
    });

    it('says why when the model fails, and can be asked again', async () => {
        const refusal = Promise.reject(new Error('Add an Anthropic API key in Settings.'));

        refusal.catch(() => undefined);
        ai.proposal = refusal;
        render(<SummarySuggestion item={NOTE} />);
        fireEvent.click(screen.getByRole('button', { name: 'Summarize' }));

        expect((await screen.findByRole('alert')).textContent).toBe(
            'Add an Anthropic API key in Settings.',
        );
        expect(screen.getByRole('button', { name: 'Summarize' })).toBeTruthy();
    });
});
