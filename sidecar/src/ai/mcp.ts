import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import type { VaultStore } from '../index/store';

import { version } from '../../package.json';
import { MCP_INDEX_FILE } from '../vault';
import { Workspace } from '../workspace';
import { ToolError, toolsFor } from './tools';

const INSTRUCTIONS = `Lore is a personal knowledge base: a folder of Markdown files, where a file is an item (note, canvas, code, image, link or task) and its folder is its collection.

- Search before answering a question about what the user has saved, and read an item before quoting or changing it.
- Refer to an item as [[stem]], using the "stem" a tool returned. That is how items link to each other, and Lore renders it as a link.
- Write through create_item and update_item rather than editing files, so filenames, frontmatter and links stay consistent.
- update_item replaces "body" and "tags" whole. Read first, then send the full new value.
- Every change keeps the version before it in .lore/trash/, at the "previousVersion" the tool returns. Tell the user where it is when you change something they did not ask you to.
- A canvas is a sketch. read_item gives its labels, not its shapes, and add_to_canvas is the only way to draw into one.`;

export function createMcpServer(store: () => VaultStore, access: 'read' | 'write'): McpServer {
    const server = new McpServer({ name: 'lore', version }, { instructions: INSTRUCTIONS });

    for (const tool of toolsFor(access)) {
        server.registerTool(
            tool.name,
            {
                annotations: { readOnlyHint: !tool.writes },
                description: tool.description,
                inputSchema: tool.input,
            },
            async (input: unknown) => {
                try {
                    const result = await tool.run(store(), input);

                    return { content: [{ text: JSON.stringify(result), type: 'text' as const }] };
                } catch (error) {
                    // A bad argument is the model's to correct; anything else is ours.
                    if (!(error instanceof ToolError)) {
                        throw error;
                    }

                    return {
                        content: [{ text: error.message, type: 'text' as const }],
                        isError: true,
                    };
                }
            },
        );
    }

    return server;
}

export async function serveMcp(env: Record<string, string | undefined> = Bun.env): Promise<void> {
    const root = env.LORE_VAULT;

    if (!root) {
        throw new Error('LORE_VAULT must name the vault folder to serve');
    }

    // The watcher is what keeps a long-lived agent session reading what the user
    // has since typed in Lore, which writes to these files from another process.
    const workspace = new Workspace();

    await workspace.open(root, MCP_INDEX_FILE);

    const access = env.LORE_MCP_READONLY === '1' ? 'read' : 'write';
    const server = createMcpServer(() => workspace.current, access);

    const shutdown = (): void => {
        void workspace.close().finally(() => process.exit(0));
    };

    // The transport does not notice its host hanging up, and the watcher alone
    // would keep this process alive long after the agent that started it is gone.
    process.stdin.on('end', shutdown);
    process.stdin.on('close', shutdown);

    await server.connect(new StdioServerTransport());
}
