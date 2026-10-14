import type { Item } from '@lore/types';

import { Elysia } from 'elysia';

import {
    type DocumentFacts,
    documentItem,
    FrontmatterUnreadable,
    patchDocument,
} from '../services/document';

interface DocumentBody {
    facts?: DocumentFacts;
    patch?: Partial<Item>;
    text?: unknown;
}

/*
 * A Markdown file opened in a window of its own. Text in, an item or
 * text out: no path is named and nothing is read or written here, so
 * these sit outside the workspace guard and never touch a vault.
 */
export function documentRoutes() {
    return new Elysia()
        .post('/documents/parse', ({ body, set }) => {
            const { facts, text } = body as DocumentBody;

            if (typeof text !== 'string' || !facts) {
                set.status = 400;

                return { error: 'text_required' };
            }

            return documentItem(text, facts);
        })

        .post('/documents/patch', ({ body, set }) => {
            const { facts, patch, text } = body as DocumentBody;

            if (typeof text !== 'string' || !facts) {
                set.status = 400;

                return { error: 'text_required' };
            }

            try {
                const patched = patchDocument(text, facts, patch ?? {});

                return { item: documentItem(patched, facts), text: patched };
            } catch (error) {
                if (!(error instanceof FrontmatterUnreadable)) {
                    throw error;
                }

                set.status = 422;

                return { error: error.message };
            }
        });
}
