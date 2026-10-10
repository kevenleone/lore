import { describe, expect, it } from 'vitest';

import { joinFrontmatter, splitFrontmatter } from './standaloneDocument';

const FIXTURES: Record<string, { body: string; text: string }> = {
    'a body that opens with a thematic break': {
        body: '---\n\nnot frontmatter, there is no closing fence',
        text: '---\n\nnot frontmatter, there is no closing fence',
    },
    'a byte-order mark and frontmatter': {
        body: 'Body\n',
        text: '\uFEFF---\ntitle: Marked\n---\nBody\n',
    },
    'a byte-order mark and no frontmatter': {
        body: '# Title\n',
        text: '\uFEFF# Title\n',
    },
    'a later rule in the body': {
        body: 'One\n\n---\n\nTwo\n',
        text: '---\ntitle: Rules\n---\nOne\n\n---\n\nTwo\n',
    },
    'an empty file': { body: '', text: '' },
    'CRLF line endings': {
        body: 'Body\r\n',
        text: '---\r\ntitle: Windows\r\n---\r\nBody\r\n',
    },
    'empty frontmatter': { body: 'Body\n', text: '---\n---\nBody\n' },
    'frontmatter and nothing else': { body: '', text: '---\ntitle: Only\n---' },
    'keys Lore does not know, comments and odd spacing': {
        body: '\n# Heading\n\nA [[wikilink]] nobody resolves.\n',
        text: '---\ntitle:   "Spaced"\n# a comment\nx-custom: [1, 2,  3]\nnested:\n    deep: yes\n---   \n\n# Heading\n\nA [[wikilink]] nobody resolves.\n',
    },
    'no frontmatter': { body: '# Title\n\nText\n', text: '# Title\n\nText\n' },
};

describe('splitFrontmatter', () => {
    for (const [name, { body, text }] of Object.entries(FIXTURES)) {
        it(`round-trips ${name} byte-for-byte`, () => {
            const split = splitFrontmatter(text);

            expect(split.body).toBe(body);
            expect(joinFrontmatter(split.prefix, split.body)).toBe(text);
        });
    }
});
