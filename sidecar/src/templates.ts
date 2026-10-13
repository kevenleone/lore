// `.lore/templates/`: item skeletons kept as ordinary Markdown files.
//
// A template is the thing it makes — same frontmatter, same body — so it can be
// written in any editor and read back without a second format to learn. The one
// departure is `collection`: everywhere else a file's folder is its collection,
// and a template's folder is `.lore/templates`, so where its items land has to
// be said outright.

import type { Template } from '@lore/types';

import { readdir } from 'node:fs/promises';

import { itemTypeOf, parseFile } from './markdown';
import { isIgnoredFile, TEMPLATES_DIR, type Vault } from './vault';

export async function listTemplates(vault: Vault): Promise<Template[]> {
    const files = await templateFiles(vault);
    const templates: Template[] = [];

    for (const file of files) {
        const template = await readTemplate(vault, file);

        if (template) {
            templates.push(template);
        }
    }

    return templates.sort((left, right) => left.name.localeCompare(right.name));
}

export async function readTemplate(vault: Vault, filename: string): Promise<null | Template> {
    let raw: string;

    try {
        raw = await vault.readText(`${TEMPLATES_DIR}/${filename}`);
    } catch {
        return null;
    }

    const { body, data, extra } = parseFile(raw);

    return {
        body,
        // Not a key Lore owns anywhere else, so it arrives as an unknown one.
        collectionId: text(extra.collection),
        name: filename.replace(/\.md$/, ''),
        tags: Array.isArray(data.tags)
            ? data.tags.filter((tag): tag is string => typeof tag === 'string' && !!tag.trim())
            : [],
        title: text(data.title),
        type: itemTypeOf(data.type),
    };
}

async function templateFiles(vault: Vault): Promise<string[]> {
    try {
        const entries = await readdir(vault.path(TEMPLATES_DIR), { withFileTypes: true });

        return entries
            .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
            .map((entry) => entry.name)
            .filter((name) => !isIgnoredFile(name));
    } catch {
        // No folder is the ordinary case: a vault only grows one once someone
        // writes a template.
        return [];
    }
}

const text = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined;
