import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { PhrasingContent, RootContent } from 'mdast';

import type { Block, ParsedBody } from './types';

import { schema } from './schema';

const MARK_BY_TYPE: Readonly<Record<string, string>> = {
    delete: 'strike',
    emphasis: 'italic',
    inlineCode: 'code',
    strong: 'bold',
};

export function toDocument(parsed: ParsedBody): ProseMirrorNode {
    const content = parsed.blocks.map(toNode).filter((node): node is ProseMirrorNode => !!node);
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
    // A blank line does not start a new list, so `- a` followed by `- [ ] b`
    // arrives as one list with mixed items. Every item must be a checkbox, or
    // the plain ones gain a box they never had.
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
