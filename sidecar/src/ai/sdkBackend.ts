import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
    generateText,
    type LanguageModel,
    Output,
    stepCountIs,
    streamText,
    tool,
    type ToolSet,
} from 'ai';
import { z } from 'zod';

import type { VaultStore } from '../index/store';

import { type AiBackend, AiError, describeToolCall } from './backend';
import { ToolError, toolsFor } from './tools';

/** Searches and reads one answer may spend before it has to be written. */
const MAX_STEPS = 8;

export type ApiProvider = 'anthropic' | 'google' | 'openai-compatible' | 'openai';

export interface ApiSelection {
    apiKey: null | string;
    baseUrl?: string;
    model: string;
    provider: ApiProvider;
}

export function sdkBackend(selection: ApiSelection): AiBackend {
    const model = languageModel(selection);

    return {
        async *chat({ messages, signal, store, system }) {
            const result = streamText({
                abortSignal: signal,
                messages: messages.map(({ role, text }) => ({
                    content: text,
                    role: role === 'ai' ? ('assistant' as const) : ('user' as const),
                })),
                model,
                stopWhen: stepCountIs(MAX_STEPS),
                system,
                tools: readingTools(store),
            });
            let written = false;

            for await (const part of result.fullStream) {
                if (part.type === 'text-start' && written) {
                    yield { text: '\n\n', type: 'delta' };
                }

                if (part.type === 'text-delta') {
                    written = true;
                    yield { text: part.text, type: 'delta' };
                }

                if (part.type === 'tool-call') {
                    yield { text: describeToolCall(part.toolName, part.input), type: 'activity' };
                }

                if (part.type === 'error' && !signal.aborted) {
                    throw new AiError('failed', message(part.error));
                }
            }
        },
        async object({ prompt, schema, signal, system }) {
            try {
                const result = await generateText({
                    abortSignal: signal,
                    model,
                    output: Output.object({ schema }),
                    prompt,
                    system,
                });

                return result.output;
            } catch (error) {
                throw new AiError('failed', message(error));
            }
        },
    };
}

function languageModel({ apiKey, baseUrl, model, provider }: ApiSelection): LanguageModel {
    const key = apiKey ?? '';

    switch (provider) {
        case 'anthropic':
            return createAnthropic({ apiKey: key })(model);
        case 'google':
            return createGoogleGenerativeAI({ apiKey: key })(model);
        case 'openai':
            return createOpenAI({ apiKey: key })(model);
        case 'openai-compatible':
            return createOpenAICompatible({
                apiKey: apiKey ?? undefined,
                baseURL: baseUrl ?? '',
                name: 'openai-compatible',
            })(model);
    }
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function readingTools(store: VaultStore): ToolSet {
    return Object.fromEntries(
        toolsFor('read').map((vaultTool) => [
            vaultTool.name,
            tool({
                description: vaultTool.description,
                async execute(input: unknown) {
                    try {
                        return await vaultTool.run(store, input);
                    } catch (error) {
                        if (!(error instanceof ToolError)) {
                            throw error;
                        }

                        return { error: error.message };
                    }
                },
                inputSchema: z.object(vaultTool.input),
            }),
        ]),
    );
}
