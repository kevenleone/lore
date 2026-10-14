// Connects the command-line agents on this machine to the vault: registers
// `lore mcp` with each through its own `mcp add` command, and installs the skill
// that teaches it how a Lore file is shaped. Nothing here takes a path or a
// command from the caller; the renderer names an agent and nothing else.

import type { AgentSetup, AgentStatus } from '@lore/types';

import { mkdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import type { McpLaunch } from './harness/types';

import SKILL from '../../../.claude/skills/lore-docs/SKILL.md' with { type: 'text' };
import modes from '../../../lore.modes.json';
import { createLocator, type Locate } from './detect';
import { childEnv } from './harness/run';
import { engineLaunch } from './launch';

export const SKILL_NAME = 'lore-docs';

const RUN_TIMEOUT_MS = 20_000;

export interface AgentEnvironment {
    env: Record<string, string | undefined>;
    home: string;
    locate: Locate;
    run(command: string[]): Promise<{ exitCode: number; output: string }>;
}

export interface Agents {
    list(vault: string): Promise<AgentStatus[]>;
    setMcp(id: string, vault: string, on: boolean): Promise<AgentStatus>;
    setSkill(id: string, vault: string, on: boolean): Promise<AgentStatus>;
}

interface AgentDefinition {
    add(name: string, launch: McpLaunch): string[];
    binary: string;
    id: string;
    label: string;
    readServer(environment: AgentEnvironment, name: string): Promise<McpLaunch | null>;
    remove(name: string): string[];
    skillsDir(environment: AgentEnvironment): string;
}

export class AgentError extends Error {}

const AGENTS: readonly AgentDefinition[] = [
    {
        add: (name, launch) => [
            'mcp',
            'add',
            '--scope',
            'user',
            name,
            ...Object.entries(launch.env).flatMap(([key, value]) => ['-e', `${key}=${value}`]),
            '--',
            launch.command,
            ...launch.args,
        ],
        binary: 'claude',
        id: 'claude',
        label: 'Claude Code',
        async readServer({ home }, name) {
            const config = await readJson(join(home, '.claude.json'));

            return launchOf(record(record(config).mcpServers)[name]);
        },
        remove: (name) => ['mcp', 'remove', '--scope', 'user', name],
        skillsDir: ({ home }) => join(home, '.claude', 'skills'),
    },
    {
        add: (name, launch) => [
            'mcp',
            'add',
            name,
            ...Object.entries(launch.env).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
            '--',
            launch.command,
            ...launch.args,
        ],
        binary: 'codex',
        id: 'codex',
        label: 'Codex',
        async readServer({ env, home }, name) {
            const path = join(env.CODEX_HOME ?? join(home, '.codex'), 'config.toml');
            let config: unknown;

            try {
                config = Bun.TOML.parse(await readFile(path, 'utf8'));
            } catch {
                return null;
            }

            return launchOf(record(record(config).mcp_servers)[name]);
        },
        remove: (name) => ['mcp', 'remove', name],
        // Where Codex, and the other agents that follow the same convention, look.
        skillsDir: ({ home }) => join(home, '.agents', 'skills'),
    },
];

export function createAgents(environment: AgentEnvironment = systemEnvironment()): Agents {
    const name = serverName(environment.env.LORE_MODE);

    const status = async (agent: AgentDefinition, vault: string): Promise<AgentStatus> => {
        const available = (await environment.locate(agent.binary)) !== null;

        return {
            available,
            id: agent.id,
            label: agent.label,
            mcp: available ? await mcpSetup(agent, vault) : 'off',
            server: name,
            skill: await skillSetup(agent),
        };
    };

    const mcpSetup = async (agent: AgentDefinition, vault: string): Promise<AgentSetup> => {
        const found = await agent.readServer(environment, name);

        if (!found) {
            return 'off';
        }

        return sameLaunch(found, engineLaunch(vault, { readOnly: false })) ? 'on' : 'stale';
    };

    const skillSetup = async (agent: AgentDefinition): Promise<AgentSetup> => {
        try {
            const installed = await readFile(skillFile(agent), 'utf8');

            return installed === SKILL ? 'on' : 'stale';
        } catch {
            return 'off';
        }
    };

    const skillFile = (agent: AgentDefinition): string =>
        join(agent.skillsDir(environment), SKILL_NAME, 'SKILL.md');

    const find = (id: string): AgentDefinition => {
        const agent = AGENTS.find((candidate) => candidate.id === id);

        if (!agent) {
            throw new AgentError(`No agent called "${id}".`);
        }

        return agent;
    };

    const run = async (agent: AgentDefinition, args: string[]): Promise<void> => {
        const binary = await environment.locate(agent.binary);

        if (!binary) {
            throw new AgentError(`${agent.label} is not installed on this machine.`);
        }

        const { exitCode, output } = await environment.run([binary, ...args]);

        if (exitCode !== 0) {
            throw new AgentError(output.trim() || `${agent.label} exited with code ${exitCode}.`);
        }
    };

    return {
        list: (vault) => Promise.all(AGENTS.map((agent) => status(agent, vault))),

        async setMcp(id, vault, on) {
            const agent = find(id);

            // Replacing goes through removal: neither agent overwrites a server by name.
            if ((await agent.readServer(environment, name)) !== null) {
                await run(agent, agent.remove(name));
            }

            if (on) {
                await run(agent, agent.add(name, engineLaunch(vault, { readOnly: false })));
            }

            return status(agent, vault);
        },

        async setSkill(id, vault, on) {
            const agent = find(id);
            const file = skillFile(agent);

            if (on) {
                await mkdir(dirname(file), { recursive: true });
                await writeFile(file, SKILL);
            } else {
                await rm(file, { force: true });
                // Only if nothing else was put there.
                await rmdir(dirname(file)).catch(() => undefined);
            }

            return status(agent, vault);
        },
    };
}

/** `lore`, or `lore-dev` / `lore-agent`, so each build's agents reach their own vault. */
export function serverName(mode: string | undefined): string {
    return (mode && mode in modes ? modes[mode as keyof typeof modes] : modes.prod).cliName;
}

function launchOf(value: unknown): McpLaunch | null {
    const server = record(value);

    if (typeof server.command !== 'string') {
        return null;
    }

    return {
        args: Array.isArray(server.args) ? server.args.map(String) : [],
        command: server.command,
        env: Object.fromEntries(
            Object.entries(record(server.env)).map(([key, entry]) => [key, String(entry)]),
        ),
    };
}

async function readJson(path: string): Promise<unknown> {
    try {
        return JSON.parse(await readFile(path, 'utf8'));
    } catch {
        return null;
    }
}

function record(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}

function sameLaunch(left: McpLaunch, right: McpLaunch): boolean {
    return (
        left.command === right.command &&
        left.args.join('\0') === right.args.join('\0') &&
        left.env.LORE_VAULT === right.env.LORE_VAULT &&
        left.env.LORE_MCP_READONLY === right.env.LORE_MCP_READONLY
    );
}

function systemEnvironment(): AgentEnvironment {
    const env = Bun.env;

    return {
        env,
        home: homedir(),
        locate: createLocator(env),
        async run(command) {
            const child = Bun.spawn(command, {
                env: childEnv(),
                stderr: 'pipe',
                stdin: 'ignore',
                stdout: 'pipe',
                timeout: RUN_TIMEOUT_MS,
            });
            const [stdout, stderr] = await Promise.all([
                new Response(child.stdout).text(),
                new Response(child.stderr).text(),
            ]);

            return { exitCode: await child.exited, output: stderr || stdout };
        },
    };
}
