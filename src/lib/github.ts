// GitHub documents for the capture window.
//
// Like link previews, the fetch and the relative-path rewriting live in the data
// engine — the renderer has no HTTP capability, and server-side there is no CORS.

import type { LinkMetadata } from './linkMetadata';

import { request } from '../data/sidecarClient';

export interface GithubDocument {
    markdown: string;
    /** Repo-relative path of the file this resolved to. */
    path: string;
    raw: string;
    /**
     * The README was discovered rather than named, so the URL was the repository
     * itself — and GitHub's own page title, which carries the repo description,
     * names the item better than `owner/repo` does.
     */
    readme: boolean;
    ref: string;
    title: string;
}

/**
 * What to call the item a URL resolved to. A repository's page title carries its
 * description — "GitHub - owner/repo: what it does" — which names it better than
 * `owner/repo`. A file named outright keeps the document's own title, since the
 * page title would only describe the repo it happens to sit in.
 */
export function documentTitle(document: GithubDocument, meta: LinkMetadata | null): string {
    return document.readme ? (meta?.title ?? document.title) : document.title;
}

/**
 * A cheap pre-filter so typing an unrelated URL never reaches the engine. The
 * engine parses the URL properly; this only decides whether to ask.
 */
export function looksLikeGithub(url: string): boolean {
    return /^https?:\/\/(www\.)?(github\.com|raw\.githubusercontent\.com)\//i.test(url.trim());
}

/** Null for a URL that names no Markdown — an issue, a `.ts` file, another host. */
export async function resolveGithubDocument(url: string): Promise<GithubDocument | null> {
    if (!looksLikeGithub(url)) return null;
    try {
        const doc = await request<Partial<GithubDocument>>('/github/resolve', {
            body: JSON.stringify({ url }),
            method: 'POST',
        });
        return doc.markdown && doc.raw ? (doc as GithubDocument) : null;
    } catch {
        // A repo that will not resolve is not an error worth surfacing — the
        // capture saves the ordinary link it already had.
        return null;
    }
}
