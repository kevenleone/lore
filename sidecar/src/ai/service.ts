import type { HarnessId } from './harness/types';

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

export interface AiService {
    backend(selection: BackendSelection): Promise<AiBackend>;
    clearKey(provider: string): Promise<void>;
    setKey(provider: string, key: string): Promise<void>;
    status(): Promise<BackendStatus[]>;
}

export type BackendId = ApiProvider | HarnessId;

export interface BackendSelection {
    /** Only for `openai-compatible`: Ollama, LM Studio, a gateway. */
    baseUrl?: string;
    id: string;
    model?: string;
}

export interface BackendStatus {
    /** A harness that is installed. Always true for an API provider. */
    available: boolean;
    defaultModel?: string;
    hasKey: boolean;
    id: BackendId;
    kind: 'api' | 'harness';
    label: string;
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
            await secrets.delete(apiProvider(provider).id);
        },
        async setKey(provider, key) {
            await secrets.set(apiProvider(provider).id, key);
        },
        async status() {
            const harnesses = await Promise.all(
                HARNESSES.map(async (harness): Promise<BackendStatus> => ({
                    available: (await locate(harness.binary)) !== null,
                    hasKey: false,
                    id: harness.id,
                    kind: 'harness',
                    label: harness.label,
                })),
            );
            const providers = await Promise.all(
                API_PROVIDERS.map(async (provider): Promise<BackendStatus> => ({
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
