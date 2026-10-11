import type { Item } from '@lore/types';

import { z } from 'zod';

import type { VaultStore } from '../index/store';
import type { AiBackend } from './backend';

import { ENRICH_SYSTEM, type EnrichField, enrichPrompt } from './prompts';

const MAX_TEXT_CHARACTERS = 12_000;
const MAX_TAGS = 4;
const MAX_POINTS = 4;
const FIELDS: readonly EnrichField[] = ['summary', 'tags', 'title'];

const REPLY = z.object({
    points: z.array(z.string()).optional(),
    summary: z.string().optional(),
    tags: z.array(z.string()).optional(),
    title: z.string().optional(),
});

export interface EnrichInput {
    item?: Item;
    text: string;
    want: EnrichField[];
}

export interface Enrichment {
    points?: string[];
    summary?: string;
    /** Never one the item already carries. */
    tags?: string[];
    title?: string;
}

export async function enrich(
    backend: AiBackend,
    store: VaultStore,
    { item, text, want }: EnrichInput,
    signal: AbortSignal,
): Promise<Enrichment> {
    const reply = await backend.object({
        prompt: enrichPrompt(text.slice(0, MAX_TEXT_CHARACTERS), want, store.listTags()),
        schema: REPLY,
        signal,
        system: ENRICH_SYSTEM,
    });
    const result: Enrichment = {};

    if (want.includes('title') && reply.title?.trim()) {
        result.title = reply.title.trim();
    }

    if (want.includes('tags') && reply.tags) {
        result.tags = cleanTags(reply.tags, item?.tags ?? []);
    }

    if (want.includes('summary') && reply.summary?.trim()) {
        result.summary = reply.summary.trim();
        result.points = (reply.points ?? [])
            .map((point) => point.trim())
            .filter(Boolean)
            .slice(0, MAX_POINTS);
    }

    return result;
}

export function itemText(item: Item): string {
    return [
        item.title && `Title: ${item.title}`,
        item.url && `URL: ${item.url}`,
        item.description && `Description: ${item.description}`,
        item.body,
    ]
        .filter(Boolean)
        .join('\n\n');
}

export function parseWant(value: unknown): EnrichField[] {
    return FIELDS.filter((field) => Array.isArray(value) && value.includes(field));
}

function cleanTags(tags: readonly string[], existing: readonly string[]): string[] {
    const taken = new Set(existing.map((tag) => tag.toLowerCase()));
    const cleaned: string[] = [];

    for (const raw of tags) {
        const tag = raw.trim().replace(/^#/, '').toLowerCase();

        if (tag && !taken.has(tag)) {
            taken.add(tag);
            cleaned.push(tag);
        }
    }

    return cleaned.slice(0, MAX_TAGS);
}
