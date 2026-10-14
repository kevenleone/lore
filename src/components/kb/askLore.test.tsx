// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    snippet: 'Runs hot; drop to 230C.',
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
        chatItemId: null,
        chatOpen: true,
        chatThreadId: null,
        chatThreads: [],
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

        expect(useStore.getState()).toMatchObject({ settingsOpen: true, settingsPane: 'ai' });
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

        // Beside the chat, not instead of it.
        expect(useStore.getState()).toMatchObject({
            chatItemId: 'oven',
            chatOpen: true,
            selectedId: 'oven',
        });
    });

    it('previews a cited item on hover, and puts the preview away on leaving', async () => {
        render(<AskLoreChat />);
        ask('what about the oven?');

        await act(async () => {
            ai.delta('See [[oven-notes]].');
            ai.done();
        });

        const [link] = screen.getAllByRole('button', { name: 'Oven notes' });

        expect(screen.queryByRole('tooltip')).toBeNull();

        fireEvent.mouseEnter(link);

        const card = await screen.findByRole('tooltip');

        expect(card.textContent).toContain('Oven notes');
        expect(card.textContent).toContain('Runs hot; drop to 230C.');

        fireEvent.mouseLeave(link);

        await waitFor(() => expect(screen.queryByRole('tooltip')).toBeNull());
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

    it('offers the actions that fit each message', async () => {
        render(<AskLoreChat />);
        ask('first');

        // Nothing to act on while the answer is still being written.
        expect(screen.queryByRole('button', { name: 'Save as a note' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Edit and ask again' })).toBeNull();

        await act(async () => {
            ai.delta('one');
            ai.done();
        });

        ask('second');

        await act(async () => {
            ai.delta('two');
            ai.done();
        });

        expect(screen.getAllByRole('button', { name: 'Copy' })).toHaveLength(4);
        expect(screen.getAllByRole('button', { name: 'Save as a note' })).toHaveLength(2);
        // Only the last answer can be asked for again.
        expect(screen.getAllByRole('button', { name: 'Answer again' })).toHaveLength(1);
    });

    it('edits a question in place and asks it again', async () => {
        render(<AskLoreChat />);
        ask('what abuot the oven?');

        await act(async () => {
            ai.delta('Unclear.');
            ai.done();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Edit and ask again' }));

        const field = screen.getByLabelText('Edit your question');

        fireEvent.change(field, { target: { value: 'what about the oven?' } });
        fireEvent.keyDown(field, { key: 'Enter' });

        await act(async () => {
            ai.delta('It runs hot.');
            ai.done();
        });

        expect(ai.asked[1].messages).toEqual([{ role: 'user', text: 'what about the oven?' }]);
        expect(screen.queryByText('Unclear.')).toBeNull();
        expect(screen.getByText('It runs hot.')).toBeTruthy();
    });

    it('lists saved conversations, reopens one, and starts a new one', async () => {
        render(<AskLoreChat />);
        ask('what about the oven?');

        await act(async () => {
            ai.delta('It runs hot.');
            ai.done();
        });

        fireEvent.click(screen.getByRole('button', { name: 'New conversation' }));

        expect(screen.queryByText('It runs hot.')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Conversations' }));
        fireEvent.click(
            within(screen.getByRole('dialog', { name: 'Conversations' })).getByText(
                'what about the oven?',
            ),
        );

        expect(await screen.findByText('It runs hot.')).toBeTruthy();
        expect(screen.queryByRole('dialog', { name: 'Conversations' })).toBeNull();
    });

    it('renames a conversation from the history, and Escape leaves the name alone', async () => {
        render(<AskLoreChat />);
        ask('what about the oven?');

        await act(async () => {
            ai.delta('It runs hot.');
            ai.done();
        });

        fireEvent.click(screen.getByRole('button', { name: 'Conversations' }));
        fireEvent.click(screen.getByRole('button', { name: 'Rename “what about the oven?”' }));

        const field = screen.getByLabelText('Conversation name');

        fireEvent.change(field, { target: { value: 'Kitchen' } });
        fireEvent.keyDown(field, { key: 'Escape' });

        expect(screen.getByRole('dialog', { name: 'Conversations' })).toBeTruthy();
        expect(screen.getByText('what about the oven?', { selector: 'span' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Rename “what about the oven?”' }));
        fireEvent.change(screen.getByLabelText('Conversation name'), {
            target: { value: 'Kitchen' },
        });
        fireEvent.keyDown(screen.getByLabelText('Conversation name'), { key: 'Enter' });

        expect(await screen.findByText('Kitchen')).toBeTruthy();
        expect(useStore.getState().chatThreads[0].title).toBe('Kitchen');
    });

    it('shows the sources an answer cites when its saved ids no longer resolve', async () => {
        useStore.setState({
            chat: [
                { id: 'u', role: 'user', text: 'oven?' },
                {
                    id: 'a',
                    role: 'ai',
                    sources: [{ itemId: 'gone-after-reindex' }],
                    text: 'It runs hot. [[oven-notes]]',
                },
            ],
        });
        render(<AskLoreChat />);

        // Once in the sentence, once as the Sources chip read from the citation.
        expect(screen.getAllByRole('button', { name: 'Oven notes' })).toHaveLength(2);
    });

    it('says why an answer failed', async () => {
        render(<AskLoreChat />);
        ask('anything');

        await act(async () => ai.fail('Claude Code is not logged in.'));

        expect(screen.getByRole('alert').textContent).toBe('Claude Code is not logged in.');
        expect(screen.getByRole('button', { name: 'Send' })).toBeTruthy();
    });
});
