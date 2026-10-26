import type { CliContext } from './context';

interface CommandHelp {
    examples: Row[];
    options: Row[];
    summary: string;
    usage: string[];
}

type Row = [usage: string, summary: string];

interface Section {
    rows: Row[];
    title: string;
}

/** The commands the launcher hands to the engine; every other argument is a path to open. */
export const COMMANDS = ['help', 'mcp', 'skills', 'vaults', 'doctor'] as const;

export type CommandName = (typeof COMMANDS)[number];

const BANNER = String.raw`    __
   / /   ____  ________
  / /   / __ \/ ___/ _ \
 / /___/ /_/ / /  /  __/
/_____/\____/_/   \___/`;

const COLUMN = 34;
const OPTION_COLUMN = 28;

const AGENT_OPTIONS: Row[] = [
    ['<agent>', 'claude or codex; every one installed when left out'],
    ['--vault <path>', "a vault other than this Lore's own"],
];

export function commandHelp(context: CliContext, name: CommandName): string {
    const command = commands(context.name)[name];
    const block = (title: string, rows: string[]): string[] =>
        rows.length ? ['', title, ...rows] : [];

    return [
        'USAGE',
        ...command.usage.map((usage) => `  ${usage}`),
        '',
        ...wrap(command.summary, 78).map((text) => `  ${text}`),
        ...block(
            'OPTIONS',
            command.options.map((row) => line(row, OPTION_COLUMN, 2)),
        ),
        ...block(
            'EXAMPLES',
            command.examples.map((row) => line(row, 0, 2)),
        ),
        '',
    ].join('\n');
}

export function isCommand(name: string | undefined): name is CommandName {
    return COMMANDS.some((command) => command === name);
}

export function overview(context: CliContext): string {
    const tagline = ['your notes, as Markdown', context.label, `v${context.version}`].filter(
        Boolean,
    );

    return [
        `${BANNER}  ${tagline.join(' · ')}`,
        '',
        'USAGE',
        `  ${context.name} [<folder> | <file.md>…]`,
        `  ${context.name} <command> [options]`,
        ...sections(context.name).flatMap((section) => [
            '',
            section.title,
            ...section.rows.map((row) => line(row, COLUMN, 2)),
        ]),
        '',
    ].join('\n');
}

function commands(cli: string): Record<CommandName, CommandHelp> {
    return {
        doctor: {
            examples: [],
            options: [],
            summary:
                'Checks what an agent needs to reach the vault: that the vault exists, which agents are on PATH, whether each has the MCP server and the skills, and that a connected server actually starts.',
            usage: [`${cli} doctor`],
        },
        help: {
            examples: [[`${cli} help mcp`, 'everything about mcp']],
            options: [],
            summary: 'Shows every command, or every option of one.',
            usage: [`${cli} help [<command>]`, `${cli} <command> --help`],
        },
        mcp: {
            examples: [
                [`${cli} mcp install`, 'connect every agent found to the default vault'],
                [`${cli} mcp install claude --vault ~/Notes`, 'connect Claude Code to ~/Notes'],
                [`claude mcp add lore -- ${cli} mcp ~/Notes`, 'what install does, by hand'],
            ],
            options: [
                ...AGENT_OPTIONS,
                ['--read-only', 'serve without the tools that write (mcp only)'],
            ],
            summary:
                "Serves a vault over the Model Context Protocol on stdin and stdout, so an agent can search, read and write it. It runs without Lore being open. install registers it with each agent through the agent's own `mcp add`, under the name of this build.",
            usage: [
                `${cli} mcp [<vault>] [--read-only]`,
                `${cli} mcp install [<agent>] [--vault <path>]`,
                `${cli} mcp uninstall [<agent>]`,
            ],
        },
        skills: {
            examples: [[`${cli} skills install claude`, 'add them to ~/.claude/skills']],
            options: [AGENT_OPTIONS[0]],
            summary:
                'lore-docs teaches an agent how a Lore file is shaped, so what it writes into a vault shows up correctly. log-work (/log-work) writes up a coding session as a note in the vault and collection chosen for the repository.',
            usage: [
                `${cli} skills`,
                `${cli} skills install [<agent>]`,
                `${cli} skills uninstall [<agent>]`,
            ],
        },
        vaults: {
            examples: [[`${cli} vaults --json`, 'the same, for a script or an agent to read']],
            options: [['--json', 'print JSON instead of a list']],
            summary:
                "Lists every folder already used as a vault: the one Lore has open and the ones it opened before, the vault each agent is connected to, the vaults /log-work writes to, and Lore's default. The vault in use comes first; it is what every other command uses when --vault is left out.",
            usage: [`${cli} vaults [--json]`],
        },
    };
}

function line([left, right]: Row, column: number, indent: number): string {
    const lead = ' '.repeat(indent) + left;

    if (column === 0) {
        return `${lead}\n${' '.repeat(indent + 4)}${right}`;
    }

    return lead.length < indent + column
        ? lead.padEnd(indent + column) + right
        : `${lead}\n${' '.repeat(indent + column)}${right}`;
}

function sections(cli: string): Section[] {
    return [
        {
            rows: [
                [cli, 'open Lore'],
                [`${cli} .`, 'open this folder as a vault'],
                [`${cli} note.md`, 'open one Markdown file in its own window'],
            ],
            title: 'OPEN',
        },
        {
            rows: [
                [`${cli} mcp [<vault>]`, 'serve a vault to an agent over stdio'],
                [`${cli} mcp install [<agent>]`, 'connect Claude Code and Codex to the vault'],
                [`${cli} mcp uninstall [<agent>]`, 'disconnect them again'],
                [`${cli} skills`, 'the skills Lore ships, and where each is installed'],
                [
                    `${cli} skills install [<agent>]`,
                    'teach agents to write Lore notes and /log-work',
                ],
                [`${cli} skills uninstall [<agent>]`, 'remove those skills'],
            ],
            title: 'AGENTS',
        },
        {
            rows: [
                [`${cli} vaults`, 'every vault Lore, an agent or /log-work already uses'],
                [`${cli} doctor`, 'the vault, the agents found, and what is connected'],
                [`${cli} help <command>`, 'every option of one command'],
                [`${cli} -v, --version`, 'the version of this Lore'],
            ],
            title: 'SETUP',
        },
    ];
}

function wrap(text: string, width: number): string[] {
    const lines: string[] = [];
    let current = '';

    for (const word of text.split(' ')) {
        if (current && current.length + word.length + 1 > width) {
            lines.push(current);
            current = word;
        } else {
            current = current ? `${current} ${word}` : word;
        }
    }

    return current ? [...lines, current] : lines;
}
