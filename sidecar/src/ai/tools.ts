import type { Item } from '@lore/types';

import { EMPTY_CANVAS_BODY, parseCanvasBody, writeCanvasBody } from '@lore/canvas';
import { deriveSearchText } from '@lore/derive';
import { z } from 'zod';

import type { VaultStore } from '../index/store';

import { stemOf } from '../vault';
import { DrawError, drawOnto, SHAPE_COLORS, SHAPE_KINDS } from './draw';

const ITEM_TYPES = ['note', 'canvas', 'code', 'image', 'link', 'task'] as const;
const MAX_SHAPES = 40;
const MAX_ARROWS = 60;
const MAX_LABEL_CHARACTERS = 200;
const DEFAULT_RESULTS = 10;
const MAX_RESULTS = 50;
const MAX_BODY_CHARACTERS = 40_000;

export interface ItemSummary {
    collection?: string;
    id: string;
    snippet?: string;
    /** What a `[[wikilink]]` to this item is written with. */
    stem: string;
    tags: string[];
    title: string;
    type: Item['type'];
    updatedAt: string;
}

export interface VaultTool {
    description: string;
    input: z.ZodRawShape;
    name: string;
    /** Validates `input` itself, so every caller hands over what the model sent. */
    run(store: VaultStore, input: unknown): Promise<unknown>;
    writes: boolean;
}

interface ToolDefinition<TShape extends z.ZodRawShape> {
    description: string;
    handler(store: VaultStore, input: z.infer<z.ZodObject<TShape>>): Promise<unknown> | unknown;
    input: TShape;
    name: string;
    writes?: boolean;
}

export class ToolError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ToolError';
    }
}

export function toSummary(item: Item): ItemSummary {
    return {
        collection: item.collectionId,
        id: item.id,
        snippet: item.snippet,
        stem: stemOf(item.path ?? ''),
        tags: item.tags,
        title: item.title,
        type: item.type,
        updatedAt: item.updatedAt,
    };
}

function defineTool<TShape extends z.ZodRawShape>(definition: ToolDefinition<TShape>): VaultTool {
    const schema = z.object(definition.input);

    return {
        description: definition.description,
        input: definition.input,
        name: definition.name,
        async run(store, input) {
            const parsed = schema.safeParse(input ?? {});

            if (!parsed.success) {
                throw new ToolError(z.prettifyError(parsed.error));
            }

            return definition.handler(store, parsed.data);
        },
        writes: definition.writes ?? false,
    };
}

function detail(item: Item): Record<string, unknown> {
    const body = deriveSearchText(item);

    return {
        ...toSummary(item),
        body: body.slice(0, MAX_BODY_CHARACTERS),
        bodyTruncated: body.length > MAX_BODY_CHARACTERS,
        createdAt: item.createdAt,
        description: item.description,
        dueAt: item.dueAt,
        flags: item.flags,
        path: item.path,
        points: item.points,
        summary: item.summary,
        url: item.url,
    };
}

function find(store: VaultStore, reference: string): Item {
    const item = store.getItem(reference) ?? store.itemByStem(reference);

    if (!item) {
        throw new ToolError(`No item with id or filename stem "${reference}".`);
    }

    return item;
}

// An agent names the folder, and what it read may have told it which one. Hidden
// folders hold Lore's own files and the user's git data; `attachments` is not a collection.
const collection = z
    .string()
    .refine(
        (value) =>
            value === '' ||
            (!value.startsWith('/') &&
                !value.includes('\\') &&
                value.split('/').every((segment) => segment.trim() && !segment.startsWith('.')) &&
                value.split('/')[0].toLowerCase() !== 'attachments'),
        'A collection is a folder path inside the vault, like "Work/Projects".',
    );

const reference = z.string().min(1).describe("The item's id, or its filename stem.");

export const VAULT_TOOLS: readonly VaultTool[] = [
    defineTool({
        description:
            'Full-text search over titles, bodies, summaries, tags and URLs. Every term is prefix-matched and all must match, so prefer a few distinctive words over a sentence. An empty query lists the most recent items.',
        handler(store, { limit, query }) {
            return store
                .search(query)
                .slice(0, limit ?? DEFAULT_RESULTS)
                .map(toSummary);
        },
        input: {
            limit: z.number().int().min(1).max(MAX_RESULTS).optional(),
            query: z.string(),
        },
        name: 'search',
    }),
    defineTool({
        description: 'Reads one item in full: its Markdown body and its frontmatter fields.',
        handler(store, { id }) {
            return detail(find(store, id));
        },
        input: { id: reference },
        name: 'read_item',
    }),
    defineTool({
        description:
            'Lists the collections (folders) in the vault. A collection id is its path, e.g. "Work/Projects".',
        handler(store) {
            return store.listCollections();
        },
        input: {},
        name: 'list_collections',
    }),
    defineTool({
        description: 'Lists every tag in use, with how many items carry it.',
        handler(store) {
            return store.listTags();
        },
        input: {},
        name: 'list_tags',
    }),
    defineTool({
        description:
            'Lists the items that link to the given one, through frontmatter `related` or a [[wikilink]] in their body.',
        handler(store, { id }) {
            const item = find(store, id);

            return (store.itemMeta(item.id)?.backlinks ?? []).map(toSummary);
        },
        input: { id: reference },
        name: 'backlinks',
    }),
    defineTool({
        description:
            'Creates an item as a Markdown file. The filename is derived from the title. Put it in a collection by passing that folder path; a folder that does not exist yet is created. A "canvas" starts as an empty sketch: pass no body, then draw with add_to_canvas.',
        async handler(store, input) {
            const sketch = input.type === 'canvas';

            if (sketch && input.body !== undefined) {
                throw new ToolError('A canvas takes no body. Create it, then use add_to_canvas.');
            }

            const item = await store.createItem({
                body: sketch ? EMPTY_CANVAS_BODY : input.body,
                collectionId: input.collection || undefined,
                dueAt: input.dueAt,
                flags: {},
                related: [],
                summary: input.summary,
                tags: input.tags ?? [],
                title: input.title,
                type: input.type ?? 'note',
                url: input.url,
            });

            return detail(item);
        },
        input: {
            body: z.string().optional().describe('Markdown. Link other items with [[stem]].'),
            collection: collection.optional(),
            dueAt: z
                .string()
                .regex(/^\d{4}-\d{2}-\d{2}$/)
                .optional()
                .describe('A task deadline, YYYY-MM-DD.'),
            summary: z.string().optional(),
            tags: z.array(z.string()).optional(),
            title: z.string().min(1),
            type: z.enum(ITEM_TYPES).optional().describe('Defaults to "note".'),
            url: z.string().optional().describe('Where a link points. Links only.'),
        },
        name: 'create_item',
        writes: true,
    }),
    defineTool({
        description:
            'Changes fields of an existing item. Only the fields passed are touched; `body` and `tags` replace the whole value, so read the item first. Retitling does not rename the file.',
        async handler(store, { id, ...changes }) {
            const item = find(store, id);
            const patch: Partial<Item> = {};

            if (changes.body !== undefined) {
                // A sketch's body is its scene; a model's prose would replace the drawing.
                if (item.type === 'canvas') {
                    throw new ToolError(
                        'A canvas body is its drawing and cannot be set. Use add_to_canvas.',
                    );
                }

                patch.body = changes.body;
            }

            if (changes.collection !== undefined) {
                patch.collectionId = changes.collection;
            }

            if (changes.summary !== undefined) {
                patch.summary = changes.summary;
            }

            if (changes.tags !== undefined) {
                patch.tags = changes.tags;
            }

            if (changes.title !== undefined) {
                patch.title = changes.title;
            }

            const updated = await store.updateItem(item.id, patch);

            if (!updated) {
                throw new ToolError(`Item "${id}" disappeared while it was being updated.`);
            }

            return detail(updated);
        },
        input: {
            body: z.string().optional(),
            collection: collection.optional().describe('Moves the file. "" unfiles it.'),
            id: reference,
            summary: z.string().optional(),
            tags: z.array(z.string()).optional(),
            title: z.string().min(1).optional(),
        },
        name: 'update_item',
        writes: true,
    }),
    defineTool({
        description:
            'Draws shapes and arrows into a canvas item. It only adds: nothing already in the sketch is moved, restyled or removed, and the new shapes land below what is there. Shapes sit on a grid by `column` and `row` (from 0); leave both out and they run left to right. An arrow joins two shapes named by their `key` in this call, or by the exact label of a shape already in the sketch.',
        async handler(store, { arrows = [], id, shapes = [] }) {
            const item = find(store, id);

            if (item.type !== 'canvas') {
                throw new ToolError(`"${id}" is a ${item.type}, not a canvas.`);
            }

            if (!shapes.length && !arrows.length) {
                throw new ToolError('Nothing to draw: pass `shapes`, `arrows` or both.');
            }

            const { error, scene } = parseCanvasBody(item.body);

            if (!scene) {
                throw new ToolError(`This sketch cannot be read, so it was left alone: ${error}`);
            }

            let elements;

            try {
                elements = drawOnto(scene.elements, { arrows, shapes });
            } catch (failure) {
                if (failure instanceof DrawError) {
                    throw new ToolError(failure.message);
                }

                throw failure;
            }

            const updated = await store.updateItem(item.id, {
                body: writeCanvasBody(item.body, { ...scene, elements }),
            });

            if (!updated) {
                throw new ToolError(`Item "${id}" disappeared while it was being drawn on.`);
            }

            return { ...detail(updated), added: { arrows: arrows.length, shapes: shapes.length } };
        },
        input: {
            arrows: z
                .array(
                    z.object({
                        from: z.string().min(1),
                        label: z.string().max(MAX_LABEL_CHARACTERS).optional(),
                        to: z.string().min(1),
                    }),
                )
                .max(MAX_ARROWS)
                .optional(),
            id: reference,
            shapes: z
                .array(
                    z.object({
                        color: z.enum(SHAPE_COLORS).optional().describe('A fill. None by default.'),
                        column: z.number().int().min(0).max(MAX_SHAPES).optional(),
                        key: z.string().min(1).describe('A name of your own, for arrows.'),
                        kind: z
                            .enum(SHAPE_KINDS)
                            .optional()
                            .describe('Defaults to "rectangle". "text" is a label with no box.'),
                        label: z.string().trim().min(1).max(MAX_LABEL_CHARACTERS),
                        row: z.number().int().min(0).max(MAX_SHAPES).optional(),
                    }),
                )
                .max(MAX_SHAPES)
                .optional(),
        },
        name: 'add_to_canvas',
        writes: true,
    }),
];

export function toolsFor(access: 'read' | 'write'): VaultTool[] {
    return VAULT_TOOLS.filter((tool) => access === 'write' || !tool.writes);
}
