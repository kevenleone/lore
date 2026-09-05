import { describe, expect, it } from 'vitest';

import { cn } from './cn';

// twMerge only drops an earlier class when it knows the two belong to the same
// group. Our scales replace Tailwind's stock ones, so every custom name has to
// be registered in cn.ts or a conflict silently keeps both classes — the last
// one wins in the cascade, which is not always the one the caller passed last.
describe('cn', () => {
    it('keeps a text colour and a text size together', () => {
        // `text-*` is both namespaces; these must NOT cancel each other.
        expect(cn('text-text2', 'text-body')).toBe('text-text2 text-body');
    });

    it('resolves conflicting text sizes', () => {
        expect(cn('text-body', 'text-caption')).toBe('text-caption');
    });

    it('resolves conflicting text colours', () => {
        expect(cn('text-text2', 'text-danger')).toBe('text-danger');
    });

    it('resolves conflicting backgrounds, radii and shadows', () => {
        expect(cn('bg-surface', 'bg-hover')).toBe('bg-hover');
        expect(cn('rounded-7', 'rounded-lg')).toBe('rounded-lg');
        expect(cn('shadow-float', 'shadow-seg')).toBe('shadow-seg');
    });

    it('lets a later conditional override the base', () => {
        const last = true;
        expect(cn('border-b border-border-soft', last && 'border-b-0')).toBe(
            'border-border-soft border-b-0',
        );
    });

    it('drops falsy values', () => {
        const on = false;
        expect(cn('bg-surface', on && 'bg-hover', undefined)).toBe('bg-surface');
    });
});
