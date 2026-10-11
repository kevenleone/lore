import type { AiProvider } from './aiProvider';

import { getRepository } from '../data';
import { EngineAiProvider } from './engineAiProvider';
import { MockAiProvider } from './mockAiProvider';

let instance: AiProvider | null = null;

export function getAi(): AiProvider {
    if (!instance) {
        instance =
            typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
                ? new EngineAiProvider()
                : new MockAiProvider(() => getRepository().listItems());
    }

    return instance;
}

/** For a test that needs to see what the UI asked of the model. */
export function provideAi(provider: AiProvider | null): void {
    instance = provider;
}
