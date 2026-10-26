import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { CliDependencies } from '../../src/cli/commands';

import { type AgentEnvironment, createAgents } from '../../src/ai/agents';
import { runCli } from '../../src/cli';
import { cliContext } from '../../src/cli/context';
import { COMMANDS } from '../../src/cli/help';

let home: string;
let vault: string;
let out: string[];
let err: string[];
let served: { readOnly: boolean; vault: string }[];

async function claudeServer(): Promise<{ env: { LORE_VAULT: string } }> {
    const config = JSON.parse(await readFile(join(home, '.claude.json'), 'utf8'));

    return config.mcpServers['lore-agent'];
}

function dependencies(env: Record<string, string> = { LORE_MODE: 'agent' }): CliDependencies {
    return {
        agents: createAgents(environment(['claude'])),
        context: { ...cliContext(env, 'darwin', home), defaultVault: vault },
        io: { err: (text) => err.push(text), out: (text) => out.push(text) },
        locate: async () => null,
        serve: async (path, readOnly) => {
            served.push({ readOnly, vault: path });
        },
    };
}

function environment(installed: string[]): AgentEnvironment {
    return {
        env: { LORE_MODE: 'agent' },
        home,
        locate: async (binary) => (installed.includes(binary) ? `/bin/${binary}` : null),
        async run([, ...args]) {
            const path = join(home, '.claude.json');
            const config = JSON.parse(await readFile(path, 'utf8').catch(() => '{}'));
            const servers = config.mcpServers ?? {};

            if (args[1] === 'remove') {
                delete servers[args[4]];
            } else {
                const split = args.indexOf('--');

                servers[args[4]] = {
                    args: args.slice(split + 2),
                    command: args[split + 1],
                    env: { LORE_VAULT: args[6].slice('LORE_VAULT='.length) },
                };
            }

            await writeFile(path, JSON.stringify({ ...config, mcpServers: servers }));

            return { exitCode: 0, output: '' };
        },
    };
}

beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), 'lore-cli-home-'));
    vault = await mkdtemp(join(tmpdir(), 'lore-cli-vault-'));
    out = [];
    err = [];
    served = [];
});

afterEach(async () => {
    await rm(home, { force: true, recursive: true });
    await rm(vault, { force: true, recursive: true });
});

describe('cli context', () => {
    it('names the build from the bundle identifier the launcher passes', () => {
        const context = cliContext({ LORE_APP_ID: 'com.lore.app.dev' }, 'darwin', '/Users/me');

        expect(context.name).toBe('lore-dev');
        expect(context.defaultVault).toBe(
            '/Users/me/Library/Application Support/com.lore.app.dev/Vault',
        );
    });

    it('falls back to LORE_MODE, then to the installed build', () => {
        expect(cliContext({ LORE_MODE: 'agent' }, 'darwin', '/h').name).toBe('lore-agent');
        expect(cliContext({}, 'linux', '/h').defaultVault).toBe(
            '/h/.local/share/com.lore.app/Vault',
        );
    });
});

describe('help', () => {
    it('lists every command under the build’s own name', async () => {
        expect(await runCli(['--help'], dependencies())).toBe(0);

        const text = out.join('\n');

        expect(text).toContain('lore-agent [<folder> | <file.md>…]');
        expect(text).toContain('AGENT');

        for (const command of COMMANDS) {
            expect(text).toContain(`lore-agent ${command}`);
        }
    });

    it('explains one command, either way it is asked', async () => {
        for (const command of COMMANDS) {
            out = [];
            expect(await runCli(['help', command], dependencies())).toBe(0);

            const viaHelp = out.join('\n');

            out = [];
            expect(await runCli([command, '-h'], dependencies())).toBe(0);
            expect(out.join('\n')).toBe(viaHelp);
            expect(viaHelp).toStartWith('USAGE');
        }
    });

    it('refuses what it does not know, pointing at the help', async () => {
        expect(await runCli(['frobnicate'], dependencies())).toBe(2);
        expect(await runCli(['mcp', '--force'], dependencies())).toBe(2);
        expect(await runCli(['skills', 'reinstall'], dependencies())).toBe(2);
        expect(err.join('\n')).toContain('Run `lore-agent --help`');
    });

    it('prints its version', async () => {
        expect(await runCli(['-v'], dependencies())).toBe(0);
        expect(out).toEqual([`lore-agent ${cliContext().version}`]);
    });
});

describe('mcp', () => {
    it('serves the vault named, the one an agent registered, or the default', async () => {
        await runCli(['mcp', vault, '--read-only'], dependencies());
        await runCli(['mcp'], dependencies({ LORE_MODE: 'agent', LORE_VAULT: '/registered' }));
        await runCli(['mcp'], dependencies());

        expect(served).toEqual([
            { readOnly: true, vault },
            { readOnly: false, vault: '/registered' },
            { readOnly: false, vault },
        ]);
    });

    it('refuses to serve a folder that is not there', async () => {
        expect(await runCli(['mcp', join(vault, 'missing')], dependencies())).toBe(1);
        expect(served).toEqual([]);
    });

    it('connects every agent found, and keeps the vault it already serves', async () => {
        const notes = join(vault, 'Notes');

        await mkdir(notes);

        expect(await runCli(['mcp', 'install', '--vault', notes], dependencies())).toBe(0);
        expect((await claudeServer()).env.LORE_VAULT).toBe(notes);
        expect(out[0]).toContain('Claude Code');
        expect(out.join('\n')).not.toContain('Codex');

        expect(await runCli(['mcp', 'install'], dependencies())).toBe(0);
        expect((await claudeServer()).env.LORE_VAULT).toBe(notes);
    });

    it('names an agent that is not installed, rather than skipping it', async () => {
        expect(await runCli(['mcp', 'install', 'codex'], dependencies())).toBe(1);
        expect(err.join('\n')).toContain('Codex is not installed');
        expect(await runCli(['mcp', 'install', 'cursor'], dependencies())).toBe(2);
    });

    it('disconnects', async () => {
        await runCli(['mcp', 'install'], dependencies());

        expect(await runCli(['mcp', 'uninstall', 'claude'], dependencies())).toBe(0);
        expect(JSON.parse(await readFile(join(home, '.claude.json'), 'utf8')).mcpServers).toEqual(
            {},
        );
    });
});

describe('skills', () => {
    it('installs both skills and lists where they went', async () => {
        expect(await runCli(['skills', 'install', 'claude'], dependencies())).toBe(0);

        out = [];
        await runCli(['skills'], dependencies());

        const text = out.join('\n');

        expect(text).toContain(`✓ lore-docs   ${join(home, '.claude/skills/lore-docs/SKILL.md')}`);
        expect(text).toContain(`✓ log-work    ${join(home, '.claude/skills/log-work/SKILL.md')}`);
    });
});

describe('doctor', () => {
    it('says what to run for whatever is missing', async () => {
        expect(await runCli(['doctor'], dependencies())).toBe(0);

        const text = out.join('\n');

        expect(text).toContain('lore-agent mcp install claude');
        expect(text).toContain('lore-agent skills install claude');
        expect(text).toContain('Codex');
    });
});

describe('launcher', () => {
    it('hands the engine exactly the commands it knows', async () => {
        const script = await readFile(
            join(import.meta.dir, '../../../src-tauri/resources/lore'),
            'utf8',
        );
        const [, list] = script.match(/^\s+([\w |-]+\*)\)$/m) ?? [];

        expect(list.split('|').map((name) => name.trim())).toEqual([...COMMANDS, '-*']);
    });
});
