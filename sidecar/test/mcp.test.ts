import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMcpServer } from '../src/ai/mcp';
import { VaultStore } from '../src/index/store';

let root: string;
let store: VaultStore;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'lore-mcp-'));
    await writeFile(join(root, 'oven-notes.md'), '---\ntitle: Oven notes\n---\n\nRuns hot.\n');
    store = await VaultStore.open(root);
});

afterEach(async () => {
    store.close();
    await rm(root, { force: true, recursive: true });
});

async function connect(access: 'read' | 'write'): Promise<Client> {
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'test', version: '0' });

    await createMcpServer(() => store, access).connect(serverSide);
    await client.connect(clientSide);

    return client;
}

function text(result: Awaited<ReturnType<Client['callTool']>>): string {
    const [first] = result.content as { text: string }[];

    return first.text;
}

describe('MCP server', () => {
    it('tells the agent how the vault works', async () => {
        const client = await connect('read');

        expect(client.getInstructions()).toContain('[[stem]]');
    });

    it('withholds the writing tools from a read-only session', async () => {
        const client = await connect('read');
        const names = (await client.listTools()).tools.map((tool) => tool.name);

        expect(names).toContain('search');
        expect(names).not.toContain('create_item');
        expect(names).not.toContain('update_item');
    });

    it('creates an item that lands as a file', async () => {
        const client = await connect('write');
        const result = await client.callTool({
            arguments: { body: 'Proof overnight.', title: 'Bread log' },
            name: 'create_item',
        });

        expect(JSON.parse(text(result)).path).toBe('bread-log.md');
        expect(await readFile(join(root, 'bread-log.md'), 'utf8')).toContain('Proof overnight.');
    });

    it('answers an unknown item as a tool error, not a protocol failure', async () => {
        const client = await connect('read');
        const result = await client.callTool({ arguments: { id: 'nowhere' }, name: 'read_item' });

        expect(result.isError).toBe(true);
        expect(text(result)).toContain('nowhere');
    });
});
