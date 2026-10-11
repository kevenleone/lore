import type { ItemType } from '../store/types';

const URL_RE = /^https?:\/\/\S+$/i;
const FENCE_RE = /```|^\s{4}\S|;\s*$|=>|function\s|const\s|=\s*\(/m;
const TASK_RE = /^\s*(\[ \]|- \[ \]|todo:|follow up|remind|review|send|call|email)\b/i;
const IMAGE_RE = /\.(png|jpe?g|gif|webp|heic|svg)(\?|$)/i;

// Local on purpose: it runs on every keystroke of a capture, and what is being
// typed must not go to a model before the user has decided to keep it.
export function detectType(input: string): ItemType {
    const text = input.trim();

    if (IMAGE_RE.test(text)) {
        return 'image';
    }

    if (URL_RE.test(text)) {
        return 'link';
    }

    if (TASK_RE.test(text)) {
        return 'task';
    }

    if (FENCE_RE.test(text)) {
        return 'code';
    }

    return 'note';
}
