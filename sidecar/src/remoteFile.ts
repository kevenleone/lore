// Downloads a file the user addressed by URL, so an image captured from the web
// lands in the vault as a real file rather than a link that rots.
//
// Same shape as linkMetadata.ts — protocol allowlist, timeout, hard size cap —
// because this is the other place the engine reaches out to the network on the
// renderer's behalf. The cap is enforced while reading, not from
// Content-Length, which a server is free to lie about or omit.

import { normalizeUrl } from './linkMetadata';

const TIMEOUT_MS = 15_000;
/** Generous for a screenshot or a scan, small enough that a mistake is cheap. */
const MAX_BYTES = 25 * 1024 * 1024;

const UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/124.0 Safari/537.36 LoreBot/1.0';

/** What the capture window may address by URL, and the extension each implies. */
const ACCEPTED: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/avif': '.avif',
    'image/gif': '.gif',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/svg+xml': '.svg',
    'image/webp': '.webp',
};

export interface RemoteFile {
    bytes: Uint8Array;
    /** A name to save under, always carrying an extension. */
    filename: string;
}

export class RemoteFileError extends Error {
    constructor(readonly reason: string) {
        super(reason);
        this.name = 'RemoteFileError';
    }
}

export async function fetchRemoteFile(rawUrl: string): Promise<RemoteFile> {
    // The scheme has to be judged on the raw input. `normalizeUrl` prepends
    // https:// to anything that does not already start with it, which turns
    // `file:///etc/passwd` into the parseable `https://file:///etc/passwd` — so
    // checking only the normalized URL's protocol would always find `https:`.
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(rawUrl.trim())?.[1].toLowerCase();
    if (scheme && scheme !== 'http' && scheme !== 'https') {
        throw new RemoteFileError('unsupported_protocol');
    }

    const target = normalizeUrl(rawUrl);
    let parsed: URL;
    try {
        parsed = new URL(target);
    } catch {
        throw new RemoteFileError('invalid_url');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new RemoteFileError('unsupported_protocol');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(target, {
            headers: { Accept: 'image/*,application/pdf', 'User-Agent': UA },
            redirect: 'follow',
            signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new RemoteFileError('fetch_failed');

        // Parameters like "; charset=" are not part of the type.
        const contentType = (res.headers.get('content-type') ?? '')
            .split(';')[0]
            .trim()
            .toLowerCase();
        const extension = ACCEPTED[contentType];
        // A URL that answers with HTML is the common mistake — a page *about* an
        // image rather than the image — so it is worth its own reason.
        if (!extension) throw new RemoteFileError('unsupported_type');

        const bytes = await readCapped(res.body);
        return { bytes, filename: filenameFor(parsed, extension) };
    } catch (e) {
        if (e instanceof RemoteFileError) throw e;
        throw new RemoteFileError(
            e instanceof Error && e.name === 'AbortError' ? 'timeout' : 'fetch_failed',
        );
    } finally {
        clearTimeout(timer);
    }
}

/** The URL's own basename when it has one, else the host. */
function filenameFor(parsed: URL, extension: string): string {
    const base = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() ?? '');
    const stem = base.replace(/\.[^.]+$/, '').trim();
    return `${stem || parsed.hostname}${extension}`;
}

/** Reads the whole body, refusing anything past the cap rather than truncating. */
async function readCapped(body: ReadableStream<Uint8Array>): Promise<Uint8Array> {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let seen = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            seen += value.byteLength;
            // Truncating would write a corrupt file, so this is a refusal.
            if (seen > MAX_BYTES) throw new RemoteFileError('too_large');
            chunks.push(value);
        }
    } finally {
        await reader.cancel().catch(() => {});
    }
    const out = new Uint8Array(seen);
    let at = 0;
    for (const chunk of chunks) {
        out.set(chunk, at);
        at += chunk.byteLength;
    }
    return out;
}
