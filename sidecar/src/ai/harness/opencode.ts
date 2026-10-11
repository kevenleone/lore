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
        const config: Record<string, unknown> = {
            permission: { bash: 'deny', edit: 'deny', webfetch: 'deny' },
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
            args: [...args, `${system}\n\n${prompt}`],
            env: { OPENCODE_CONFIG_CONTENT: JSON.stringify(config) },
        };
    },
    label: 'opencode',
};
