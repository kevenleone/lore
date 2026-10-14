// Saved Ask Lore conversations: one JSON file each under `.lore/chats/`. They
// are the user's, not derived, so nothing here is ever rebuilt or thrown away.

import type { ChatMessage, ChatThread, ChatThreadSummary } from '@lore/types';

import { readdir, rm } from 'node:fs/promises';

import { CHATS_DIR, type Vault } from './vault';

/** The id is a filename, so this is what keeps a request inside the folder. */
const THREAD_ID = /^[A-Za-z0-9_-]{1,64}$/;
const TITLE_CHARACTERS = 80;

export async function deleteChat(vault: Vault, id: string): Promise<void> {
    await rm(vault.path(file(id)), { force: true });
}

export function isThreadId(id: string): boolean {
    return THREAD_ID.test(id);
}

/** Newest first. A file that does not parse is skipped, never deleted. */
export async function listChats(vault: Vault): Promise<ChatThreadSummary[]> {
    let names: string[];

    try {
        names = await readdir(vault.path(CHATS_DIR));
    } catch {
        return [];
    }

    const threads = await Promise.all(
        names
            .filter((name) => name.endsWith('.json') && isThreadId(name.slice(0, -5)))
            .map((name) => readChat(vault, name.slice(0, -5))),
    );

    return threads
        .filter((thread): thread is ChatThread => thread !== null)
        .map(({ createdAt, id, title, updatedAt }) => ({ createdAt, id, title, updatedAt }))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

/** A thread from untrusted JSON: a request body, or a file edited by hand. */
export function parseThread(id: string, value: unknown): ChatThread | null {
    const raw = (value ?? {}) as Partial<ChatThread>;
    const messages = (Array.isArray(raw.messages) ? raw.messages : [])
        .map(message)
        .filter((entry): entry is ChatMessage => entry !== null);

    if (messages.length === 0) {
        return null;
    }

    const now = new Date().toISOString();
    const opening = messages.find((entry) => entry.role === 'user')?.text ?? messages[0].text;

    return {
        createdAt: text(raw.createdAt) ?? now,
        id,
        messages,
        title: (text(raw.title) ?? opening).replace(/\s+/g, ' ').trim().slice(0, TITLE_CHARACTERS),
        updatedAt: text(raw.updatedAt) ?? now,
    };
}

export async function readChat(vault: Vault, id: string): Promise<ChatThread | null> {
    try {
        return parseThread(id, JSON.parse(await vault.readText(file(id))));
    } catch {
        return null;
    }
}

export async function writeChat(vault: Vault, thread: ChatThread): Promise<void> {
    await vault.writeText(file(thread.id), `${JSON.stringify(thread, null, 2)}\n`);
}

function file(id: string): string {
    return `${CHATS_DIR}/${id}.json`;
}

/** Only what a finished message holds: nothing of a turn that was in flight. */
function message(value: unknown): ChatMessage | null {
    const raw = (value ?? {}) as Partial<ChatMessage>;
    const body = text(raw.text);

    if ((raw.role !== 'ai' && raw.role !== 'user') || !text(raw.id) || !body) {
        return null;
    }

    const sources = (Array.isArray(raw.sources) ? raw.sources : [])
        .filter((source) => text(source?.itemId))
        .map((source) => ({ itemId: source.itemId }));

    return {
        id: raw.id!,
        role: raw.role,
        text: body,
        ...(sources.length > 0 ? { sources } : {}),
    };
}

function text(value: unknown): string | undefined {
    return typeof value === 'string' && value ? value : undefined;
}
