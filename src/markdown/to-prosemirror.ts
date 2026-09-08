// mdast → ProseMirror document.
//
// Every top-level block carries the source it came from, so the serializer can
// hand back the original bytes for anything the user did not touch. Inline
// content is converted structurally; block-level source is what matters for
// diff stability.

import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { PhrasingContent, RootContent } from 'mdast';

import type { Block, ParsedBody } from './types';

import { schema } from './schema';

/** Where a block's original source is parked while it is being edited. */
export interface BlockSource {
    source: string;
    type: string;
}

const MARK_BY_TYPE: Readonly<Record<string, string>> = {
    delete: 'strike',
    emphasis: 'italic',
    inlineCode: 'code',
    strong: 'bold',
};

export function toDocument(parsed: ParsedBody): ProseMirrorNode {
    const content = parsed.blocks.map(toNode).filter((node): node is ProseMirrorNode => !!node);
    // An empty body still needs one editable paragraph to put a cursor in.
    return schema.node('doc', null, content.length ? content : [schema.node('paragraph')]);
}

function blockNode(node: RootContent): null | ProseMirrorNode {
    switch (node.type) {
        case 'blockquote':
            return schema.node('blockquote', null, childBlocks(node.children));
        case 'code':
            return schema.node(
                'codeBlock',
                { language: node.lang ?? null },
                node.value ? [schema.text(node.value)] : [],
            );
        case 'heading':
            return schema.node('heading', { level: node.depth }, inline(node.children));
        case 'list':
            return listNode(node);
        case 'paragraph':
            return schema.node('paragraph', null, inline(node.children));
        case 'thematicBreak':
            return schema.node('horizontalRule');
        default:
            return null;
    }
}

function childBlocks(children: readonly RootContent[]): ProseMirrorNode[] {
    const out: ProseMirrorNode[] = [];
    for (const child of children) {
        const node = blockNode(child);
        if (node) out.push(node);
    }
    // A list item must contain at least one block for the schema to accept it.
    return out.length ? out : [schema.node('paragraph')];
}

function collectInline(
    children: readonly PhrasingContent[],
    marks: readonly string[],
    out: ProseMirrorNode[],
): void {
    for (const child of children) {
        const markName = MARK_BY_TYPE[child.type];

        if (child.type === 'text') {
            if (child.value) out.push(schema.text(child.value, resolveMarks(marks)));
            continue;
        }
        if (child.type === 'inlineCode') {
            out.push(schema.text(child.value, resolveMarks([...marks, 'code'])));
            continue;
        }
        if (child.type === 'break') {
            out.push(schema.node('hardBreak'));
            continue;
        }
        if (child.type === 'link') {
            const withLink = schema.marks.link.create({ href: child.url, title: child.title });
            const nested: ProseMirrorNode[] = [];
            collectInline(child.children, marks, nested);
            for (const node of nested) out.push(node.mark(withLink.addToSet(node.marks)));
            continue;
        }
        if (markName && 'children' in child) {
            collectInline(child.children, [...marks, markName], out);
            continue;
        }
        // Anything else (images, footnote references, raw inline HTML) has no
        // inline representation here; keep its literal text rather than drop it.
        if ('value' in child && typeof child.value === 'string') {
            out.push(schema.text(child.value, resolveMarks(marks)));
        }
    }
}

function inline(children: readonly PhrasingContent[]): ProseMirrorNode[] {
    const out: ProseMirrorNode[] = [];
    collectInline(children, [], out);
    return out;
}

function listNode(node: Extract<RootContent, { type: 'list' }>): ProseMirrorNode {
    // GFM checkboxes are a task list, which is a different node than a bullet
    // list even though Markdown spells them with the same marker — and a blank
    // line between them does not start a new list, so `- a` followed by
    // `- [ ] b` arrives here as one list with mixed items.
    //
    // Every item must be a checkbox for this to be a task list. Treating a
    // mixed list as one would give the plain items a checkbox they never had;
    // as a bullet list it loses the boxes instead, and the fragility gate
    // catches that and carries the whole list as source rather than either.
    const isTask =
        node.children.length > 0 &&
        node.children.every((item) => typeof item.checked === 'boolean');
    const itemName = isTask ? 'taskItem' : 'listItem';
    const listName = isTask ? 'taskList' : node.ordered ? 'orderedList' : 'bulletList';

    const items = node.children.map((item) =>
        schema.node(
            itemName,
            isTask ? { checked: item.checked ?? false } : null,
            childBlocks(item.children),
        ),
    );

    const attrs = node.ordered && !isTask ? { start: node.start ?? 1 } : null;
    return schema.node(listName, attrs, items);
}

function resolveMarks(names: readonly string[]) {
    return names.map((name) => schema.marks[name].create());
}

function toNode(block: Block): null | ProseMirrorNode {
    if (block.type === 'unknown' || !block.node) {
        return schema.node('unknownBlock', { source: block.source });
    }
    return blockNode(block.node) ?? schema.node('unknownBlock', { source: block.source });
}
