import type { AiBackendStatus } from '@lore/types';

import { type AiBackend, AiError } from './backend';
import { keychain, type SecretStore } from './credentials';
import { createLocator, type Locate } from './detect';
import { harnessBackend, HARNESSES } from './harness/backend';
import { type ApiProvider, sdkBackend } from './sdkBackend';

interface ApiDefinition {
    /** Absent where no model id is safe to assume; the user names one. */
    defaultModel?: string;
    id: ApiProvider;
    label: string;
}

const API_PROVIDERS: readonly ApiDefinition[] = [
    { defaultModel: 'claude-sonnet-5-5', id: 'anthropic', label: 'Anthropic' },
    { id: 'openai', label: 'OpenAI' },
    { id: 'google', label: 'Google Gemini' },
    { id: 'openai-compatible', label: 'OpenAI-compatible endpoint' },
];

const COMPATIBLE_ENDPOINT = 'openai-compatible.endpoint';

export interface AiService {
    backend(selection: BackendSelection): Promise<AiBackend>;
    clearKey(provider: string): Promise<void>;
    /** `baseUrl` is the endpoint an `openai-compatible` key is for, and required with one. */
    setKey(provider: string, key: string, baseUrl?: string): Promise<void>;
    status(): Promise<AiBackendStatus[]>;
}

export interface BackendSelection {
    /** Only for `openai-compatible`: Ollama, LM Studio, a gateway. */
    baseUrl?: string;
    id: string;
    model?: string;
}

export function createAiService(
    secrets: SecretStore = keychain(),
    locate: Locate = createLocator(),
): AiService {
    return {
        async backend({ baseUrl, id, model }) {
            const harness = HARNESSES.find((candidate) => candidate.id === id);

            if (harness) {
                const binary = await locate(harness.binary);

                if (!binary) {
                    throw new AiError(
                        'not_configured',
                        `${harness.label} is not installed on this machine.`,
                    );
                }

                return harnessBackend(harness, binary, model || undefined);
            }

            const provider = apiProvider(id);
            const apiKey = await secrets.get(provider.id);
            const chosen = model || provider.defaultModel;

            if (provider.id === 'openai-compatible' && !baseUrl) {
                throw new AiError('not_configured', 'Set the endpoint URL in Settings.');
            }

            // The endpoint is named by the renderer on every request, and the key
            // must not follow it to whatever address a request names.
            if (
                provider.id === 'openai-compatible' &&
                apiKey &&
                originOf(baseUrl) !== (await secrets.get(COMPATIBLE_ENDPOINT))
            ) {
                throw new AiError(
                    'not_configured',
                    'The saved API key is for another endpoint. Save it again in Settings to use it with this one.',
                );
            }

            if (provider.id !== 'openai-compatible' && !apiKey) {
                throw new AiError(
                    'not_configured',
                    `Add an ${provider.label} API key in Settings.`,
                );
            }

            if (!chosen) {
                throw new AiError('not_configured', `Name a ${provider.label} model in Settings.`);
            }

            return sdkBackend({ apiKey, baseUrl, model: chosen, provider: provider.id });
        },
        async clearKey(provider) {
            const { id } = apiProvider(provider);

            await secrets.delete(id);

            if (id === 'openai-compatible') {
                await secrets.delete(COMPATIBLE_ENDPOINT);
            }
        },
        async setKey(provider, key, baseUrl) {
            const { id } = apiProvider(provider);

            if (id === 'openai-compatible') {
                const endpoint = originOf(baseUrl);

                if (!endpoint) {
                    throw new AiError(
                        'not_configured',
                        'Set the endpoint URL before saving a key for it.',
                    );
                }

                await secrets.set(COMPATIBLE_ENDPOINT, endpoint);
            }

            await secrets.set(id, key);
        },
        async status() {
            const harnesses = await Promise.all(
                HARNESSES.map(async (harness): Promise<AiBackendStatus> => ({
                    available: (await locate(harness.binary)) !== null,
                    hasKey: false,
                    id: harness.id,
                    kind: 'harness',
                    label: harness.label,
                })),
            );
            const providers = await Promise.all(
                API_PROVIDERS.map(async (provider): Promise<AiBackendStatus> => ({
                    available: true,
                    defaultModel: provider.defaultModel,
                    hasKey: (await secrets.get(provider.id)) !== null,
                    id: provider.id,
                    kind: 'api',
                    label: provider.label,
                })),
            );

            return [...harnesses, ...providers];
        },
    };
}

function apiProvider(id: string): ApiDefinition {
    const provider = API_PROVIDERS.find((candidate) => candidate.id === id);

    if (!provider) {
        throw new AiError('not_configured', `"${id}" is not a provider that takes a key.`);
    }

    return provider;
}

function originOf(url: string | undefined): null | string {
    try {
        const { origin, protocol } = new URL(url ?? '');

        return protocol === 'http:' || protocol === 'https:' ? origin : null;
    } catch {
        return null;
    }
}
