import { describe, expect, it } from 'vitest';

import type { GithubDocument } from './github';

import { documentTitle, looksLikeGithub } from './github';

const document: GithubDocument = {
    markdown: '# x',
    path: 'README.md',
    raw: 'https://raw.githubusercontent.com/emitsignal/emitsignal/HEAD/README.md',
    readme: true,
    ref: 'HEAD',
    title: 'emitsignal/emitsignal',
};

const meta = { title: 'GitHub - emitsignal/emitsignal: dev-native push notifications' };

describe('documentTitle', () => {
    it('prefers the page title for a repository, since it carries the description', () => {
        expect(documentTitle(document, meta)).toBe(meta.title);
    });

    it('falls back to owner/repo when the page has no title', () => {
        expect(documentTitle(document, {})).toBe('emitsignal/emitsignal');
        expect(documentTitle(document, null)).toBe('emitsignal/emitsignal');
    });

    it('keeps a named file own title, which the page title would not describe', () => {
        const file = {
            ...document,
            path: 'CHANGELOG.md',
            readme: false,
            title: 'e/e · CHANGELOG.md',
        };
        expect(documentTitle(file, meta)).toBe('e/e · CHANGELOG.md');
    });
});

describe('looksLikeGithub', () => {
    it.each([
        'https://github.com/o/r',
        'http://www.github.com/o/r',
        'https://raw.githubusercontent.com/o/r/HEAD/A.md',
    ])('matches %s', (url) => {
        expect(looksLikeGithub(url)).toBe(true);
    });

    it.each(['https://gitlab.com/o/r', 'https://example.com', 'notaurl'])(
        'does not match %s',
        (url) => {
            expect(looksLikeGithub(url)).toBe(false);
        },
    );
});
