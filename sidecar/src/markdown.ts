// The file format: YAML frontmatter plus a Markdown body.
//
// `yaml` is used directly rather than gray-matter because this needs
// round-trip control — what gets written back must stay diff-friendly, and
// unknown keys a user or another tool added must survive being edited in Lore.

import type { Item, ItemComment, ItemFlags, ItemType, Priority } from '@lore/types';

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { newId } from './slug';

const FENCE = '---';
const ITEM_TYPES: ItemType[] = ['link', 'note', 'task', 'code', 'image'];
const PRIORITIES: Priority[] = ['low', 'normal', 'high', 'urgent'];

/** Frontmatter keys Lore owns. Anything else is passed through untouched. */
const KNOWN_KEYS = new Set([
    'comments',
    'created',
    'description',
    'done',
    'due',
    'id',
    'image',
    'inbox',
    'points',
    'priority',
    'related',
    'starred',
    'summary',
    'tags',
    'title',
    'today',
    'type',
    'updated',
    'url',
]);

export interface ParsedFile {
    body: string;
    /** Everything Lore understands, minus what the file's location implies. */
    data: Record<string, unknown>;
    /** Keys we do not own, preserved so an external tool's fields survive. */
    extra: Record<string, unknown>;
}

export function parseFile(raw: string): ParsedFile {
    const { body, yaml } = splitFrontmatter(raw);
    let parsed: unknown = null;
    if (yaml !== null) {
        try {
            parsed = parseYaml(yaml);
        } catch {
            // Malformed YAML must not make the file unreadable — treat it as a note
            // with no metadata rather than dropping it out of the vault entirely.
            parsed = null;
        }
    }
    const obj =
        parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : {};

    const data: Record<string, unknown> = {};
    const extra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        (KNOWN_KEYS.has(k) ? data : extra)[k] = v;
    }
    return { body: stripLeadingBlank(body), data, extra };
}

/**
 * Splits a file into frontmatter and body. A file with no frontmatter is still
 * a valid note — the whole file is the body — because a vault should tolerate
 * plain Markdown dropped into it by hand.
 */
export function splitFrontmatter(raw: string): { body: string; yaml: null | string } {
    const text = raw.startsWith('﻿') ? raw.slice(1) : raw;
    if (!text.startsWith(`${FENCE}\n`) && !text.startsWith(`${FENCE}\r\n`)) {
        return { body: text, yaml: null };
    }
    const rest = text.slice(text.indexOf('\n') + 1);
    const close = rest.search(/^---[ \t]*(\r?\n|$)/m);
    if (close === -1) return { body: text, yaml: null };
    const yaml = rest.slice(0, close);
    const after = rest.slice(close);
    const body = after.slice(after.indexOf('\n') + 1);
    return { body, yaml };
}

function stripLeadingBlank(body: string): string {
    return body.replace(/^\s*\n/, '');
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);

const strArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [];

const iso = (v: unknown, fallback: string): string => {
    if (typeof v === 'string' && !Number.isNaN(Date.parse(v))) return new Date(v).toISOString();
    if (v instanceof Date) return v.toISOString();
    return fallback;
};

/**
 * A `YYYY-MM-DD` deadline. YAML parses an unquoted date into a `Date`, so both
 * shapes have to be accepted; anything else a person typed by hand degrades to
 * "no deadline" rather than making the file unreadable.
 */
const day = (v: unknown): string | undefined => {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    const s = str(v);
    return s && /^\d{4}-\d{2}-\d{2}$/.test(s.slice(0, 10)) ? s.slice(0, 10) : undefined;
};

const priority = (v: unknown): Priority | undefined => {
    const s = str(v)?.toLowerCase();
    return (PRIORITIES as string[]).includes(s ?? '') ? (s as Priority) : undefined;
};

/**
 * Comments a person may well have typed into the file by hand, so everything but
 * the text itself is optional and filled in here rather than rejected.
 */
const commentArray = (v: unknown, fallback: string): ItemComment[] => {
    if (!Array.isArray(v)) return [];
    const out: ItemComment[] = [];
    for (const entry of v) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
        const raw = entry as Record<string, unknown>;
        const body = str(raw.body);
        if (!body) continue;
        const comment: ItemComment = {
            at: iso(raw.at, fallback),
            body,
            id: str(raw.id) ?? newId(),
        };
        const author = str(raw.author);
        if (author) comment.author = author;
        out.push(comment);
    }
    return out;
};

export interface ToItemContext {
    /** Vault-relative directory; "" at the root means uncollected. */
    collectionId?: string;
    id: string;
    /** File mtime, used when a hand-written file has no timestamps. */
    mtime: string;
    relatedIds: string[];
    /** Filename stem, the fallback title for a hand-written file. */
    stem: string;
}

/**
 * The domain object → file text. Key order is fixed so an unrelated edit never
 * reshuffles the frontmatter and produces a noisy diff.
 */
export function serializeFile(
    item: Item,
    relatedLinks: readonly string[],
    extra: Record<string, unknown> = {},
): string {
    // Key order here is the on-disk frontmatter order; sorting it would rewrite
    // every file in the vault the next time it is saved.

    const fm: Record<string, unknown> = {
        id: item.id,
        title: item.title,
        type: item.type,
    };
    if (item.url) fm.url = item.url;
    fm.created = item.createdAt;
    fm.updated = item.updatedAt;
    if (item.tags.length) fm.tags = item.tags;
    // Flags are written flat and omitted when false — nested maps read badly in
    // Obsidian's property editor and grep worse.
    if (item.flags.inbox) fm.inbox = true;
    if (item.flags.today) fm.today = true;
    if (item.flags.starred) fm.starred = true;
    if (item.flags.done) fm.done = true;
    if (item.dueAt) fm.due = item.dueAt;
    // `normal` is the absence of a priority, so writing it would put a key on
    // every ordinary file for no information.
    if (item.priority && item.priority !== 'normal') fm.priority = item.priority;
    if (item.image) fm.image = item.image;
    if (item.description) fm.description = item.description;
    if (item.summary) fm.summary = item.summary;
    if (item.points?.length) fm.points = item.points;
    if (relatedLinks.length) fm.related = relatedLinks;
    if (item.comments?.length) fm.comments = item.comments;

    // `collectionId` is deliberately absent: the parent folder is the collection,
    // so writing it too would give us two sources of truth that could disagree.
    Object.assign(fm, extra);

    const yaml = stringifyYaml(fm, { lineWidth: 0 }).trimEnd();
    const body = item.body?.trim() ?? '';
    return `${FENCE}\n${yaml}\n${FENCE}\n\n${body}${body ? '\n' : ''}`;
}

/** Frontmatter + location → the domain object, minus derived fields. */
export function toItem(parsed: ParsedFile, ctx: ToItemContext): Item {
    const { body, data } = parsed;
    const rawType = str(data.type);
    const type = (ITEM_TYPES as string[]).includes(rawType ?? '') ? (rawType as ItemType) : 'note';

    const flags: ItemFlags = {};
    if (data.inbox === true) flags.inbox = true;
    if (data.today === true) flags.today = true;
    if (data.starred === true) flags.starred = true;
    if (data.done === true) flags.done = true;

    const created = iso(data.created, ctx.mtime);
    const comments = commentArray(data.comments, created);

    return {
        // trimEnd, not trim: leading indentation is meaningful inside code blocks,
        // but the trailing newline serializeFile adds must not accumulate.
        body: body.trim() ? body.replace(/\s+$/, '') : undefined,
        collectionId: ctx.collectionId || undefined,
        comments: comments.length ? comments : undefined,
        createdAt: created,
        description: str(data.description),
        dueAt: day(data.due),
        flags,
        id: ctx.id,
        image: str(data.image),
        points: strArray(data.points).length ? strArray(data.points) : undefined,
        priority: priority(data.priority),
        related: ctx.relatedIds,
        summary: str(data.summary),
        tags: strArray(data.tags).map((t) => t.replace(/^#/, '')),
        // A file written by hand has no `title`; its first heading, then its
        // filename, are the next best things.
        title: str(data.title) ?? firstHeading(body) ?? ctx.stem,
        type,
        updatedAt: iso(data.updated, created),
        url: str(data.url),
    };
}

function firstHeading(body: string): string | undefined {
    return /^#{1,6}[ \t]+(.+)$/m.exec(body)?.[1].trim() || undefined;
}
