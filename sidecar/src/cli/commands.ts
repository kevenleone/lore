import type { AgentSetup, AgentStatus } from '@lore/types';

import { stat } from 'node:fs/promises';
import { homedir } from 'node:os';

import type { Locate } from '../ai/detect';
import type { CliContext } from './context';

import { AgentError, type Agents } from '../ai/agents';
import { vaultInUse } from './vaults';

export interface CliDependencies {
    agents: Agents;
    context: CliContext;
    io: CliIo;
    locate: Locate;
    serve(vault: string, readOnly: boolean): Promise<void>;
}

export interface CliIo {
    err(text: string): void;
    out(text: string): void;
}

/** A mistake in what was typed: exit code 2, with a pointer to the help. */
export class UsageError extends Error {}

const LABEL_WIDTH = 14;

const SETUP_MARKS: Record<AgentSetup, string> = {
    off: '·',
    on: '✓',
    stale: '!',
};

export async function doctor(dependencies: CliDependencies, vault: string): Promise<number> {
    const { agents, context, io, locate } = dependencies;
    let failures = 0;

    const vaultExists = await isFolder(vault);
    const command = await locate(context.name);

    io.out(`${'vault in use'.padEnd(LABEL_WIDTH)}${tilde(vault)}`);
    io.out(
        `${''.padEnd(LABEL_WIDTH)}${vaultExists ? '✓ exists' : '· not created yet — Lore makes it on first launch'}; \`${context.name} vaults\` lists the others`,
    );
    io.out(
        `${'command'.padEnd(LABEL_WIDTH)}${command ? `✓ ${command}` : `· ${context.name} is not on PATH`}`,
    );
    io.out('');

    for (const agent of await agents.list(vault)) {
        if (!agent.available) {
            io.out(`· ${agent.label.padEnd(LABEL_WIDTH)}not found on PATH`);
            continue;
        }

        io.out(`${SETUP_MARKS[overall(agent)]} ${agent.label}`);
        io.out(`    mcp       ${mcpNote(context, agent)}`);

        const registered = agent.mcp === 'stale' ? await agents.registeredVault(agent.id) : null;

        if (registered) {
            io.out(`              serves ${tilde(registered)}`);
        }

        io.out(`    skills    ${skillsNote(context, agent)}`);

        if (agent.mcp === 'on') {
            const probe = await agents.test(agent.id);

            failures += probe.ok ? 0 : 1;
            io.out(
                `    server    ${probe.ok ? '✓' : '✗'} ${probe.detail} (${Math.round(probe.ms)}ms)`,
            );
        }
    }

    return failures ? 1 : 0;
}

export async function listSkills(dependencies: CliDependencies, vault: string): Promise<number> {
    const { agents, context, io } = dependencies;

    for (const agent of await agents.list(vault)) {
        io.out(`${agent.label}${agent.available ? '' : '  (not found on PATH)'}`);

        for (const skill of await agents.skills(agent.id)) {
            io.out(
                `  ${SETUP_MARKS[skill.setup]} ${skill.name.padEnd(LABEL_WIDTH - 2)}${skillNote(skill.setup, skill.path)}`,
            );
        }

        io.out('');
    }

    io.out(`Install or update them with \`${context.name} skills install\`.`);

    return 0;
}

/** Without a vault, an agent keeps the one it is connected to, so a reinstall never moves it. */
export async function setMcp(
    dependencies: CliDependencies,
    agentId: string | undefined,
    vault: null | string,
    on: boolean,
): Promise<number> {
    const { agents, context, io } = dependencies;
    const targets = await targetAgents(agents, agentId, vault ?? (await vaultInUse(context)));

    for (const agent of targets) {
        const registered = await agents.registeredVault(agent.id);
        const kept = registered && (await isFolder(registered)) ? registered : null;
        const target = vault ?? kept ?? (await vaultInUse(context));
        const status = await agents.setMcp(agent.id, target, on);
        const detail = on ? `${status.server} → ${tilde(target)}` : `${status.server} removed`;

        io.out(
            `${SETUP_MARKS[on ? status.mcp : 'on']} ${agent.label.padEnd(LABEL_WIDTH)}${detail}`,
        );
    }

    if (on) {
        io.out(`\nCheck it with \`${context.name} doctor\`.`);
    }

    return 0;
}

export async function setSkills(
    dependencies: CliDependencies,
    agentId: string | undefined,
    vault: string,
    on: boolean,
): Promise<number> {
    const { agents, io } = dependencies;
    const targets = await targetAgents(agents, agentId, vault);

    for (const agent of targets) {
        await agents.setSkill(agent.id, vault, on);
        io.out(`✓ ${agent.label.padEnd(LABEL_WIDTH)}${on ? 'installed' : 'removed'}`);

        for (const skill of await agents.skills(agent.id)) {
            io.out(`    ${skill.name.padEnd(LABEL_WIDTH - 2)}${tilde(skill.path)}`);
        }
    }

    return 0;
}

export function tilde(path: string): string {
    const home = homedir();

    return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

async function isFolder(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isDirectory();
    } catch {
        return false;
    }
}

function mcpNote(context: CliContext, agent: AgentStatus): string {
    const notes: Record<AgentSetup, string> = {
        off: `· not connected — run \`${context.name} mcp install ${agent.id}\``,
        on: `✓ connected as “${agent.server}”`,
        stale: `! “${agent.server}” points at another vault or an older Lore — run \`${context.name} mcp install ${agent.id}\``,
    };

    return notes[agent.mcp];
}

function overall(agent: AgentStatus): AgentSetup {
    if (agent.mcp === 'on' && agent.skill === 'on') {
        return 'on';
    }

    return agent.mcp === 'off' && agent.skill === 'off' ? 'off' : 'stale';
}

function skillNote(setup: AgentSetup, path: string): string {
    const notes: Record<AgentSetup, string> = {
        off: 'not installed',
        on: tilde(path),
        stale: `${tilde(path)} (not this version's)`,
    };

    return notes[setup];
}

function skillsNote(context: CliContext, agent: AgentStatus): string {
    const notes: Record<AgentSetup, string> = {
        off: `· not installed — run \`${context.name} skills install ${agent.id}\``,
        on: '✓ installed',
        stale: `! missing or out of date — run \`${context.name} skills install ${agent.id}\``,
    };

    return notes[agent.skill];
}

async function targetAgents(
    agents: Agents,
    agentId: string | undefined,
    vault: string,
): Promise<AgentStatus[]> {
    const all = await agents.list(vault);

    if (agentId) {
        const agent = all.find((candidate) => candidate.id === agentId);

        if (!agent) {
            throw new UsageError(
                `No agent called "${agentId}". Choose one of: ${all.map((candidate) => candidate.id).join(', ')}.`,
            );
        }

        return [agent];
    }

    const available = all.filter((agent) => agent.available);

    if (!available.length) {
        throw new AgentError(
            `No agent found on PATH. Looked for: ${all.map((agent) => agent.id).join(', ')}.`,
        );
    }

    return available;
}
