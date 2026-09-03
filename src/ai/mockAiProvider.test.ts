import { describe, expect, it } from 'vitest';

import { SEED_ITEMS } from '../store/seed';
import { MockAiProvider } from './mockAiProvider';

const ai = new MockAiProvider();

describe('MockAiProvider.detectType', () => {
    it('detects links', async () => {
        expect(await ai.detectType('https://linear.app/blog')).toBe('link');
    });
    it('detects images by extension', async () => {
        expect(await ai.detectType('https://x.com/a.png')).toBe('image');
    });
    it('detects code', async () => {
        expect(await ai.detectType('const x = () => 1;')).toBe('code');
    });
    it('detects tasks', async () => {
        expect(await ai.detectType('Follow up with Maya')).toBe('task');
    });
    it('falls back to note', async () => {
        expect(await ai.detectType('just a thought about lunch')).toBe('note');
    });
});

describe('MockAiProvider.chat', () => {
    it('cites matching items as sources', async () => {
        const res = await ai.chat('What about color and design?', SEED_ITEMS);
        expect(res.sources.length).toBeGreaterThan(0);
        const ids = res.sources.map((s) => s.itemId);
        // OKLCH color picker (i6) and Design of Everyday Things (i8) should surface.
        expect(ids).toContain('i6');
    });

    it('returns no sources when nothing matches', async () => {
        const res = await ai.chat('quantum chromodynamics', SEED_ITEMS);
        expect(res.sources).toHaveLength(0);
    });
});

describe('MockAiProvider.suggestTags', () => {
    it("suggests no tags (stub provider can't infer them)", async () => {
        const tags = await ai.suggestTags(SEED_ITEMS[0]);
        expect(tags).toEqual([]);
    });
});
