import { describe, expect, it } from 'vitest';

import { pdfFileName } from './exportPdf';

describe('pdfFileName', () => {
    it('takes the name of the markdown file, so the pair sort together', () => {
        expect(
            pdfFileName({
                path: 'Reading List/how-linear-builds-product.md',
                title: 'How Linear builds product',
            }),
        ).toBe('how-linear-builds-product.pdf');
    });

    it('keeps the file name even when the title has since changed', () => {
        // Retitling deliberately does not rename the file, so the two drift
        // apart on purpose — and the file is the one the user can point at.
        expect(pdfFileName({ path: 'Work/q3-plan.md', title: 'Something else entirely' })).toBe(
            'q3-plan.pdf',
        );
    });

    it('reads a file at the vault root', () => {
        expect(pdfFileName({ path: 'stray-note.md', title: 'Stray note' })).toBe('stray-note.pdf');
    });

    it('slugs the title when no file stands behind the item', () => {
        expect(pdfFileName({ title: 'How Linear builds product' })).toBe(
            'how-linear-builds-product.pdf',
        );
    });

    it('strips the accents a filesystem would rather not carry', () => {
        expect(pdfFileName({ title: 'Café com leite' })).toBe('cafe-com-leite.pdf');
    });

    it('falls back rather than producing a bare extension', () => {
        expect(pdfFileName({ title: '   ' })).toBe('untitled.pdf');
        expect(pdfFileName({ title: '' })).toBe('untitled.pdf');
    });

    it('clamps a title too long for a filesystem', () => {
        expect(pdfFileName({ title: 'a'.repeat(400) })).toBe(`${'a'.repeat(80)}.pdf`);
    });
});
