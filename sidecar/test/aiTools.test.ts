import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ToolError, toolsFor, type VaultTool } from '../src/ai/tools';
import { VaultStore } from '../src/index/store';

let root: string;
let store: VaultStore;

const HANDWRITTEN = `---
title: Sourdough starter
tags: [baking]
mood: hopeful
---

Feed it daily. See [[oven-notes]].
`;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-tools-'));
    await mkdir(join(root, 'Kitchen'));
    await writeFile(join(root, 'Kitchen', 'sourdough-starter.md'), HANDWRITTEN);
    await writeFile(join(root, 'oven-notes.md'), '---\ntitle: Oven notes\n---\n\nRuns hot.\n');
    store = await VaultStore.open(root);
});

afterEach(async () => {
    store.close();
    await rm(root, { force: true, recursive: true });
});

function sceneOf(file: string): Record<string, unknown>[] {
    const json = /```json\n([\s\S]*?)\n```/.exec(file)?.[1] ?? '';

    return JSON.parse(json).elements;
}

function tool(name: string): VaultTool {
    const found = toolsFor('write').find((candidate) => candidate.name === name);

    if (!found) {
        throw new Error(`no tool named ${name}`);
    }

    return found;
}

describe('vault tools', () => {
    it('offers no writing tool to a read-only caller', () => {
        expect(toolsFor('read').map((candidate) => candidate.name)).toEqual([
            'search',
            'read_item',
            'list_collections',
            'list_tags',
            'backlinks',
        ]);
    });

    it('searches and answers with the stem a wikilink needs', async () => {
        const results = (await tool('search').run(store, { query: 'sourdough' })) as {
            collection: string;
            stem: string;
        }[];

        expect(results).toHaveLength(1);
        expect(results[0].stem).toBe('sourdough-starter');
        expect(results[0].collection).toBe('Kitchen');
    });

    it('reads an item by stem as well as by id', async () => {
        const byStem = (await tool('read_item').run(store, { id: 'oven-notes' })) as {
            body: string;
            id: string;
        };
        const byId = (await tool('read_item').run(store, { id: byStem.id })) as { body: string };

        expect(byStem.body).toContain('Runs hot.');
        expect(byId.body).toBe(byStem.body);
    });

    it('lists what links to an item', async () => {
        const inbound = (await tool('backlinks').run(store, { id: 'oven-notes' })) as {
            stem: string;
        }[];

        expect(inbound.map((item) => item.stem)).toEqual(['sourdough-starter']);
    });

    it('creates a file in the folder named as the collection', async () => {
        const created = (await tool('create_item').run(store, {
            body: 'Autolyse for an hour.',
            collection: 'Kitchen',
            tags: ['baking'],
            title: 'Bread log',
        })) as { path: string };

        expect(created.path).toBe('Kitchen/bread-log.md');

        const text = await readFile(join(root, created.path), 'utf8');

        expect(text).toContain('Autolyse for an hour.');
        expect(text).not.toContain('collection');
    });

    it('refuses a collection outside the folders a user files into', async () => {
        for (const collection of ['../elsewhere', '.lore/templates', '.git/hooks', 'attachments']) {
            await expect(
                tool('create_item').run(store, { collection, title: 'Planted' }),
            ).rejects.toBeInstanceOf(ToolError);
            await expect(
                tool('update_item').run(store, { collection, id: 'sourdough-starter' }),
            ).rejects.toBeInstanceOf(ToolError);
        }

        expect(store.search('Planted')).toEqual([]);
        expect(await readFile(join(root, 'Kitchen', 'sourdough-starter.md'), 'utf8')).toContain(
            'Feed it daily.',
        );
    });

    it('updates one field and keeps frontmatter it does not own', async () => {
        await tool('update_item').run(store, {
            id: 'sourdough-starter',
            summary: 'How to keep the starter alive.',
        });

        const text = await readFile(join(root, 'Kitchen', 'sourdough-starter.md'), 'utf8');

        expect(text).toContain('summary: How to keep the starter alive.');
        expect(text).toContain('mood: hopeful');
        expect(text).toContain('Feed it daily. See [[oven-notes]].');
    });

    it('reports a bad argument as something the model can correct', async () => {
        await expect(tool('read_item').run(store, { id: 'nowhere' })).rejects.toBeInstanceOf(
            ToolError,
        );
        await expect(tool('create_item').run(store, {})).rejects.toBeInstanceOf(ToolError);
    });
});

describe('undoing what a model changed', () => {
    const trash = async (): Promise<string[]> => readdir(join(root, '.lore', 'trash'));

    it('keeps the version before every change in the trash', async () => {
        const result = (await tool('update_item').run(store, {
            body: 'Gone.',
            id: 'sourdough-starter',
        })) as { previousVersion: string };

        await tool('update_item').run(store, { id: 'sourdough-starter', tags: ['bread'] });

        const copies = await trash();

        expect(copies).toHaveLength(2);
        expect(result.previousVersion).toStartWith('.lore/trash/');
        expect(await readFile(join(root, result.previousVersion), 'utf8')).toBe(HANDWRITTEN);
    });

    it('keeps nothing when nothing changes', async () => {
        await tool('update_item').run(store, { id: 'sourdough-starter' });

        expect(await trash().catch(() => [])).toEqual([]);
    });
});

describe('a sketch', () => {
    const SKETCH = `---
title: System sketch
type: canvas
excalidraw-plugin: parsed
---

## Text

- API gateway

## Drawing

\`\`\`json
{ "elements": [{ "id": "a", "strokeColor": "#1e1e1e", "text": "API gateway", "type": "text" }] }
\`\`\`
`;

    beforeEach(async () => {
        await writeFile(join(root, 'system-sketch.md'), SKETCH);
        await store.reconcile();
    });

    it('is found by a label and not by what the scene is made of', () => {
        expect(store.search('gateway').map((item) => item.type)).toEqual(['canvas']);
        expect(store.search('strokeColor')).toEqual([]);
    });

    it('is read as its labels, so the scene does not spend the body budget', async () => {
        const read = (await tool('read_item').run(store, { id: 'system-sketch' })) as {
            body: string;
            snippet: string;
        };

        expect(read.body).toBe('API gateway');
        expect(read.snippet).toBe('API gateway');
    });

    it('cannot have its drawing overwritten with a body', async () => {
        await expect(
            tool('update_item').run(store, { body: 'A paragraph.', id: 'system-sketch' }),
        ).rejects.toBeInstanceOf(ToolError);
        await expect(
            tool('create_item').run(store, { body: 'Boxes.', title: 'Drawn', type: 'canvas' }),
        ).rejects.toBeInstanceOf(ToolError);
    });

    it('is created empty and then drawn into', async () => {
        await tool('create_item').run(store, { title: 'Pipeline', type: 'canvas' });

        const drawn = (await tool('add_to_canvas').run(store, {
            arrows: [{ from: 'in', label: 'push', to: 'out' }],
            id: 'pipeline',
            shapes: [
                { key: 'in', label: 'Ingest' },
                { color: 'blue', key: 'out', kind: 'ellipse', label: 'Queue' },
            ],
        })) as { added: unknown; body: string };

        expect(drawn.added).toEqual({ arrows: 1, shapes: 2 });
        expect(drawn.body).toBe('Ingest\nQueue\npush');

        const elements = sceneOf(await readFile(join(root, 'pipeline.md'), 'utf8'));
        const [box, , ellipse, , arrow, arrowLabel] = elements;

        expect(elements.map((element) => element.type)).toEqual([
            'rectangle',
            'text',
            'ellipse',
            'text',
            'arrow',
            'text',
        ]);
        expect(ellipse.backgroundColor).toBe('#a5d8ff');
        expect(arrow.startBinding).toMatchObject({ elementId: box.id });
        expect(arrow.endBinding).toMatchObject({ elementId: ellipse.id });
        expect(arrowLabel.containerId).toBe(arrow.id);
        expect(box.boundElements).toContainEqual({ id: arrow.id, type: 'arrow' });
        expect(Number(ellipse.x)).toBeGreaterThan(Number(box.x) + Number(box.width));
    });

    it('adds below what is drawn and leaves it as it was', async () => {
        await tool('create_item').run(store, { title: 'Pipeline', type: 'canvas' });
        await tool('add_to_canvas').run(store, {
            id: 'pipeline',
            shapes: [{ key: 'in', label: 'Ingest' }],
        });

        const before = sceneOf(await readFile(join(root, 'pipeline.md'), 'utf8'));

        await tool('add_to_canvas').run(store, {
            arrows: [{ from: 'ingest', to: 'store' }],
            id: 'pipeline',
            shapes: [{ key: 'store', kind: 'diamond', label: 'Store' }],
        });

        const after = sceneOf(await readFile(join(root, 'pipeline.md'), 'utf8'));
        const kept = await readdir(join(root, '.lore', 'trash'));

        expect(kept).toHaveLength(2);

        const [box, label, diamond] = after;

        expect(label).toEqual(before[1]);
        expect({ ...box, boundElements: 0, version: 0, versionNonce: 0 }).toEqual({
            ...before[0],
            boundElements: 0,
            version: 0,
            versionNonce: 0,
        });
        expect(Number(diamond.y)).toBeGreaterThan(Number(box.y) + Number(box.height));
        expect(after[4].startBinding).toMatchObject({ elementId: box.id });
    });

    it('refuses what it cannot place, and writes nothing', async () => {
        const untouched = await readFile(join(root, 'system-sketch.md'), 'utf8');
        const draw = (input: object): Promise<unknown> =>
            tool('add_to_canvas').run(store, { id: 'system-sketch', ...input });

        await expect(draw({})).rejects.toBeInstanceOf(ToolError);
        await expect(draw({ arrows: [{ from: 'nowhere', to: 'API gateway' }] })).rejects.toThrow(
            'No shape with the key or label "nowhere"',
        );
        await expect(
            draw({
                shapes: [
                    { column: 1, key: 'a', label: 'One', row: 1 },
                    { column: 1, key: 'b', label: 'Two', row: 1 },
                ],
            }),
        ).rejects.toThrow('column 1, row 1');
        await expect(
            tool('add_to_canvas').run(store, {
                id: 'oven-notes',
                shapes: [{ key: 'a', label: 'One' }],
            }),
        ).rejects.toThrow('not a canvas');

        expect(await readFile(join(root, 'system-sketch.md'), 'utf8')).toBe(untouched);
    });

    it('is left alone when its drawing cannot be read', async () => {
        const broken = SKETCH.replace('{ "elements"', '{ "elements');

        await writeFile(join(root, 'system-sketch.md'), broken);
        await store.reconcile();

        await expect(
            tool('add_to_canvas').run(store, {
                id: 'system-sketch',
                shapes: [{ key: 'a', label: 'One' }],
            }),
        ).rejects.toThrow('cannot be read');
        expect(await readFile(join(root, 'system-sketch.md'), 'utf8')).toBe(broken);
    });

    it('keeps its drawing and its unknown keys through a retag', async () => {
        await tool('update_item').run(store, { id: 'system-sketch', tags: ['architecture'] });

        const text = await readFile(join(root, 'system-sketch.md'), 'utf8');

        expect(text).toContain('excalidraw-plugin: parsed');
        expect(text).toContain('type: canvas');
        expect(text).toContain('"strokeColor": "#1e1e1e"');
    });
});
