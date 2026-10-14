import { AiError, describeToolCall } from '../backend';
import { type Harness, type HarnessParser, record, text } from './types';

function createParser(): HarnessParser {
    let streamed = false;

    return {
        finish: () => [],
        push(line) {
            const part = record(line.part);

            if (line.type === 'error') {
                const error = record(line.error);

                throw new AiError(
                    'failed',
                    text(record(error.data).message) || text(error.name) || 'opencode failed.',
                );
            }

            if (line.type === 'tool_use') {
                return [
                    {
                        text: describeToolCall(text(part.tool), record(part.state).input),
                        type: 'activity',
                    },
                ];
            }

            if (line.type !== 'text' || !text(part.text)) {
                return [];
            }

            const separator = streamed ? '\n\n' : '';

            streamed = true;

            return [{ text: `${separator}${text(part.text)}`, type: 'delta' }];
        },
    };
}

export const opencode: Harness = {
    binary: 'opencode',
    createParser,
    id: 'opencode-cli',
    invoke({ mcp, model, prompt, system, workdir }) {
        // Later rules win, so this leaves the vault tools and nothing else: not
        // the built-in ones, and not the MCP servers of the user's own config,
        // which this is merged over.
        const config: Record<string, unknown> = {
            permission: { '*': 'deny', 'lore_*': 'allow' },
            share: 'disabled',
        };

        if (mcp) {
            config.mcp = {
                lore: {
                    command: [mcp.command, ...mcp.args],
                    enabled: true,
                    environment: mcp.env,
                    type: 'local',
                },
            };
        }

        const args = ['run', '--format', 'json', '--pure', '--dir', workdir];

        if (model) {
            args.push('--model', model);
        }

        return {
            args,
            env: { OPENCODE_CONFIG_CONTENT: JSON.stringify(config) },
            stdin: `${system}\n\n${prompt}`,
        };
    },
    label: 'Opencode',
};
