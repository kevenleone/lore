// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Item } from '../../store/types';

import { provideAi } from '../../ai';
import { FakeAi } from '../../ai/fakeAi';
import { DEFAULT_PREFS } from '../../store/types';
import { useStore } from '../../store/useStore';
import { AskLoreChat } from './AskLoreChat';

const OVEN: Item = {
    createdAt: '2026-09-21T10:00:00.000Z',
    flags: {},
    id: 'oven',
    path: 'Kitchen/oven-notes.md',
    related: [],
    tags: [],
    title: 'Oven notes',
    type: 'note',
    updatedAt: '2026-09-21T10:00:00.000Z',
};

let ai: FakeAi;

beforeEach(() => {
    ai = new FakeAi();
    provideAi(ai);
    useStore.setState({
        chat: [],
        chatBusy: false,
        items: [OVEN],
        prefs: { ...DEFAULT_PREFS, aiBackend: 'claude-cli' },
        selectedId: null,
    });
});

afterEach(() => {
    cleanup();
    provideAi(null);
});

function ask(question: string): void {
    fireEvent.change(screen.getByPlaceholderText(/Ask about anything/), {
        target: { value: question },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
}

describe('AskLoreChat', () => {
    it('sends the user to Settings while no model is chosen', () => {
        useStore.setState({ prefs: DEFAULT_PREFS });
        render(<AskLoreChat />);

        expect(
            (screen.getByPlaceholderText(/Ask about anything/) as HTMLInputElement).disabled,
        ).toBe(true);

        fireEvent.click(screen.getByRole('button', { name: 'Choose a model' }));

        expect(useStore.getState()).toMatchObject({ settingsOpen: true, settingsPane: 'capture' });
    });

    it('shows what the model is doing, then the answer with its citation as a link', async () => {
        render(<AskLoreChat />);
        ask('what about the oven?');

        act(() => ai.activity('Searching “oven”'));
        expect(screen.getByText('Searching “oven”')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Stop' })).toBeTruthy();

        await act(async () => {
            ai.delta('It runs hot, see [[oven-notes]] and [[never-written]].');
            ai.done([{ itemId: 'oven' }]);
        });

        // Once in the sentence, once as a Sources chip.
        const links = screen.getAllByRole('button', { name: 'Oven notes' });

        expect(links).toHaveLength(2);
        expect(screen.getByText(/\[\[never-written\]\]/)).toBeTruthy();
        expect(screen.queryByText('Searching “oven”')).toBeNull();

        fireEvent.click(links[0]);

        expect(useStore.getState().selectedId).toBe('oven');
    });

    it('renders the answer as Markdown, citations included', async () => {
        const { container } = render(<AskLoreChat />);

        ask('summarize');

        await act(async () => {
            ai.delta('**Kitchen**\n\n- The oven runs hot [[oven-notes]].\n- Use `230C`.');
            ai.done();
        });

        expect(container.querySelector('strong')?.textContent).toBe('Kitchen');
        expect(container.querySelectorAll('li')).toHaveLength(2);
        expect(container.querySelector('code')?.textContent).toBe('230C');
        expect(container.textContent).not.toContain('**');
        expect(container.querySelector('li')?.querySelector('button')?.textContent).toBe(
            'Oven notes',
        );
    });

    it('says why an answer failed', async () => {
        render(<AskLoreChat />);
        ask('anything');

        await act(async () => ai.fail('Claude Code is not logged in.'));

        expect(screen.getByRole('alert').textContent).toBe('Claude Code is not logged in.');
        expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy();
    });
});
