// Resolves a GitHub URL to the Markdown document behind it: a repo's README, or
// a `.md` file named outright. The fetch lives here for the same reason
// `linkMetadata.ts` does — server-side there is no CORS, and the renderer is
// granted no HTTP capability at all.
//
// `HEAD` is used as the ref whenever the URL does not name one. Both hosts
// accept it, so the default branch never has to be resolved through the API and
// the unauthenticated rate limit is never touched — and a repo that renames its
// default branch keeps working.

const TIMEOUT_MS = 8_000;
/** A README is prose. Anything past this is not a document we can usefully read. */
const MAX_BYTES = 2 * 1024 * 1024;

const UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0 Safari/537.36 LoreBot/1.0';

const RAW_HOST = 'raw.githubusercontent.com';
const WEB_HOST = 'github.com';

const MARKDOWN = /\.(markdown|md)$/i;

/** Tried in order; the first that answers 200 is the repo's README. */
const README_NAMES = ['README.md', 'readme.md', 'Readme.md', 'README.markdown', 'README.MD'];

export interface GithubDocument {
    markdown: string;
    /** Repo-relative path of the file this resolved to. */
    path: string;
    raw: string;
    /**
     * The README was discovered rather than named, so the URL the user pasted was
     * the repository itself. Its page title describes the repo, which is a better
     * name for the item than `owner/repo`.
     */
    readme: boolean;
    ref: string;
    title: string;
}

export interface GithubTarget {
    /** The document's own directory, so its relative links resolve against it. */
    dir: string;
    owner: string;
    /** An explicit file, or null to discover the README in `dir`. */
    path: null | string;
    ref: string;
    repo: string;
}

/**
 * Rewrites every relative reference to an absolute URL, so the cached copy reads
 * correctly in Lore, in Obsidian, and anywhere else the vault is opened. Images
 * point at raw, links at the blob view — which is what GitHub itself does.
 *
 * Fenced code is skipped: a README that documents Markdown must not have its
 * examples rewritten.
 */
export function absolutize(markdown: string, target: GithubTarget): string {
    return outsideFences(markdown, (chunk) => {
        let out = chunk.replace(
            /(!?)\[((?:[^[\]]|\[[^\]]*\])*)\]\(\s*(<[^>\n]*>|[^()\s]*)((?:\s+"[^"]*"|\s+'[^']*')?\s*)\)/g,
            (whole, bang: string, text: string, dest: string, tail: string) => {
                const wrapped = dest.startsWith('<') && dest.endsWith('>');
                const bare = wrapped ? dest.slice(1, -1) : dest;
                const next = resolve(bare, !!bang, target);
                if (next === null) return whole;
                return `${bang}[${text}](${wrapped ? `<${next}>` : next}${tail})`;
            },
        );

        // Reference definitions — `[label]: docs/x.png`. Treated as links; an
        // image reference to a relative path is rare enough that pointing at the
        // blob view is better than guessing wrong.
        out = out.replace(
            /^([ \t]{0,3}\[[^\]^\n]+\]:[ \t]+)(<[^>\n]*>|\S+)/gm,
            (whole, head: string, dest: string) => {
                const wrapped = dest.startsWith('<') && dest.endsWith('>');
                const bare = wrapped ? dest.slice(1, -1) : dest;
                const next = resolve(bare, false, target);
                if (next === null) return whole;
                return `${head}${wrapped ? `<${next}>` : next}`;
            },
        );

        // Raw HTML. Badges, centred logos and `<img>` banners are HTML in a large
        // share of real READMEs, so leaving these alone would break the common case.
        return out.replace(
            /(<\w+\b[^>]*?\b(href|src)\s*=\s*)("[^"]*"|'[^']*')/gi,
            (whole, head: string, attr: string, quoted: string) => {
                const quote = quoted[0];
                const bare = quoted.slice(1, -1);
                const next = resolve(bare, attr.toLowerCase() === 'src', target);
                if (next === null) return whole;
                return `${head}${quote}${next}${quote}`;
            },
        );
    });
}

/**
 * A GitHub URL that names a Markdown document, or null for one that does not —
 * an issue, a pull request, a `.ts` file. Null is not a failure: the capture
 * falls back to an ordinary link.
 */
export function parseGithubTarget(rawUrl: string): GithubTarget | null {
    let url: URL;
    try {
        url = new URL(rawUrl.trim());
    } catch {
        return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    const host = url.hostname.replace(/^www\./, '');
    const segments = url.pathname
        .split('/')
        .filter(Boolean)
        .map((segment) => decodeURIComponent(segment));
    if (segments.length < 2) return null;

    const owner = segments[0];
    const repo = segments[1].replace(/\.git$/, '');

    if (host === RAW_HOST) {
        // /{owner}/{repo}/{ref}/{path…}
        if (segments.length < 4) return null;
        return document(owner, repo, segments[2], segments.slice(3).join('/'));
    }
    if (host !== WEB_HOST) return null;

    if (segments.length === 2) return { dir: '', owner, path: null, ref: 'HEAD', repo };

    const kind = segments[2];
    // A ref containing a slash is indistinguishable from a ref plus a path, so
    // the first segment wins. Naming `feature/x` explicitly is the one shape this
    // cannot serve, and it degrades to a plain link rather than to a wrong file.
    const ref = segments[3];
    const rest = segments.slice(4).join('/');
    if (!ref) return null;

    if (kind === 'tree') return { dir: trimSlashes(rest), owner, path: null, ref, repo };
    if (kind === 'blob' || kind === 'raw') return document(owner, repo, ref, rest);
    return null;
}

/** Fetches the document a target names, or null when there is nothing to read. */
export async function resolveDocument(target: GithubTarget): Promise<GithubDocument | null> {
    const candidates = target.path
        ? [target.path]
        : README_NAMES.map((name) => joinPath(target.dir, name));

    for (const path of candidates) {
        const raw = rawUrl(target.owner, target.repo, target.ref, path);
        const markdown = await fetchText(raw);
        if (markdown === null) continue;
        const scoped: GithubTarget = { ...target, dir: dirOf(path), path };
        return {
            markdown: absolutize(markdown, scoped),
            path,
            raw,
            readme: !target.path,
            ref: target.ref,
            title: titleFor(target, path),
        };
    }
    return null;
}

function dirOf(path: string): string {
    const cut = path.lastIndexOf('/');
    return cut === -1 ? '' : path.slice(0, cut);
}

function document(owner: string, repo: string, ref: string, path: string): GithubTarget | null {
    const clean = trimSlashes(path);
    if (!clean || !MARKDOWN.test(clean)) return null;
    return { dir: dirOf(clean), owner, path: clean, ref, repo };
}

function encodePath(path: string): string {
    return path.split('/').map(encodeURIComponent).join('/');
}

/** Null for any response that is not a readable document. */
async function fetchText(url: string): Promise<null | string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            headers: { Accept: 'text/plain, text/markdown, */*', 'User-Agent': UA },
            redirect: 'follow',
            signal: controller.signal,
        });
        if (!res.ok) return null;
        const size = Number(res.headers.get('content-length') ?? '0');
        if (size > MAX_BYTES) return null;
        const text = await res.text();
        return text.length > MAX_BYTES ? null : text;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

/** Joins and normalises `.`/`..`, keeping the result inside the repo. */
function joinPath(dir: string, rel: string): string {
    const out: string[] = [];
    for (const segment of `${dir}/${rel}`.split('/')) {
        if (!segment || segment === '.') continue;
        if (segment === '..') out.pop();
        else out.push(segment);
    }
    return out.join('/');
}

/**
 * Runs `transform` over everything outside fenced code blocks, leaving the
 * fences and their contents byte-for-byte.
 */
function outsideFences(markdown: string, transform: (chunk: string) => string): string {
    const lines = markdown.split('\n');
    const out: string[] = [];
    let buffer: string[] = [];
    let fence: null | string = null;

    const flush = () => {
        if (buffer.length) out.push(transform(buffer.join('\n')));
        buffer = [];
    };

    for (const line of lines) {
        const opener = /^[ \t]{0,3}(`{3,}|~{3,})/.exec(line);
        if (fence === null && opener) {
            flush();
            fence = opener[1][0];
            out.push(line);
            continue;
        }
        if (fence !== null) {
            out.push(line);
            if (new RegExp(`^[ \\t]{0,3}${fence}{3,}[ \\t]*$`).test(line)) fence = null;
            continue;
        }
        buffer.push(line);
    }
    flush();
    return out.join('\n');
}

function rawUrl(owner: string, repo: string, ref: string, path: string): string {
    return `https://${RAW_HOST}/${owner}/${repo}/${encodeURIComponent(ref)}/${encodePath(path)}`;
}

/** The absolute form of one reference, or null to leave it exactly as it is. */
function resolve(dest: string, isImage: boolean, target: GithubTarget): null | string {
    const value = dest.trim();
    if (!value) return null;
    // Already absolute, protocol-relative, an anchor, or a template placeholder
    // some generator left behind.
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
    if (value.startsWith('//') || value.startsWith('#') || value.startsWith('{')) return null;

    const cut = value.search(/[?#]/);
    const pathPart = cut === -1 ? value : value.slice(0, cut);
    const suffix = cut === -1 ? '' : value.slice(cut);
    if (!pathPart) return null;

    // Root-relative in a README means github.com, not the repo.
    if (pathPart.startsWith('/')) return `https://${WEB_HOST}${pathPart}${suffix}`;

    const path = joinPath(target.dir, pathPart);
    if (!path) return null;
    const { owner, ref, repo } = target;
    const base = isImage
        ? rawUrl(owner, repo, ref, path)
        : `https://${WEB_HOST}/${owner}/${repo}/blob/${encodeURIComponent(ref)}/${encodePath(path)}`;
    return `${base}${suffix}`;
}

/** The fallback name: the capture prefers the page's own title for a README. */
function titleFor(target: GithubTarget, path: string): string {
    const repo = `${target.owner}/${target.repo}`;
    return /^README\.(markdown|md)$/i.test(path) ? repo : `${repo} · ${path}`;
}

function trimSlashes(value: string): string {
    return value.replace(/^\/+|\/+$/g, '');
}
