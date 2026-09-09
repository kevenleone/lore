import { describe, expect, it } from 'vitest';

import { LIGHT_TOKENS, THEMES } from './themes';

const KEYS = Object.keys(LIGHT_TOKENS).sort();

describe('themes', () => {
    it('gives every theme the same token keys', () => {
        for (const theme of THEMES) {
            expect(Object.keys(theme.tokens).sort(), theme.id).toEqual(KEYS);
        }
    });

    it('has unique ids and both modes represented', () => {
        const ids = THEMES.map((t) => t.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(THEMES.some((t) => t.mode === 'light')).toBe(true);
        expect(THEMES.some((t) => t.mode === 'dark')).toBe(true);
    });

    it('builds every derived token as a colour', () => {
        for (const theme of THEMES) {
            for (const [key, value] of Object.entries(theme.tokens)) {
                if (key.endsWith('-shadow')) continue;
                expect(value, `${theme.id} ${key}`).toMatch(
                    /^(#[0-9a-f]{6}|rgba?\(|transparent$)/i,
                );
            }
        }
    });
});
