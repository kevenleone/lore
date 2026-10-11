import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { provideAi } from '../ai';
import { FakeAi } from '../ai/fakeAi';
import { getRepository, resetRepository } from '../data';
import { DEFAULT_PREFS } from './types';
import { useStore } from './useStore';

let ai: FakeAi;

const chat = () => useStore.getState().chat;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
    ai = new FakeAi();
    provideAi(ai);
    useStore.setState({
        chat: [],
        chatBusy: false,
        prefs: { ...DEFAULT_PREFS, aiBackend: 'claude-cli', aiModel: 'opus' },
    });
});

afterEach(() => provideAi(null));

describe('sendChat', () => {
    it('grows the answer as it arrives and ends with its sources', async () => {
        const turn = useStore.getState().sendChat('  what about the oven?  ');

        expect(chat().map((message) => message.role)).toEqual(['user', 'ai']);
        expect(chat()[1]).toMatchObject({ pending: true, text: '' });
        expect(useStore.getState().chatBusy).toBe(true);

        ai.activity('Searching “oven”');
        expect(chat()[1].activity).toBe('Searching “oven”');

        ai.delta('It runs ');
        ai.delta('hot.');
        expect(chat()[1]).toMatchObject({ activity: undefined, text: 'It runs hot.' });

        ai.done([{ itemId: 'i1' }]);
        await turn;

        expect(chat()[1]).toMatchObject({ pending: false, sources: [{ itemId: 'i1' }] });
        expect(useStore.getState().chatBusy).toBe(false);
        expect(ai.asked[0]).toEqual({
            messages: [{ role: 'user', text: 'what about the oven?' }],
            selection: { backend: 'claude-cli', baseUrl: undefined, model: 'opus' },
        });
    });

    it('sends the conversation so far, without the turns that failed', async () => {
        const first = useStore.getState().sendChat('first');

        ai.fail('Not logged in');
        await first;

        expect(chat()[1]).toMatchObject({ error: 'Not logged in', pending: false });

        const second = useStore.getState().sendChat('second');

        ai.delta('answer');
        ai.done();
        await second;

        const third = useStore.getState().sendChat('third');

        ai.done();
        await third;

        expect(ai.asked[2].messages).toEqual([
            { role: 'user', text: 'first' },
            { role: 'user', text: 'second' },
            { role: 'ai', text: 'answer' },
            { role: 'user', text: 'third' },
        ]);
    });

    it('keeps what had arrived when the user stops it, and calls that no error', async () => {
        const turn = useStore.getState().sendChat('question');

        ai.delta('Half an ans');
        useStore.getState().stopChat();
        await turn;

        expect(chat()[1]).toMatchObject({ error: undefined, pending: false, text: 'Half an ans' });
        expect(useStore.getState().chatBusy).toBe(false);
    });

    it('asks nothing while no model is chosen, or while one is still answering', async () => {
        useStore.setState({ prefs: DEFAULT_PREFS });
        await useStore.getState().sendChat('question');

        expect(ai.asked).toHaveLength(0);
        expect(chat()).toHaveLength(0);

        useStore.setState({ prefs: { ...DEFAULT_PREFS, aiBackend: 'claude-cli' } });
        void useStore.getState().sendChat('one');
        await useStore.getState().sendChat('two');
        await settle();

        expect(ai.asked).toHaveLength(1);
    });
});

describe('an item opened from an answer', () => {
    beforeEach(() => {
        useStore.setState({
            chatItemId: null,
            chatOpen: true,
            openAs: null,
            openId: null,
            prefs: { ...DEFAULT_PREFS, openMode: 'page', viewMode: 'cards' },
        });
    });

    it('opens beside the chat, whatever the open mode is set to', () => {
        useStore.getState().openChatItem('i1');

        expect(useStore.getState()).toMatchObject({
            chatItemId: 'i1',
            chatOpen: true,
            openAs: null,
            openId: null,
            selectedId: 'i1',
        });
    });

    it('keeps a link followed inside that pane in that pane', () => {
        useStore.getState().openChatItem('i1');
        useStore.getState().openLinkedItem('i2');

        expect(useStore.getState()).toMatchObject({ chatItemId: 'i2', chatOpen: true });
    });

    it('closes without closing the chat, and does not come back with it', () => {
        useStore.getState().openChatItem('i1');
        useStore.getState().closeChatItem();

        expect(useStore.getState()).toMatchObject({ chatItemId: null, chatOpen: true });

        useStore.getState().openChatItem('i1');
        useStore.getState().toggleChat();
        useStore.getState().toggleChat();

        expect(useStore.getState()).toMatchObject({ chatItemId: null, chatOpen: true });
    });
});

describe('saved conversations', () => {
    const ask = async (question: string, answer: string) => {
        const turn = useStore.getState().sendChat(question);

        ai.delta(answer);
        ai.done();
        await turn;
    };

    beforeEach(() => {
        resetRepository();
        useStore.setState({ chatItemId: null, chatThreadId: null, chatThreads: [] });
    });

    it('keeps a conversation from its first answer, under the question it opened with', async () => {
        await ask('What about\nthe oven?', 'It runs hot.');

        const [thread] = useStore.getState().chatThreads;
        const saved = await getRepository().getChat?.(thread.id);

        expect(thread.title).toBe('What about the oven?');
        expect(useStore.getState().chatThreadId).toBe(thread.id);
        expect(saved?.messages.map((message) => message.text)).toEqual([
            'What about\nthe oven?',
            'It runs hot.',
        ]);
        expect(saved?.messages[1]).not.toHaveProperty('pending');
    });

    it('grows the same thread, and starts another after New conversation', async () => {
        await ask('first', 'one');
        await ask('second', 'two');

        expect(useStore.getState().chatThreads).toHaveLength(1);

        useStore.getState().newChat();

        expect(useStore.getState()).toMatchObject({ chat: [], chatThreadId: null });

        await ask('third', 'three');

        expect(useStore.getState().chatThreads.map((thread) => thread.title)).toEqual([
            'third',
            'first',
        ]);
    });

    it('brings an old conversation back and carries on in it', async () => {
        await ask('first', 'one');

        const { id } = useStore.getState().chatThreads[0];

        useStore.getState().newChat();
        await useStore.getState().openChatThread(id);

        expect(chat().map((message) => message.text)).toEqual(['first', 'one']);

        await ask('and then?', 'two');

        expect(ai.asked[ai.asked.length - 1].messages).toEqual([
            { role: 'user', text: 'first' },
            { role: 'ai', text: 'one' },
            { role: 'user', text: 'and then?' },
        ]);
        expect((await getRepository().getChat?.(id))?.messages).toHaveLength(4);
    });

    it('does not write an answer into the conversation that replaced its own', async () => {
        await ask('first', 'one');

        const turn = useStore.getState().sendChat('abandoned');

        ai.delta('half');
        useStore.getState().newChat();
        await turn;

        const [thread] = useStore.getState().chatThreads;

        expect(useStore.getState()).toMatchObject({ chat: [], chatBusy: false });
        expect((await getRepository().getChat?.(thread.id))?.messages).toHaveLength(2);
    });

    it('renames a conversation, and keeps the name as it grows', async () => {
        await ask('first', 'one');

        const { id } = useStore.getState().chatThreads[0];

        await useStore.getState().renameChatThread(id, '  Kitchen   notes ');

        expect(useStore.getState().chatThreads[0].title).toBe('Kitchen notes');
        expect((await getRepository().getChat?.(id))?.title).toBe('Kitchen notes');

        await ask('second', 'two');

        expect(useStore.getState().chatThreads[0].title).toBe('Kitchen notes');
        expect((await getRepository().getChat?.(id))?.title).toBe('Kitchen notes');

        await useStore.getState().renameChatThread(id, '   ');

        expect(useStore.getState().chatThreads[0].title).toBe('Kitchen notes');
    });

    it('deletes a conversation, leaving it if it was the one on screen', async () => {
        await ask('first', 'one');

        const { id } = useStore.getState().chatThreads[0];

        await useStore.getState().deleteChatThread(id);

        expect(useStore.getState()).toMatchObject({
            chat: [],
            chatThreadId: null,
            chatThreads: [],
        });
        expect(await getRepository().getChat?.(id)).toBeNull();
    });
});

describe('message actions', () => {
    beforeEach(() => {
        resetRepository();
        useStore.setState({
            chatItemId: null,
            chatOpen: true,
            chatThreadId: null,
            chatThreads: [],
        });
    });

    it('asks an edited question again and drops what followed the old one', async () => {
        const first = useStore.getState().sendChat('first');

        ai.delta('one');
        ai.done();
        await first;

        const second = useStore.getState().sendChat('secnod');

        ai.delta('two');
        ai.done();
        await second;

        const again = useStore.getState().resendChat(chat()[2].id, 'second');

        ai.delta('better');
        ai.done();
        await again;

        expect(chat().map((message) => message.text)).toEqual(['first', 'one', 'second', 'better']);
        expect(ai.asked[2].messages).toEqual([
            { role: 'user', text: 'first' },
            { role: 'ai', text: 'one' },
            { role: 'user', text: 'second' },
        ]);
    });

    it('files an answer as a note, citations and all, and opens it beside the chat', async () => {
        const turn = useStore.getState().sendChat('What about the oven?');

        ai.delta('It runs hot. [[oven-notes]]');
        ai.done();
        await turn;

        await useStore.getState().saveAnswerAsNote(chat()[1].id);

        const id = useStore.getState().chatItemId;
        const note = await getRepository().getItem(id ?? '');

        expect(note).toMatchObject({
            body: 'It runs hot. [[oven-notes]]',
            title: 'What about the oven?',
            type: 'note',
        });
        expect(useStore.getState().chatOpen).toBe(true);
    });
});
