// The adapters, run against stand-in executables that print what each tool
// really prints. The claude and codex lines are trimmed from recorded runs.

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Harness } from '../../src/ai/harness/types';

import { AiError, type AiEvent } from '../../src/ai/backend';
import { extractJson } from '../../src/ai/harness/backend';
import { claude } from '../../src/ai/harness/claude';
import { codex } from '../../src/ai/harness/codex';
import { opencode } from '../../src/ai/harness/opencode';
import { runHarness } from '../../src/ai/harness/run';

let dir: string;

beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'lore-harness-'));
});

afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
});

function activity(events: readonly AiEvent[]): string[] {
    return events.filter((event) => event.type === 'activity').map((event) => event.text);
}

function answer(events: readonly AiEvent[]): string {
    return events
        .filter((event) => event.type === 'delta')
        .map((event) => event.text)
        .join('');
}

async function collect(
    harness: Harness,
    script: string,
    signal = new AbortController().signal,
): Promise<AiEvent[]> {
    const events: AiEvent[] = [];

    for await (const event of runHarness(
        harness,
        await standIn(script),
        { prompt: 'question', system: 'system' },
        signal,
    )) {
        events.push(event);
    }

    return events;
}

function printing(lines: readonly unknown[]): string {
    const body = lines.map((line) => JSON.stringify(line)).join('\n');

    return `cat <<'LINES'\n${body}\nLINES`;
}

async function standIn(script: string): Promise<string> {
    const path = join(dir, 'tool');

    await writeFile(path, `#!/bin/sh\n${script}\n`);
    await chmod(path, 0o755);

    return path;
}

const textDelta = (text: string) => ({
    event: { delta: { text, type: 'text_delta' }, index: 0, type: 'content_block_delta' },
    type: 'stream_event',
});
const textStart = {
    event: { content_block: { text: '', type: 'text' }, index: 0, type: 'content_block_start' },
    type: 'stream_event',
};

describe('claude', () => {
    it('streams text and reports each tool call', async () => {
        const events = await collect(
            claude,
            printing([
                { subtype: 'init', type: 'system' },
                textStart,
                textDelta('Let me look.'),
                {
                    message: {
                        content: [
                            {
                                input: { query: 'oven' },
                                name: 'mcp__lore__search',
                                type: 'tool_use',
                            },
                        ],
                    },
                    type: 'assistant',
                },
                textStart,
                textDelta('It runs hot. '),
                textDelta('[[oven-notes]]'),
                { is_error: false, result: 'ignored', subtype: 'success', type: 'result' },
            ]),
        );

        expect(answer(events)).toBe('Let me look.\n\nIt runs hot. [[oven-notes]]');
        expect(activity(events)).toEqual(['Searching “oven”']);
    });

    it('fails with what the tool said went wrong', async () => {
        const run = collect(
            claude,
            printing([
                { is_error: true, result: 'Not logged in', subtype: 'success', type: 'result' },
            ]),
        );

        await expect(run).rejects.toThrow('Not logged in');
    });

    it('keeps the prompt out of argv and gives the tool no built-in tools', () => {
        const { args, stdin } = claude.invoke({
            mcp: { args: ['mcp'], command: '/bin/engine', env: { LORE_VAULT: '/v' } },
            prompt: 'what did I save?',
            system: 'system',
            workdir: dir,
        });

        expect(stdin).toBe('what did I save?');
        expect(args).not.toContain('what did I save?');
        expect(args[args.indexOf('--tools') + 1]).toBe('');
        expect(args).toContain('--strict-mcp-config');
        expect(JSON.parse(args[args.indexOf('--mcp-config') + 1]).mcpServers.lore.command).toBe(
            '/bin/engine',
        );
    });
});

describe('codex', () => {
    it('takes the last message as the answer and the rest as activity', async () => {
        const events = await collect(
            codex,
            printing([
                { type: 'turn.started' },
                {
                    item: { text: 'I’ll check your notes.', type: 'agent_message' },
                    type: 'item.completed',
                },
                {
                    item: { arguments: { query: 'oven' }, tool: 'search', type: 'mcp_tool_call' },
                    type: 'item.started',
                },
                {
                    item: { text: 'The oven runs hot. [[oven-notes]]', type: 'agent_message' },
                    type: 'item.completed',
                },
                { type: 'turn.completed' },
            ]),
        );

        expect(answer(events)).toBe('The oven runs hot. [[oven-notes]]');
        expect(activity(events)).toEqual(['I’ll check your notes.', 'Searching “oven”']);
    });

    it('runs sandboxed, without the user’s own configuration', () => {
        const { args, stdin } = codex.invoke({
            mcp: { args: ['mcp'], command: '/bin/engine', env: { LORE_VAULT: '/my vault' } },
            prompt: 'question',
            system: 'system',
            workdir: dir,
        });

        expect(args[args.indexOf('--sandbox') + 1]).toBe('read-only');
        expect(args).toContain('--ignore-user-config');
        expect(args).toContain('web_search="disabled"');
        expect(args).toContain('features.shell_tool=false');
        expect(args).toContain('features.unified_exec=false');
        expect(args).toContain('mcp_servers.lore.env={LORE_VAULT="/my vault"}');
        expect(args[args.length - 1]).toBe('-');
        expect(stdin).toBe('system\n\nquestion');
    });
});

describe('opencode', () => {
    it('reads text and tool calls', async () => {
        const events = await collect(
            opencode,
            printing([
                { part: { type: 'step-start' }, type: 'step_start' },
                {
                    part: {
                        state: { input: { id: 'oven-notes' } },
                        tool: 'lore_read_item',
                        type: 'tool',
                    },
                    type: 'tool_use',
                },
                { part: { text: 'It runs hot.', type: 'text' }, type: 'text' },
            ]),
        );

        expect(answer(events)).toBe('It runs hot.');
        expect(activity(events)).toEqual(['Reading oven-notes']);
    });

    it('passes on the provider’s own error', async () => {
        const run = collect(
            opencode,
            `${printing([
                {
                    error: { data: { message: 'free tier refused' }, name: 'APIError' },
                    type: 'error',
                },
            ])}\nexit 1`,
        );

        await expect(run).rejects.toThrow('free tier refused');
    });

    it('allows the vault tools and denies every other one', () => {
        const { env } = opencode.invoke({ prompt: 'question', system: 'system', workdir: dir });

        expect(Object.entries(JSON.parse(env?.OPENCODE_CONFIG_CONTENT ?? '{}').permission)).toEqual(
            [
                ['*', 'deny'],
                ['lore_*', 'allow'],
            ],
        );
    });

    it('keeps the conversation out of the process list', () => {
        const { args, stdin } = opencode.invoke({
            prompt: 'what is my door code?',
            system: 'system',
            workdir: dir,
        });

        expect(args.join(' ')).not.toContain('door code');
        expect(stdin).toBe('system\n\nwhat is my door code?');
    });
});

describe('running a harness', () => {
    it('reports a crash with the tail of stderr', async () => {
        const run = collect(claude, 'echo "command not understood" >&2; exit 2');

        await expect(run).rejects.toBeInstanceOf(AiError);
        await expect(run).rejects.toThrow('command not understood');
    });

    it('does not hand the engine’s own token to the tool', async () => {
        Bun.env.LORE_TOKEN = 'secret-token';

        try {
            const events = await collect(
                claude,
                `printf '{"type":"result","subtype":"success","is_error":false,"result":"token=[%s]"}\\n' "$LORE_TOKEN"`,
            );

            expect(answer(events)).toBe('token=[]');
        } finally {
            delete Bun.env.LORE_TOKEN;
        }
    });

    it('stops the tool when the reader gives up', async () => {
        const abort = new AbortController();
        const started = Date.now();

        setTimeout(() => abort.abort(), 50);

        expect(await collect(claude, 'sleep 30', abort.signal)).toEqual([]);
        expect(Date.now() - started).toBeLessThan(5000);
    });

    it('skips output that is not an event', async () => {
        const events = await collect(
            codex,
            `echo "Reading additional input from stdin..."\n${printing([
                { item: { text: 'Done.', type: 'agent_message' }, type: 'item.completed' },
            ])}`,
        );

        expect(answer(events)).toBe('Done.');
    });
});

describe('extractJson', () => {
    it('finds the object inside a fenced or chatty reply', () => {
        expect(extractJson('Here you go:\n```json\n{"tags":["baking"]}\n```')).toEqual({
            tags: ['baking'],
        });
    });

    it('refuses a reply with no object in it', () => {
        expect(() => extractJson('I cannot help with that.')).toThrow(AiError);
    });
});
