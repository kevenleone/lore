import { describe, expect, it } from 'vitest';

import { MemoryRepository } from './memoryRepository';

describe('MemoryRepository collections', () => {
    it('creates, updates, and lists collections', async () => {
        const repo = new MemoryRepository();
        const created = await repo.createCollection({ color: '#5b5bd6', name: 'Travel' });
        expect(created.id).toBeTruthy();

        const updated = await repo.updateCollection(created.id, { name: 'Trips' });
        expect(updated.name).toBe('Trips');

        const all = await repo.listCollections();
        expect(all.find((c) => c.id === created.id)?.name).toBe('Trips');
    });

    it('unfiles items when their collection is deleted', async () => {
        const repo = new MemoryRepository();
        const before = await repo.listItems({ kind: 'collection', val: 'work' });
        expect(before.length).toBeGreaterThan(0);

        await repo.deleteCollection('work');

        const collections = await repo.listCollections();
        expect(collections.find((c) => c.id === 'work')).toBeUndefined();

        const stillInWork = (await repo.listItems()).filter((i) => i.collectionId === 'work');
        expect(stillInWork).toHaveLength(0);
    });
});
