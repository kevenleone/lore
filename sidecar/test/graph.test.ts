// The edge list the graph surface draws.

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { VaultStore } from '../src/index/store';

let root: string;
let store: VaultStore;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-graph-'));
});

afterEach(async () => {
    store?.close();
    await rm(root, { force: true, recursive: true });
});

const write = (name: string, text: string) => writeFile(join(root, name), text, 'utf8');

const open = async (): Promise<void> => {
    store = await VaultStore.open(root);
};

const idFor = (title: string): string => store.listItems().find((item) => item.title === title)!.id;

describe('graph', () => {
    it('is empty for a vault with no links', async () => {
        await write('one.md', '---\ntitle: One\n---\n\nNo links.\n');
        await open();

        const graph = store.graph();

        expect(graph.nodes).toHaveLength(1);
        expect(graph.edges).toEqual([]);
    });

    it('lists every item as a node, linked or not', async () => {
        await write('one.md', '---\ntitle: One\n---\n\nSees [[two]].\n');
        await write('two.md', '---\ntitle: Two\n---\n\nBody.\n');
        await write('lonely.md', '---\ntitle: Lonely\n---\n\nBody.\n');
        await open();

        expect(
            store
                .graph()
                .nodes.map((node) => node.title)
                .sort(),
        ).toEqual(['Lonely', 'One', 'Two']);
    });

    it('says where an edge was written', async () => {
        await write('one.md', "---\ntitle: One\nrelated:\n  - '[[two]]'\n---\n\nBody.\n");
        await write('two.md', '---\ntitle: Two\n---\n\nSees [[one]].\n');
        await open();

        const graph = store.graph();
        const byVia = Object.fromEntries(
            graph.edges.map((edge) => [edge.via, [edge.source, edge.target]]),
        );

        expect(byVia.related).toEqual([idFor('One'), idFor('Two')]);
        expect(byVia.body).toEqual([idFor('Two'), idFor('One')]);
    });

    it('counts degree from both ends', async () => {
        await write('hub.md', '---\ntitle: Hub\n---\n\nBody.\n');
        await write('one.md', '---\ntitle: One\n---\n\nSees [[hub]].\n');
        await write('two.md', '---\ntitle: Two\n---\n\nSees [[hub]].\n');
        await open();

        const byTitle = new Map(store.graph().nodes.map((node) => [node.title, node.degree]));

        expect(byTitle.get('Hub')).toBe(2);
        expect(byTitle.get('One')).toBe(1);
    });

    it('leaves out a link to a file nobody has written', async () => {
        await write('one.md', '---\ntitle: One\n---\n\nSees [[not-written-yet]].\n');
        await open();

        expect(store.graph().edges).toEqual([]);
    });

    it('drops an edge when its target is deleted', async () => {
        await write('one.md', '---\ntitle: One\n---\n\nSees [[two]].\n');
        await write('two.md', '---\ntitle: Two\n---\n\nBody.\n');
        await open();

        await store.deleteItem(idFor('Two'));

        expect(store.graph().edges).toEqual([]);
        expect(store.graph().nodes).toHaveLength(1);
    });

    it('carries the type, which is what colours a node', async () => {
        await write('one.md', '---\ntitle: One\ntype: task\n---\n\nBody.\n');
        await open();

        expect(store.graph().nodes[0].type).toBe('task');
    });
});
