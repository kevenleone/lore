// A file opened on its own may be anybody's, so the contract is stricter than
// a vault item's: an edit changes the keys it is about and no other byte.

import type { Item } from '@lore/types';

import { describe, expect, it } from 'bun:test';

import { createApp } from '../../src/app';
import {
    type DocumentFacts,
    documentItem,
    FrontmatterUnreadable,
    patchDocument,
    patchFrontmatter,
} from '../../src/services/document';
import { splitFrontmatter } from '../../src/utils/markdown';

const FACTS: DocumentFacts = {
    created: '2026-01-02T03:04:05.000Z',
    id: '/tmp/readme.md',
    modified: '2026-02-03T04:05:06.000Z',
    stem: 'readme',
};

const HAND_WRITTEN = `---
# who wrote this
title:   "Quoted"   # keep me
tags: [a,  b]

x-unknown:
    deep:   { flow: 1 }
due: 2026-03-04
---

# Heading

Body text.
`;

const set = (text: string, key: string, value: unknown): string =>
    patchFrontmatter(text, new Map([[key, value]]));

const patch = (text: string, change: Partial<Item>): string => patchDocument(text, FACTS, change);

describe('documentItem', () => {
    it('reads a file with no frontmatter from its heading and its dates', () => {
        const item = documentItem('# Hello\n\nBody.\n', FACTS);

        expect(item.id).toBe(FACTS.id);
        expect(item.title).toBe('Hello');
        expect(item.type).toBe('note');
        expect(item.createdAt).toBe(FACTS.created);
        expect(item.updatedAt).toBe(FACTS.modified);
        expect(item.collectionId).toBeUndefined();
    });

    it('falls back to the filename, and prefers the frontmatter', () => {
        expect(documentItem('Just prose.\n', FACTS).title).toBe('readme');

        const item = documentItem(HAND_WRITTEN, FACTS);

        expect(item.title).toBe('Quoted');
        expect(item.tags).toEqual(['a', 'b']);
        expect(item.dueAt).toBe('2026-03-04');
    });

    it('keeps an `updated` the file states over its mtime', () => {
        const item = documentItem('---\nupdated: 2025-05-05T00:00:00.000Z\n---\n', FACTS);

        expect(item.updatedAt).toBe('2025-05-05T00:00:00.000Z');
    });
});

describe('patchFrontmatter', () => {
    it('replaces one value and leaves every other byte', () => {
        expect(set(HAND_WRITTEN, 'title', 'New')).toBe(
            HAND_WRITTEN.replace('title:   "Quoted"   # keep me', 'title: New   # keep me'),
        );
    });

    it('appends a key the file does not have', () => {
        expect(set(HAND_WRITTEN, 'starred', true)).toBe(
            HAND_WRITTEN.replace('due: 2026-03-04\n', 'due: 2026-03-04\nstarred: true\n'),
        );
    });

    it('removes a key with its line, and a nested one with all of them', () => {
        expect(set(HAND_WRITTEN, 'due', undefined)).toBe(
            HAND_WRITTEN.replace('due: 2026-03-04\n', ''),
        );
        expect(set(HAND_WRITTEN, 'x-unknown', undefined)).toBe(
            HAND_WRITTEN.replace('x-unknown:\n    deep:   { flow: 1 }\n', ''),
        );
    });

    it('replaces a block value without disturbing its neighbours', () => {
        const text = '---\ntags:\n    - a\n    - b\n# after\nlast: 1\n---\nBody\n';

        expect(set(text, 'tags', ['a', 'b', 'c'])).toBe(
            '---\ntags:\n  - a\n  - b\n  - c\n# after\nlast: 1\n---\nBody\n',
        );
    });

    it('fills in a key that had no value', () => {
        expect(set('---\nurl:\nlast: 1\n---\n', 'url', 'https://lore.app')).toBe(
            '---\nurl: https://lore.app\nlast: 1\n---\n',
        );
    });

    it('starts a frontmatter block, and takes it away again when it empties', () => {
        for (const text of [
            '# Heading\n\nBody.\n',
            '\nBody',
            '',
            '\uFEFF# Heading\r\n\r\nBody.\r\n',
        ]) {
            const starred = set(text, 'starred', true);

            expect(starred).not.toBe(text);
            expect(splitFrontmatter(starred).yaml?.trim()).toBe('starred: true');
            expect(set(starred, 'starred', undefined)).toBe(text);
        }
    });

    it('keeps the byte-order mark first and the line endings the file uses', () => {
        expect(set('\uFEFF# Heading\r\n', 'tags', ['a'])).toBe(
            '\uFEFF---\r\ntags:\r\n  - a\r\n---\r\n\r\n# Heading\r\n',
        );
        expect(set('---\r\ntitle: Old\r\n---\r\nBody\r\n', 'starred', true)).toBe(
            '---\r\ntitle: Old\r\nstarred: true\r\n---\r\nBody\r\n',
        );
    });

    it('leaves a block that only holds comments in place', () => {
        const text = '---\n# notes to self\nstarred: true\n---\nBody\n';

        expect(set(text, 'starred', undefined)).toBe('---\n# notes to self\n---\nBody\n');
    });

    it('is a no-op to remove a key that is not there', () => {
        expect(set(HAND_WRITTEN, 'starred', undefined)).toBe(HAND_WRITTEN);
        expect(set('Body\n', 'starred', undefined)).toBe('Body\n');
    });

    it('refuses frontmatter it cannot read rather than rewriting it', () => {
        for (const yaml of ['title: [unclosed', 'a: 1\na: 2', '- a\n- b', '{ title: Flow }']) {
            expect(() => set(`---\n${yaml}\n---\nBody\n`, 'starred', true)).toThrow(
                FrontmatterUnreadable,
            );
        }
    });
});

describe('patchDocument', () => {
    it('writes only the key an edit is about', () => {
        expect(patch(HAND_WRITTEN, { flags: { starred: true } })).toBe(
            set(HAND_WRITTEN, 'starred', true),
        );
    });

    it('adds no id, dates or title to a file that had none', () => {
        expect(patch('# Heading\n', { tags: ['a'] })).toBe('---\ntags:\n  - a\n---\n\n# Heading\n');
    });

    it('leaves the file alone when nothing changes', () => {
        const same = { flags: {}, priority: undefined, tags: ['a', 'b'], title: 'Quoted' };

        expect(patch(HAND_WRITTEN, same)).toBe(HAND_WRITTEN);
    });

    it('does not rewrite a value that only reads the same', () => {
        const text = '---\npriority: normal\ntags: ["#a"]\ndone: false\n---\n';

        expect(patch(text, { url: 'https://lore.app' })).toBe(
            text.replace('done: false\n', 'done: false\nurl: https://lore.app\n'),
        );
    });

    it('clears a key for a value the wire carries as null', () => {
        const cleared = { dueAt: null } as unknown as Partial<Item>;

        expect(patch(HAND_WRITTEN, cleared)).toBe(HAND_WRITTEN.replace('due: 2026-03-04\n', ''));
    });

    it('drops a flag that is switched off rather than writing false', () => {
        const text = '---\nstarred: true\ntoday: true\n---\n';

        expect(patch(text, { flags: { today: true } })).toBe('---\ntoday: true\n---\n');
    });

    it('never writes the body, a collection or the links only a vault resolves', () => {
        const text = '---\nrelated:\n  - "[[Other]]"\n---\nBody\n';

        expect(patch(text, { body: 'Else', collectionId: 'Work', related: ['x'] })).toBe(text);
    });
});

describe('document routes', () => {
    const app = createApp({ dev: false, parentPid: null, port: 0, token: 't', vault: null });

    const call = async (path: string, body: unknown) => {
        const response = await app.handle(
            new Request(`http://127.0.0.1${path}`, {
                body: JSON.stringify(body),
                headers: {
                    authorization: 'Bearer t',
                    'content-type': 'application/json',
                    origin: 'tauri://localhost',
                },
                method: 'POST',
            }),
        );

        return { body: await response.json(), status: response.status };
    };

    it('parses and patches with no workspace open', async () => {
        const parsed = await call('/documents/parse', { facts: FACTS, text: HAND_WRITTEN });

        expect(parsed.status).toBe(200);
        expect(parsed.body.title).toBe('Quoted');

        const patched = await call('/documents/patch', {
            facts: FACTS,
            patch: { title: 'New' },
            text: HAND_WRITTEN,
        });

        expect(patched.body.text).toBe(set(HAND_WRITTEN, 'title', 'New'));
        expect(patched.body.item.title).toBe('New');
    });

    it('answers 422 for frontmatter it will not rewrite', async () => {
        const refused = await call('/documents/patch', {
            facts: FACTS,
            patch: { title: 'New' },
            text: '---\ntitle: [unclosed\n---\n',
        });

        expect(refused.status).toBe(422);
        expect(refused.body.error).toBe('frontmatter_unreadable');
    });

    it('answers 400 without text', async () => {
        expect((await call('/documents/parse', { facts: FACTS })).status).toBe(400);
    });
});
