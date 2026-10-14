import { fileURLToPath } from 'node:url';

import type { McpLaunch } from './harness/types';

/**
 * How to start this same engine as an MCP server. A compiled build is its own
 * executable; under `bun src/index.ts` the executable is Bun and the entry
 * point has to be named.
 *
 * `Bun.main` is what tells the two apart: a bytecode build keeps the source
 * path in `import.meta.url`, so that alone looks the same in both.
 */
export function engineLaunch(vault: string, { readOnly }: { readOnly: boolean }): McpLaunch {
    const compiled = Bun.main.includes('$bunfs') || Bun.main.includes('~BUN');
    const entry = fileURLToPath(new URL('../index.ts', import.meta.url));
    const env: Record<string, string> = { LORE_VAULT: vault };

    if (readOnly) {
        env.LORE_MCP_READONLY = '1';
    }

    return { args: compiled ? ['mcp'] : [entry, 'mcp'], command: process.execPath, env };
}
