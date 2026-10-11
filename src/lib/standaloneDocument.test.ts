import { describe, expect, it } from 'vitest';

import { joinFrontmatter, splitBody, splitFrontmatter } from './standaloneDocument';

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
    'an opening fence with trailing spaces, which the engine reads as body': {
        body: '--- \ntitle: Not frontmatter\n---\nBody\n',
        text: '--- \ntitle: Not frontmatter\n---\nBody\n',
    },
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

describe('splitBody', () => {
    const bodies = [
        '',
        'Text',
        'Text\n',
        '\n\nText\n\n\n',
        '\r\n# Heading\r\n\r\nText\r\n',
        '\n    indented code\n',
        '  \n\t\n',
        'One\n\nTwo  \n',
    ];

    for (const body of bodies) {
        it(`adds back up to ${JSON.stringify(body)}`, () => {
            const { core, lead, tail } = splitBody(body);

            expect(lead + core + tail).toBe(body);
            expect(core).toBe(core.trimEnd());
            expect(core.startsWith('\n')).toBe(false);
        });
    }

    it('keeps the first line of text indented as it was', () => {
        expect(splitBody('\n    code\n')).toEqual({ core: '    code', lead: '\n', tail: '\n' });
    });
});
