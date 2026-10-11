import { AiError, type AiEvent, describeToolCall } from '../backend';
import { type Harness, type HarnessParser, record, text } from './types';

function createParser(): HarnessParser {
    // Codex reports whole messages, and narrates before it calls a tool. Only
    // the last message is the answer, which is not known until the run ends.
    let held = '';

    return {
        finish: () => (held ? [{ text: held, type: 'delta' }] : []),
        push(line) {
            if (line.type === 'error' || line.type === 'turn.failed') {
                throw new AiError(
                    'failed',
                    text(line.message) || text(record(line.error).message) || 'Codex failed.',
                );
            }

            const item = record(line.item);

            if (line.type === 'item.completed' && item.type === 'agent_message') {
                held = text(item.text);

                return [];
            }

            if (line.type !== 'item.started' || item.type !== 'mcp_tool_call') {
                return [];
            }

            const events: AiEvent[] = [];

            if (held) {
                events.push({ text: held, type: 'activity' });
                held = '';
            }

            events.push({
                text: describeToolCall(text(item.tool), item.arguments),
                type: 'activity',
            });

            return events;
        },
    };
}

export const codex: Harness = {
    binary: 'codex',
    createParser,
    id: 'codex-cli',
    invoke({ mcp, model, prompt, system, workdir }) {
        const args = [
            'exec',
            '--json',
            '--ephemeral',
            '--skip-git-repo-check',
            // The user's own MCP servers would otherwise be in reach of whatever
            // a saved web page managed to say to the model.
            '--ignore-user-config',
            '--sandbox',
            'read-only',
            '--cd',
            workdir,
        ];

        if (mcp) {
            const env = Object.entries(mcp.env)
                .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                .join(',');

            args.push(
                '-c',
                `mcp_servers.lore.command=${JSON.stringify(mcp.command)}`,
                '-c',
                `mcp_servers.lore.args=${JSON.stringify(mcp.args)}`,
                '-c',
                `mcp_servers.lore.env={${env}}`,
            );
        }

        if (model) {
            args.push('--model', model);
        }

        // `-` reads the prompt from stdin. Codex has no system-prompt flag.
        return { args: [...args, '-'], stdin: `${system}\n\n${prompt}` };
    },
    label: 'Codex',
};
