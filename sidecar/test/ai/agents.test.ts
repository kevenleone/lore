import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Elysia } from 'elysia';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import LOG_WORK from '../../../.claude/skills/log-work/SKILL.md' with { type: 'text' };
import LORE_DOCS from '../../../.claude/skills/lore-docs/SKILL.md' with { type: 'text' };
import { type AgentEnvironment, type Agents, createAgents, serverName } from '../../src/ai/agents';
import { engineLaunch } from '../../src/ai/launch';
import { routes } from '../../src/routes';
import { Workspace } from '../../src/services/workspace';

let home: string;
let vault: string;
let commands: string[][];
let failWith: null | string;
let agents: Agents;

function environment(installed: string[]): AgentEnvironment {
    return {
        env: { LORE_MODE: 'agent' },
        home,
        locate: async (binary) => (installed.includes(binary) ? `/bin/${binary}` : null),
        async run([binary, ...args]) {
            commands.push([binary, ...args]);

            if (failWith) {
                return { exitCode: 1, output: failWith };
            }

            await fakeClaude(args);

            return { exitCode: 0, output: '' };
        },
    };
}

/** Stands in for `claude mcp add/remove`: it edits the same file the real one does. */
async function fakeClaude(args: string[]): Promise<void> {
    const path = join(home, '.claude.json');
    const config = JSON.parse(await readFile(path, 'utf8').catch(() => '{}'));
    const servers = config.mcpServers ?? {};

    if (args[1] === 'remove') {
        delete servers[args[4]];
    } else {
        const name = args[4];
        const split = args.indexOf('--');
        const env = Object.fromEntries(
            args
                .slice(5, split)
                .filter((_entry, index) => index % 2 === 1)
                .map((pair) => pair.split('=') as [string, string]),
        );

        servers[name] = { args: args.slice(split + 2), command: args[split + 1], env };
    }

    await writeFile(path, JSON.stringify({ ...config, mcpServers: servers }));
}

beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), 'lore-agents-home-'));
    vault = await mkdtemp(join(tmpdir(), 'lore-agents-vault-'));
    commands = [];
    failWith = null;
    agents = createAgents(environment(['claude']));
});

afterEach(async () => {
    await rm(home, { force: true, recursive: true });
    await rm(vault, { force: true, recursive: true });
});

describe('agents', () => {
    it('names the server after the build, so builds never share one', () => {
        expect(serverName('agent')).toBe('lore-agent');
        expect(serverName(undefined)).toBe('lore');
    });

    it('lists what is installed and that nothing is set up yet', async () => {
        expect(await agents.list(vault)).toEqual([
            {
                available: true,
                id: 'claude',
                label: 'Claude Code',
                mcp: 'off',
                server: 'lore-agent',
                skill: 'off',
            },
            {
                available: false,
                id: 'codex',
                label: 'Codex',
                mcp: 'off',
                server: 'lore-agent',
                skill: 'off',
            },
        ]);
    });

    it('connects with write access through the agent’s own command', async () => {
        const status = await agents.setMcp('claude', vault, true);
        const launch = engineLaunch(vault, { readOnly: false });

        expect(status.mcp).toBe('on');
        expect(commands).toEqual([
            [
                '/bin/claude',
                'mcp',
                'add',
                '--scope',
                'user',
                'lore-agent',
                '-e',
                `LORE_VAULT=${vault}`,
                '--',
                launch.command,
                ...launch.args,
            ],
        ]);
    });

    it('reads a connection to another vault as stale, and replaces it', async () => {
        await agents.setMcp('claude', vault, true);

        const other = join(vault, 'Other');

        await mkdir(other);
        expect((await agents.list(other))[0].mcp).toBe('stale');

        commands = [];
        expect((await agents.setMcp('claude', other, true)).mcp).toBe('on');
        expect(commands.map((command) => command[2])).toEqual(['remove', 'add']);
    });

    it('counts a hand-made `lore mcp <vault>` for this vault as connected', async () => {
        const handMade = (args: string[]): string =>
            JSON.stringify({ mcpServers: { 'lore-agent': { args, command: 'lore-agent' } } });

        await writeFile(join(home, '.claude.json'), handMade(['mcp', vault]));
        expect((await agents.list(vault))[0].mcp).toBe('on');

        await writeFile(join(home, '.claude.json'), handMade(['mcp', join(vault, 'Other')]));
        expect((await agents.list(vault))[0].mcp).toBe('stale');
    });

    it('disconnects, leaving the rest of the agent’s config alone', async () => {
        await writeFile(
            join(home, '.claude.json'),
            JSON.stringify({ mcpServers: { github: { command: 'gh' } }, theme: 'dark' }),
        );
        await agents.setMcp('claude', vault, true);

        expect((await agents.setMcp('claude', vault, false)).mcp).toBe('off');
        expect(JSON.parse(await readFile(join(home, '.claude.json'), 'utf8'))).toEqual({
            mcpServers: { github: { command: 'gh' } },
            theme: 'dark',
        });
    });

    it('reads Codex’s connection from its TOML config', async () => {
        const launch = engineLaunch(vault, { readOnly: false });
        const codex = createAgents(environment(['codex']));

        await mkdir(join(home, '.codex'));
        await writeFile(
            join(home, '.codex/config.toml'),
            `model = "o3"\n\n[mcp_servers.lore-agent]\ncommand = ${JSON.stringify(launch.command)}\nargs = ${JSON.stringify(launch.args)}\n\n[mcp_servers.lore-agent.env]\nLORE_VAULT = ${JSON.stringify(vault)}\n`,
        );

        expect((await codex.list(vault))[1].mcp).toBe('on');
        expect((await codex.list(join(vault, 'elsewhere')))[1].mcp).toBe('stale');
    });

    it('tests only a server that is there', async () => {
        await expect(agents.test('claude')).rejects.toThrow('no “lore-agent” server');
    });

    it('passes on what the agent said when it refuses', async () => {
        failWith = 'config is locked';

        await expect(agents.setMcp('claude', vault, true)).rejects.toThrow('config is locked');
        await expect(agents.setMcp('codex', vault, true)).rejects.toThrow('not installed');
        await expect(agents.setMcp('nobody', vault, true)).rejects.toThrow('No agent');
    });

    it('keeps a connection reading as on after the skill is installed', async () => {
        await agents.setMcp('claude', vault, true);

        expect((await agents.setSkill('claude', vault, true)).mcp).toBe('on');
    });

    it('installs every skill where each agent looks, and updates an old copy', async () => {
        expect((await agents.setSkill('claude', vault, true)).skill).toBe('on');
        expect(await readFile(join(home, '.claude/skills/lore-docs/SKILL.md'), 'utf8')).toBe(
            LORE_DOCS,
        );
        expect(await readFile(join(home, '.claude/skills/log-work/SKILL.md'), 'utf8')).toBe(
            LOG_WORK,
        );

        await writeFile(join(home, '.claude/skills/lore-docs/SKILL.md'), 'an older version');
        expect((await agents.list(vault))[0].skill).toBe('stale');

        expect((await agents.setSkill('codex', vault, true)).skill).toBe('on');
        expect(await readFile(join(home, '.agents/skills/log-work/SKILL.md'), 'utf8')).toBe(
            LOG_WORK,
        );

        expect((await agents.setSkill('codex', vault, false)).skill).toBe('off');
    });

    it('reads one skill of two as needing an update, and reports each', async () => {
        await mkdir(join(home, '.claude/skills/lore-docs'), { recursive: true });
        await writeFile(join(home, '.claude/skills/lore-docs/SKILL.md'), LORE_DOCS);

        expect((await agents.list(vault))[0].skill).toBe('stale');
        expect((await agents.skills('claude')).map(({ name, setup }) => ({ name, setup }))).toEqual(
            [
                { name: 'lore-docs', setup: 'on' },
                { name: 'log-work', setup: 'off' },
            ],
        );
    });
});

describe('agent routes', () => {
    it('takes an agent and a switch, and nothing else', async () => {
        const workspace = new Workspace();

        await workspace.open(vault);

        const app = new Elysia().use(routes(workspace, undefined, agents));
        const post = (path: string, body: unknown): Promise<Response> =>
            app.handle(
                new Request(`http://lore${path}`, {
                    body: JSON.stringify(body),
                    headers: { 'content-type': 'application/json' },
                    method: 'POST',
                }),
            );

        expect((await post('/ai/agents/claude/mcp', { on: 'yes' })).status).toBe(400);
        expect((await post('/ai/agents/claude/shell', { on: true })).status).toBe(400);
        expect((await post('/ai/agents/codex/mcp', { on: true })).status).toBe(400);

        const connected = await post('/ai/agents/claude/mcp', { on: true });

        expect(connected.status).toBe(200);
        expect(((await connected.json()) as { mcp: string }).mcp).toBe('on');
        await workspace.close();
    });
});
