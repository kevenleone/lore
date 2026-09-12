import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Item } from './types';

import { DEFAULT_PREFS } from './types';
import { useStore } from './useStore';

vi.mock('../lib/reveal', () => ({ revealPath: vi.fn().mockResolvedValue(true) }));

vi.mock('../lib/exportPdf', async () => {
    const actual = await vi.importActual<typeof import('../lib/exportPdf')>('../lib/exportPdf');
    return { ...actual, exportPdf: vi.fn(), pickPdfPath: vi.fn() };
});

const { exportPdf, pickPdfPath } = await import('../lib/exportPdf');
const exported = vi.mocked(exportPdf);
const picked = vi.mocked(pickPdfPath);

const ITEM: Item = {
    body: '# Hello\n',
    collectionId: 'c1',
    createdAt: '2026-01-02T03:04:05.000Z',
    flags: {},
    id: 'i1',
    path: 'Reading List/how-linear-builds-product.md',
    related: [],
    tags: ['product'],
    title: 'How Linear builds product',
    type: 'link',
    updatedAt: '2026-01-02T03:04:05.000Z',
};

beforeEach(() => {
    exported.mockReset();
    picked.mockReset();
    useStore.setState({
        collections: [{ color: '#fff', id: 'c1', name: 'Reading List' }],
        detail: ITEM,
        prefs: DEFAULT_PREFS,
        selectedId: ITEM.id,
        toasts: [],
    });
});

describe('exportItemPdf', () => {
    it('asks for nothing when no item is open', async () => {
        useStore.setState({ detail: null, selectedId: null });

        await useStore.getState().exportItemPdf();

        expect(picked).not.toHaveBeenCalled();
        expect(useStore.getState().toasts[0].message).toBe('Open an item to export it.');
    });

    it('does nothing when the save panel is cancelled', async () => {
        picked.mockResolvedValue(null);

        await useStore.getState().exportItemPdf();

        expect(exported).not.toHaveBeenCalled();
        expect(useStore.getState().toasts).toHaveLength(0);
    });

    it('sends the body and the collection name, and names the file it wrote', async () => {
        picked.mockResolvedValue('/tmp/out/how-linear-builds-product.pdf');
        exported.mockResolvedValue();

        await useStore.getState().exportItemPdf();

        expect(exported).toHaveBeenCalledWith(
            { collectionName: 'Reading List', item: ITEM },
            '/tmp/out/how-linear-builds-product.pdf',
        );
        expect(useStore.getState().toasts[0].message).toBe(
            'Exported how-linear-builds-product.pdf.',
        );
    });

    it('offers to show the file, because only the export knows where it went', async () => {
        const { revealPath } = await import('../lib/reveal');
        picked.mockResolvedValue('/tmp/out/how-linear-builds-product.pdf');
        exported.mockResolvedValue();

        await useStore.getState().exportItemPdf();

        const action = useStore.getState().toasts[0].action;
        expect(action?.label).toBe('Show in Finder');

        action?.run();
        expect(vi.mocked(revealPath)).toHaveBeenCalledWith(
            '/tmp/out/how-linear-builds-product.pdf',
        );
    });

    it('leaves a failure with nothing to click', async () => {
        picked.mockResolvedValue('/tmp/out/note.pdf');
        exported.mockRejectedValue(new Error('nope'));

        await useStore.getState().exportItemPdf();

        expect(useStore.getState().toasts[0].action).toBeUndefined();
    });

    it('says so when the export fails, rather than looking like it worked', async () => {
        picked.mockResolvedValue('/tmp/out/note.pdf');
        exported.mockRejectedValue(new Error('Lore can only export a PDF on macOS.'));

        await useStore.getState().exportItemPdf();

        expect(useStore.getState().toasts[0].message).toBe('Lore can only export a PDF on macOS.');
    });
});
