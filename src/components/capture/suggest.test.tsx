// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiEnrichment } from '../../store/types';

import { provideAi } from '../../ai';
import { FakeAi } from '../../ai/fakeAi';

const saveCapture = vi.fn().mockResolvedValue(undefined);

vi.mock('../../lib/captureActions', () => ({
    hideCapture: vi.fn(),
    hostOf: (url: string) => url,
    saveCapture: (...args: unknown[]) => saveCapture(...args),
}));

import { CommandBar } from './CommandBar';

const SELECTION = { backend: 'claude-cli' };
const THOUGHT = 'Autolyse the dough for an hour before adding salt';

let ai: FakeAi;

beforeEach(() => {
    vi.useFakeTimers();
    ai = new FakeAi();
    provideAi(ai);
    saveCapture.mockClear();
});

afterEach(() => {
    cleanup();
    provideAi(null);
    vi.useRealTimers();
});

async function type(text: string): Promise<HTMLElement> {
    const input = screen.getByPlaceholderText(/Capture a link/);

    fireEvent.change(input, { target: { value: text } });
    await act(() => vi.advanceTimersByTimeAsync(1000));

    return input;
}

describe('tag suggestions in the command bar', () => {
    it('sends what is typed nowhere unless suggestions are on', async () => {
        render(<CommandBar collectionId={null} defaultType="auto" suggest={null} />);
        await type(THOUGHT);

        expect(ai.enriched).toHaveLength(0);
    });

    it('saves at once when the model has not answered yet', async () => {
        ai.proposal = new Promise<AiEnrichment>(() => undefined);
        render(<CommandBar collectionId={null} defaultType="auto" suggest={SELECTION} />);

        fireEvent.keyDown(await type(THOUGHT), { key: 'Enter' });
        await act(() => vi.advanceTimersByTimeAsync(0));

        expect(ai.enriched).toEqual([{ text: THOUGHT, want: ['tags'] }]);
        expect(saveCapture).toHaveBeenCalledTimes(1);
        expect(saveCapture.mock.calls[0][0]).toMatchObject({ tags: [] });
    });

    it('saves the suggested tags, minus any clicked away', async () => {
        ai.proposal = { tags: ['baking', 'sourdough'] };
        render(<CommandBar collectionId={null} defaultType="auto" suggest={SELECTION} />);

        const input = await type(THOUGHT);

        fireEvent.click(screen.getByRole('button', { name: 'Remove tag sourdough' }));
        fireEvent.keyDown(input, { key: 'Enter' });
        await act(() => vi.advanceTimersByTimeAsync(0));

        expect(saveCapture.mock.calls[0][0]).toMatchObject({ tags: ['baking'] });
    });

    it('does not ask about a few characters', async () => {
        render(<CommandBar collectionId={null} defaultType="auto" suggest={SELECTION} />);
        await type('milk');

        expect(ai.enriched).toHaveLength(0);
    });
});
