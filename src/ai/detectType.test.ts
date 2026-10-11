import { describe, expect, it } from 'vitest';

import { detectType } from './detectType';

describe('detectType', () => {
    it('detects links', () => {
        expect(detectType('https://linear.app/blog')).toBe('link');
    });
    it('detects images by extension', () => {
        expect(detectType('https://x.com/a.png')).toBe('image');
    });
    it('detects code', () => {
        expect(detectType('const x = () => 1;')).toBe('code');
    });
    it('detects tasks', () => {
        expect(detectType('Follow up with Maya')).toBe('task');
    });
    it('falls back to note', () => {
        expect(detectType('just a thought about lunch')).toBe('note');
    });
});
