import { describe, expect, it } from 'vitest';

import { SEED_ITEMS } from '../store/seed';
import { MockAiProvider } from './mockAiProvider';

const ai = new MockAiProvider(() => SEED_ITEMS);

async function ask(question: string): Promise<{ sources: string[]; text: string }> {
    let text = '';
    const sources = await ai.chat(
        [{ role: 'user', text: question }],
        { backend: '' },
        {
            onActivity: () => undefined,
            onDelta: (delta) => {
                text += delta;
            },
        },
        new AbortController().signal,
    );

    return { sources: sources.map((source) => source.itemId), text };
}

describe('MockAiProvider', () => {
    it('cites matching items as sources', async () => {
        const answer = await ask('What about color and design?');

        // OKLCH color picker (i6) and Design of Everyday Things (i8) should surface.
        expect(answer.sources).toContain('i6');
        expect(answer.text).toContain('most relevant');
    });

    it('returns no sources when nothing matches', async () => {
        const answer = await ask('quantum chromodynamics');

        expect(answer.sources).toEqual([]);
        expect(answer.text).toContain("couldn't find anything");
    });

    it('proposes nothing, so nothing reads as a model’s judgement', async () => {
        expect(await ai.enrich()).toEqual({});
        expect(ai.needsSetup).toBe(false);
    });
});
