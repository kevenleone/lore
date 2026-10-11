import { AiError, type AiEvent, describeToolCall } from '../backend';
import { type Harness, type HarnessParser, record, text } from './types';

function createParser(): HarnessParser {
    let streamed = false;

    return {
        finish: () => [],
        push(line) {
            // Without the vault the model can only say it has nothing to go on,
            // which reads as an answer rather than as the failure it is.
            if (line.type === 'system' && line.subtype === 'init') {
                const servers = Array.isArray(line.mcp_servers) ? line.mcp_servers : [];

                if (servers.map(record).some((server) => server.status === 'failed')) {
                    throw new AiError('failed', 'Claude Code could not start the vault tools.');
                }

                return [];
            }

            if (line.type === 'stream_event') {
                const event = record(line.event);
                const delta = record(event.delta);

                if (event.type === 'content_block_delta' && delta.type === 'text_delta') {
                    streamed = true;

                    return [{ text: text(delta.text), type: 'delta' }];
                }

                // Text on either side of a tool call arrives as separate blocks.
                if (
                    event.type === 'content_block_start' &&
                    record(event.content_block).type === 'text' &&
                    streamed
                ) {
                    return [{ text: '\n\n', type: 'delta' }];
                }

                return [];
            }

            if (line.type === 'assistant') {
                const content = record(line.message).content;

                return (Array.isArray(content) ? content : [])
                    .map(record)
                    .filter((block) => block.type === 'tool_use')
                    .map((block): AiEvent => ({
                        text: describeToolCall(text(block.name), block.input),
                        type: 'activity',
                    }));
            }

            if (line.type !== 'result') {
                return [];
            }

            if (line.is_error || line.subtype !== 'success') {
                throw new AiError(
                    'failed',
                    text(line.result) || `Claude Code stopped: ${text(line.subtype)}`,
                );
            }

            return streamed ? [] : [{ text: text(line.result), type: 'delta' }];
        },
    };
}

export const claude: Harness = {
    binary: 'claude',
    createParser,
    id: 'claude-cli',
    invoke({ mcp, model, prompt, system }) {
        const args = [
            '-p',
            '--output-format',
            'stream-json',
            '--verbose',
            '--include-partial-messages',
            // No built-in tool at all: what is in the vault may have come from
            // the web, and must not be able to make the model run or write anything.
            '--tools',
            '',
            '--strict-mcp-config',
            '--setting-sources',
            '',
            '--no-session-persistence',
            '--system-prompt',
            system,
        ];

        if (mcp) {
            args.push(
                '--mcp-config',
                JSON.stringify({
                    mcpServers: { lore: { args: mcp.args, command: mcp.command, env: mcp.env } },
                }),
                '--allowedTools',
                'mcp__lore__*',
            );
        }

        if (model) {
            args.push('--model', model);
        }

        return { args, stdin: prompt };
    },
    label: 'Claude Code',
};
