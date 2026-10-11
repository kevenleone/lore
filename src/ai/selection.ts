import type { Prefs } from '../store/types';
import type { AiSelection } from './aiProvider';

/** Null where the preferences name no model, which is how AI is off. */
export function aiSelection(prefs: Prefs): AiSelection | null {
    if (!prefs.aiBackend) {
        return null;
    }

    return {
        backend: prefs.aiBackend,
        baseUrl: prefs.aiBaseUrl || undefined,
        model: prefs.aiModel || undefined,
    };
}
