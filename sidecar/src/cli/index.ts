import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { agentEnvironment, AgentError, createAgents } from '../ai/agents';
import { createLocator } from '../ai/detect';
import { serveMcp } from '../ai/mcp';
import {
    type CliDependencies,
    doctor,
    listSkills,
    setMcp,
    setSkills,
    UsageError,
} from './commands';
import { cliContext } from './context';
import { commandHelp, isCommand, overview } from './help';
import { listVaults, vaultInUse } from './vaults';

interface ParsedArguments {
    help: boolean;
    json: boolean;
    positionals: string[];
    readOnly: boolean;
    vault: null | string;
}

const SWITCHES = ['install', 'uninstall'] as const;

export async function runCli(
    args: string[],
    dependencies: CliDependencies = systemDependencies(),
): Promise<number> {
    const { context, io } = dependencies;

    try {
        return await dispatch(args, dependencies);
    } catch (error) {
        if (error instanceof UsageError) {
            io.err(`${context.name}: ${error.message}\nRun \`${context.name} --help\` for usage.`);

            return 2;
        }

        if (error instanceof AgentError) {
            io.err(`${context.name}: ${error.message}`);

            return 1;
        }

        throw error;
    }
}

async function dispatch(args: string[], dependencies: CliDependencies): Promise<number> {
    const { context, io } = dependencies;
    const [command, ...rest] = args;

    if (command === undefined || command === '-h' || command === '--help') {
        io.out(overview(context));

        return 0;
    }

    if (command === '-v' || command === '--version') {
        io.out(`${context.name} ${context.version}`);

        return 0;
    }

    if (!isCommand(command)) {
        throw new UsageError(`unknown command "${command}"`);
    }

    const parsed = parseArguments(rest);

    if (parsed.help) {
        io.out(commandHelp(context, command));

        return 0;
    }

    const [subcommand, target, ...extra] = parsed.positionals;

    switch (command) {
        case 'doctor':
            rejectExtra(parsed.positionals);

            return doctor(dependencies, await vaultFor(parsed, dependencies));

        case 'help':
            return help(dependencies, subcommand);

        case 'mcp':
            if (isSwitch(subcommand)) {
                rejectExtra(extra);

                return setMcp(
                    dependencies,
                    target,
                    parsed.vault === null ? null : await vaultFor(parsed, dependencies),
                    subcommand === 'install',
                );
            }

            return serve(parsed, dependencies);

        case 'skills':
            if (subcommand === undefined) {
                return listSkills(dependencies, await vaultFor(parsed, dependencies));
            }

            if (!isSwitch(subcommand)) {
                throw new UsageError(`unknown skills command "${subcommand}"`);
            }

            rejectExtra(extra);

            return setSkills(
                dependencies,
                target,
                await vaultFor(parsed, dependencies),
                subcommand === 'install',
            );

        case 'vaults':
            rejectExtra(parsed.positionals);

            return listVaults(dependencies, parsed.json);
    }
}

function expandHome(path: string): string {
    return path === '~' || path.startsWith('~/') ? join(homedir(), path.slice(1)) : path;
}

function help({ context, io }: CliDependencies, topic: string | undefined): number {
    if (topic === undefined) {
        io.out(overview(context));

        return 0;
    }

    if (!isCommand(topic)) {
        throw new UsageError(`no help for "${topic}"`);
    }

    io.out(commandHelp(context, topic));

    return 0;
}

function isSwitch(value: string | undefined): value is (typeof SWITCHES)[number] {
    return SWITCHES.some((name) => name === value);
}

function parseArguments(args: string[]): ParsedArguments {
    const parsed: ParsedArguments = {
        help: false,
        json: false,
        positionals: [],
        readOnly: false,
        vault: null,
    };

    for (let index = 0; index < args.length; index++) {
        const argument = args[index];

        if (argument === '-h' || argument === '--help') {
            parsed.help = true;
        } else if (argument === '--json') {
            parsed.json = true;
        } else if (argument === '--read-only') {
            parsed.readOnly = true;
        } else if (argument === '--vault') {
            parsed.vault = args[++index] ?? null;

            if (parsed.vault === null) {
                throw new UsageError('--vault needs a path');
            }
        } else if (argument.startsWith('--vault=')) {
            parsed.vault = argument.slice('--vault='.length);
        } else if (argument.startsWith('-') && argument !== '-') {
            throw new UsageError(`unknown option "${argument}"`);
        } else {
            parsed.positionals.push(argument);
        }
    }

    return parsed;
}

function rejectExtra(extra: string[]): void {
    if (extra.length) {
        throw new UsageError(`unexpected "${extra.join(' ')}"`);
    }
}

async function serve(parsed: ParsedArguments, dependencies: CliDependencies): Promise<number> {
    const [path, ...extra] = parsed.positionals;

    rejectExtra(extra);

    if (path !== undefined && parsed.vault !== null) {
        throw new UsageError('name the vault once, either as an argument or with --vault');
    }

    const named = path ?? parsed.vault;
    const vault =
        named === null
            ? (dependencies.context.servedVault ?? (await vaultInUse(dependencies.context)))
            : await vaultFor({ vault: named }, dependencies);

    await dependencies.serve(vault, parsed.readOnly);

    return 0;
}

function systemDependencies(): CliDependencies {
    const context = cliContext();
    const environment = agentEnvironment();

    return {
        // The launcher names the build by its bundle identifier, not LORE_MODE.
        agents: createAgents({
            ...environment,
            env: { ...environment.env, LORE_MODE: context.mode },
        }),
        context,
        io: {
            err: (text) => console.error(text),
            out: (text) => console.log(text),
        },
        locate: createLocator(),
        serve: (vault, readOnly) =>
            serveMcp({
                ...Bun.env,
                LORE_MCP_READONLY: readOnly ? '1' : Bun.env.LORE_MCP_READONLY,
                LORE_VAULT: vault,
            }),
    };
}

async function vaultFor(
    parsed: Pick<ParsedArguments, 'vault'>,
    { context }: CliDependencies,
): Promise<string> {
    if (parsed.vault === null) {
        return vaultInUse(context);
    }

    const vault = resolve(expandHome(parsed.vault));
    const isFolder = await stat(vault).then(
        (entry) => entry.isDirectory(),
        () => false,
    );

    if (!isFolder) {
        throw new AgentError(`${parsed.vault}: not a folder`);
    }

    return vault;
}
