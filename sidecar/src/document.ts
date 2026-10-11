// A Markdown file opened on its own, outside any vault. The host reads and
// writes it; this only turns its text into an item and an edit back into text.
//
// A vault item is rewritten whole on save, which is right for a file Lore
// created. This one may be anybody's, so an edit changes the keys it is about
// and leaves every other byte — comments, order, quoting — where it was.

import type { Item } from '@lore/types';

import { isMap, isScalar, type Pair, parseDocument, stringify as stringifyYaml } from 'yaml';

import { frontmatterOf, parseFile, toItem } from './markdown';

export interface DocumentFacts {
    /** ISO 8601, from the file's birth time. */
    created: string;
    id: string;
    /** ISO 8601, from the file's mtime. */
    modified: string;
    stem: string;
}

export class FrontmatterUnreadable extends Error {
    constructor() {
        super('frontmatter_unreadable');
        this.name = 'FrontmatterUnreadable';
    }
}

/**
 * Keys an edit here never writes. The first three are a vault's bookkeeping,
 * and `related` holds links only a vault can resolve.
 */
const UNPATCHED = new Set(['created', 'id', 'related', 'updated']);

const BOM = '\uFEFF';

interface Block {
    /** Where the YAML ends, which is where the closing fence starts. */
    end: number;
    /** Just past the closing fence's own line. */
    fenceEnd: number;
    /** Where the opening fence starts, after any byte-order mark. */
    fenceStart: number;
    start: number;
}

export function documentItem(text: string, facts: DocumentFacts): Item {
    const parsed = parseFile(text);
    const item = toItem(parsed, {
        id: facts.id,
        mtime: facts.created,
        relatedIds: [],
        stem: facts.stem,
    });

    return 'updated' in parsed.data ? item : { ...item, updatedAt: facts.modified };
}

/** The text with `patch` applied to its frontmatter; the body is not this function's. */
export function patchDocument(text: string, facts: DocumentFacts, patch: Partial<Item>): string {
    const before = documentItem(text, facts);
    const wanted = frontmatterOf({ ...before, ...patch });
    const current = frontmatterOf(before);
    const changes = new Map<string, unknown>();

    for (const key of new Set([...Object.keys(current), ...Object.keys(wanted)])) {
        if (UNPATCHED.has(key)) {
            continue;
        }

        if (JSON.stringify(current[key]) !== JSON.stringify(wanted[key])) {
            changes.set(key, wanted[key]);
        }
    }

    return patchFrontmatter(text, changes);
}

/**
 * Sets each key in `changes`, or removes it when its value is `undefined`.
 *
 * Spliced into the source rather than parsed and written back: re-emitting the
 * YAML would normalise indentation and quoting on lines nobody edited.
 */
export function patchFrontmatter(text: string, changes: ReadonlyMap<string, unknown>): string {
    let result = text;

    for (const [key, value] of changes) {
        result = patchKey(result, key, value);
    }

    return result;
}

/** `key: value` as YAML, without the final line end, indented to sit under `indent`. */
function line(key: string, value: unknown, indent: string, eol: string): string {
    return stringifyYaml({ [key]: value }, { lineWidth: 0 })
        .trimEnd()
        .split('\n')
        .join(eol + indent);
}

/** The same fences `splitFrontmatter` recognises, as positions in the text. */
function locate(text: string): Block | null {
    const fenceStart = text.startsWith(BOM) ? BOM.length : 0;
    const opening = /^---\r?\n/.exec(text.slice(fenceStart));

    if (!opening) {
        return null;
    }

    const start = fenceStart + opening[0].length;
    const closing = /^---[ \t]*(\r?\n|$)/m.exec(text.slice(start));

    if (!closing) {
        return null;
    }

    const end = start + closing.index;

    return { end, fenceEnd: end + closing[0].length, fenceStart, start };
}

function patchKey(text: string, key: string, value: unknown): string {
    const eol = /\r\n/.test(text.slice(0, text.indexOf('\n') + 1)) ? '\r\n' : '\n';
    const block = locate(text);

    if (!block) {
        if (value === undefined) {
            return text;
        }

        const start = text.startsWith(BOM) ? BOM.length : 0;
        const rest = text.slice(start);

        return `${text.slice(0, start)}---${eol}${line(key, value, '', eol)}${eol}---${eol}${rest ? eol : ''}${rest}`;
    }

    const yaml = text.slice(block.start, block.end);
    const patched = patchYaml(yaml, key, value, eol);

    if (patched.trim() === '') {
        const after = text.slice(block.fenceEnd);

        // The blank line a fence is written with goes too, so setting a key
        // on a file with no frontmatter and clearing it again is a no-op.
        return text.slice(0, block.fenceStart) + after.replace(/^\r?\n/, '');
    }

    return text.slice(0, block.start) + patched + text.slice(block.end);
}

function patchYaml(yaml: string, key: string, value: unknown, eol: string): string {
    const parsed = parseDocument(yaml);
    const map = parsed.contents;

    // A flow map is one line of source: there is no line of its own to splice.
    if (parsed.errors.length > 0 || (map !== null && (!isMap(map) || map.flow))) {
        throw new FrontmatterUnreadable();
    }

    const pair = map?.items.find((entry) => isScalar(entry.key) && entry.key.value === key);

    if (!pair) {
        if (value === undefined) {
            return yaml;
        }

        const closed = yaml === '' || yaml.endsWith('\n') ? yaml : yaml + eol;

        return closed + line(key, value, '', eol) + eol;
    }

    const [start, end] = span(yaml, pair);
    const lineStart = yaml.lastIndexOf('\n', start - 1) + 1;

    if (value !== undefined) {
        return (
            yaml.slice(0, start) +
            line(key, value, yaml.slice(lineStart, start), eol) +
            yaml.slice(end)
        );
    }

    const newline = yaml.indexOf('\n', end);

    return yaml.slice(0, lineStart) + (newline === -1 ? '' : yaml.slice(newline + 1));
}

/** From the key to the last character of its value: no trailing comment, no line end. */
function span(yaml: string, pair: Pair): [number, number] {
    const key = pair.key as { range?: [number, number, number] | null };
    const value = pair.value as { range?: [number, number, number] | null } | null;

    if (!key.range) {
        throw new FrontmatterUnreadable();
    }

    let end = value?.range?.[1] ?? key.range[1];

    while (end > key.range[1] && /\s/.test(yaml[end - 1])) {
        end--;
    }

    // `key:` with nothing after it has a value that starts past the colon.
    if (yaml[end] === ':' && end === key.range[1]) {
        end++;
    }

    return [key.range[0], end];
}
