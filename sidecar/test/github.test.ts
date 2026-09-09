// URL shapes and the relative-path rewrite are the parts worth testing; the
// network is not. `resolveDocument` drives a stubbed fetch, like linkMetadata.

import { afterEach, describe, expect, it } from 'bun:test';

import { absolutize, type GithubTarget, parseGithubTarget, resolveDocument } from '../src/github';

const realFetch = globalThis.fetch;
afterEach(() => {
    globalThis.fetch = realFetch;
});

/** Serves `files` by path suffix; anything else 404s, as raw does. */
function serve(files: Record<string, string>) {
    const seen: string[] = [];
    globalThis.fetch = (async (url: RequestInfo | URL) => {
        const href = String(url);
        seen.push(href);
        const hit = Object.entries(files).find(([path]) => href.endsWith(path));
        return hit
            ? new Response(hit[1], { headers: { 'content-type': 'text/plain' } })
            : new Response('404', { status: 404 });
    }) as unknown as typeof fetch;
    return seen;
}

const repo: GithubTarget = {
    dir: '',
    owner: 'emitsignal',
    path: 'README.md',
    ref: 'HEAD',
    repo: 'emitsignal',
};

const RAW = 'https://raw.githubusercontent.com/emitsignal/emitsignal/HEAD';
const WEB = 'https://github.com/emitsignal/emitsignal/blob/HEAD';

describe('parseGithubTarget', () => {
    it('reads a bare repo as its README, tracking the default branch', () => {
        expect(parseGithubTarget('https://github.com/emitsignal/emitsignal')).toEqual({
            dir: '',
            owner: 'emitsignal',
            path: null,
            ref: 'HEAD',
            repo: 'emitsignal',
        });
    });

    it('reads a blob URL as that file', () => {
        expect(
            parseGithubTarget('https://github.com/emitsignal/emitsignal/blob/main/CHANGELOG.md'),
        ).toEqual({
            dir: '',
            owner: 'emitsignal',
            path: 'CHANGELOG.md',
            ref: 'main',
            repo: 'emitsignal',
        });
    });

    it('keeps the file directory, so its relative links resolve against it', () => {
        expect(parseGithubTarget('https://github.com/o/r/blob/main/docs/guide/setup.md')?.dir).toBe(
            'docs/guide',
        );
    });

    it('reads a tree URL as the README of that directory', () => {
        expect(parseGithubTarget('https://github.com/o/r/tree/main/docs')).toEqual({
            dir: 'docs',
            owner: 'o',
            path: null,
            ref: 'main',
            repo: 'r',
        });
    });

    it('accepts a raw URL', () => {
        expect(parseGithubTarget(`${RAW}/docs/x.md`)?.path).toBe('docs/x.md');
    });

    it('ignores ?plain=1 and a line fragment', () => {
        expect(
            parseGithubTarget('https://github.com/o/r/blob/main/A.md?plain=1#L10-L20')?.path,
        ).toBe('A.md');
    });

    it('strips a trailing .git', () => {
        expect(parseGithubTarget('https://github.com/o/r.git')?.repo).toBe('r');
    });

    it.each([
        ['a non-Markdown file', 'https://github.com/o/r/blob/main/src/index.ts'],
        ['an issue', 'https://github.com/o/r/issues/12'],
        ['a pull request', 'https://github.com/o/r/pull/12'],
        ['a user page', 'https://github.com/o'],
        ['another host', 'https://gitlab.com/o/r'],
        ['nonsense', 'not a url'],
    ])('returns null for %s', (_label, url) => {
        expect(parseGithubTarget(url)).toBeNull();
    });
});

describe('absolutize', () => {
    it('points a relative image at raw', () => {
        expect(absolutize('![shot](docs/images/kb.png)', repo)).toBe(
            `![shot](${RAW}/docs/images/kb.png)`,
        );
    });

    it('points a relative link at the blob view', () => {
        expect(absolutize('[agents](AGENTS.md)', repo)).toBe(`[agents](${WEB}/AGENTS.md)`);
    });

    it('resolves against the document own directory', () => {
        const nested: GithubTarget = { ...repo, dir: 'docs', path: 'docs/README.md' };
        expect(absolutize('![x](../logo.png) [y](guide.md)', nested)).toBe(
            `![x](${RAW}/logo.png) [y](${WEB}/docs/guide.md)`,
        );
    });

    it('prefixes a root-relative path with github.com', () => {
        expect(absolutize('[x](/emitsignal/emitsignal/releases)', repo)).toBe(
            '[x](https://github.com/emitsignal/emitsignal/releases)',
        );
    });

    it('rewrites HTML img and a attributes', () => {
        expect(absolutize('<a href="docs/x.md"><img src="logo.png" width="20"></a>', repo)).toBe(
            `<a href="${WEB}/docs/x.md"><img src="${RAW}/logo.png" width="20"></a>`,
        );
    });

    it('keeps the query and the fragment', () => {
        expect(absolutize('[x](README.md#install)', repo)).toBe(`[x](${WEB}/README.md#install)`);
    });

    it.each([
        ['an absolute URL', '[x](https://example.com/a.md)'],
        ['a badge', '![b](https://img.shields.io/badge.svg)'],
        ['a protocol-relative URL', '[x](//example.com/a)'],
        ['a bare anchor', '[x](#install)'],
        ['a mailto', '[x](mailto:a@b.c)'],
    ])('leaves %s alone', (_label, markdown) => {
        expect(absolutize(markdown, repo)).toBe(markdown);
    });

    it('leaves fenced code untouched', () => {
        const source = ['before [x](a.md)', '```md', '[x](a.md)', '```', 'after'].join('\n');
        expect(absolutize(source, repo)).toBe(
            [`before [x](${WEB}/a.md)`, '```md', '[x](a.md)', '```', 'after'].join('\n'),
        );
    });

    it('rewrites a reference definition', () => {
        expect(absolutize('[docs]: docs/a.md', repo)).toBe(`[docs]: ${WEB}/docs/a.md`);
    });
});

describe('resolveDocument', () => {
    it('finds the README of a bare repo and titles it after the repo', async () => {
        serve({ '/HEAD/README.md': '# emitsignal\n\n![x](logo.png)' });
        const doc = await resolveDocument(parseGithubTarget('https://github.com/e/e')!);
        expect(doc?.path).toBe('README.md');
        expect(doc?.title).toBe('e/e');
        expect(doc?.readme).toBe(true);
        expect(doc?.markdown).toContain('https://raw.githubusercontent.com/e/e/HEAD/logo.png');
    });

    it('falls past a missing README.md to the next candidate', async () => {
        const seen = serve({ '/HEAD/readme.md': '# lower' });
        const doc = await resolveDocument(parseGithubTarget('https://github.com/e/e')!);
        expect(doc?.path).toBe('readme.md');
        expect(seen[0]).toEndWith('/HEAD/README.md');
    });

    it('names a file other than a README in its title', async () => {
        serve({ '/main/CHANGELOG.md': '# changes' });
        const doc = await resolveDocument(
            parseGithubTarget('https://github.com/e/e/blob/main/CHANGELOG.md')!,
        );
        expect(doc?.title).toBe('e/e · CHANGELOG.md');
        expect(doc?.readme).toBe(false);
    });

    it('answers null when the repo has no README', async () => {
        serve({});
        expect(await resolveDocument(parseGithubTarget('https://github.com/e/e')!)).toBeNull();
    });

    it('answers null rather than throwing when the network fails', async () => {
        globalThis.fetch = (async () => {
            throw new Error('offline');
        }) as unknown as typeof fetch;
        expect(await resolveDocument(parseGithubTarget('https://github.com/e/e')!)).toBeNull();
    });
});
