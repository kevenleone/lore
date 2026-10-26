import { readFile, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import type { CliContext } from './context';

import { readKnownVaults } from '../services/known-vaults';
import { type CliDependencies, tilde } from './commands';

export interface VaultCandidate {
    exists: boolean;
    inUse: boolean;
    path: string;
    sources: string[];
}

/** Every folder this machine already treats as a vault, the one in use first. */
export async function findVaults({ agents, context }: CliDependencies): Promise<VaultCandidate[]> {
    const known = await readKnownVaults(context.vaultsFile);
    const inUse = known.current ?? context.defaultVault;
    const found = new Map<string, string[]>();

    const add = (path: string, source: string): void => {
        const key = resolve(path);

        found.set(key, [...(found.get(key) ?? []), source]);
    };

    if (known.current) {
        add(known.current, 'open in Lore');
    }

    for (const entry of known.recent.filter((recent) => recent.path !== known.current)) {
        add(entry.path, `opened in Lore ${entry.openedAt.slice(0, 10)}`);
    }

    for (const agent of await agents.list(inUse)) {
        const registered = await agents.registeredVault(agent.id);

        if (registered) {
            add(registered, `${agent.label} MCP`);
        }
    }

    for (const [repository, vault] of await logWorkVaults(context.logWorkFile)) {
        add(vault, `log-work: ${basename(repository)}`);
    }

    add(context.defaultVault, "Lore's default");

    const candidates = await Promise.all(
        [...found].map(async ([path, sources]) => ({
            exists: await isFolder(path),
            inUse: path === resolve(inUse),
            path,
            sources,
        })),
    );

    return candidates.sort((left, right) => Number(right.inUse) - Number(left.inUse));
}

export async function listVaults(dependencies: CliDependencies, json: boolean): Promise<number> {
    const { context, io } = dependencies;
    const vaults = await findVaults(dependencies);

    if (json) {
        io.out(JSON.stringify({ vaults }, null, 4));

        return 0;
    }

    for (const vault of vaults) {
        io.out(`${mark(vault)} ${tilde(vault.path)}${vault.exists ? '' : '  (missing)'}`);
        io.out(`    ${vault.sources.join(' · ')}`);
    }

    io.out(
        `\n✓ is the vault in use. Use another with \`${context.name} mcp install --vault <path>\`.`,
    );

    return 0;
}

/** The vault Lore opened last, else the one it opens when none has been chosen. */
export async function vaultInUse(context: CliContext): Promise<string> {
    return (await readKnownVaults(context.vaultsFile)).current ?? context.defaultVault;
}

async function isFolder(path: string): Promise<boolean> {
    return stat(path).then(
        (entry) => entry.isDirectory(),
        () => false,
    );
}

/** Repository → vault, from the setting the log-work skill keeps. */
async function logWorkVaults(file: string): Promise<[string, string][]> {
    try {
        const { repositories } = JSON.parse(await readFile(file, 'utf8')) as {
            repositories?: Record<string, { vault?: unknown }>;
        };

        return Object.entries(repositories ?? {}).flatMap(([repository, setting]) =>
            typeof setting?.vault === 'string' ? [[repository, setting.vault]] : [],
        );
    } catch {
        return [];
    }
}

function mark(vault: VaultCandidate): string {
    if (!vault.exists) {
        return '✗';
    }

    return vault.inUse ? '✓' : '·';
}
