import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { provideAi } from '../ai';
import { FakeAi } from '../ai/fakeAi';
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
