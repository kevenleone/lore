import { describe, expect, it } from 'vitest';

import { pdfFileName } from './exportPdf';

describe('pdfFileName', () => {
    it('keeps an ordinary title as it reads', () => {
        expect(pdfFileName('How Linear builds product')).toBe('How Linear builds product.pdf');
    });

    it('replaces the characters a filename cannot carry', () => {
        expect(pdfFileName('src/data: the seam?')).toBe('src-data- the seam-.pdf');
    });

    it('falls back rather than producing a bare extension', () => {
        expect(pdfFileName('   ')).toBe('Untitled.pdf');
        expect(pdfFileName('')).toBe('Untitled.pdf');
    });

    it('does not write a dotfile', () => {
        expect(pdfFileName('...hidden')).toBe('hidden.pdf');
    });

    it('clamps a title too long for a filesystem', () => {
        const name = pdfFileName('a'.repeat(400));
        expect(name).toBe(`${'a'.repeat(120)}.pdf`);
    });

    it('collapses the whitespace a pasted title arrives with', () => {
        expect(pdfFileName('two   spaces\tand\na newline')).toBe('two spaces and a newline.pdf');
    });
});
