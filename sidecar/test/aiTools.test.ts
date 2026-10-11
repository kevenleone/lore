import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
