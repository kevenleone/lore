// ProseMirror document → mdast → Markdown.
//
// This is the path a *changed* block takes. Untouched blocks never come through
// here — they are written from their original source — so normalization by the
// generator only ever affects text the user actually edited.

import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { BlockContent, ListItem, PhrasingContent, RootContent } from 'mdast';

import { gfmToMarkdown } from 'mdast-util-gfm';
import { toMarkdown } from 'mdast-util-to-markdown';

/** Markdown for one top-level block, matching what `parse` would read back. */
export function generateBlock(node: ProseMirrorNode): string {
    if (node.type.name === 'unknownBlock') return String(node.attrs.source ?? '');

    const mdast = toBlockContent(node);
    if (!mdast) return '';

    return toMarkdown(
        { children: [mdast], type: 'root' },
        {
            bullet: '-',
            emphasis: '_',
            extensions: [gfmToMarkdown()],
            fences: true,
            rule: '-',
            strong: '*',
        },
    ).trimEnd();
}

function childBlocks(node: ProseMirrorNode): BlockContent[] {
    const out: BlockContent[] = [];
    node.forEach((child) => {
        const block = toBlockContent(child);
        if (block) out.push(block);
    });
    return out;
}

function listItems(node: ProseMirrorNode): ListItem[] {
    const items: ListItem[] = [];
    node.forEach((child) => {
        const checked = child.type.name === 'taskItem' ? !!child.attrs.checked : null;
        items.push({ checked, children: childBlocks(child), spread: false, type: 'listItem' });
    });
    return items;
}

function toBlockContent(node: ProseMirrorNode): BlockContent | null {
    switch (node.type.name) {
        case 'blockquote':
            return { children: childBlocks(node), type: 'blockquote' };
        case 'bulletList':
            return { children: listItems(node), ordered: false, spread: false, type: 'list' };
        case 'codeBlock':
            return {
                lang: (node.attrs.language as null | string) ?? null,
                type: 'code',
                value: node.textContent,
            };
        case 'heading':
            return {
                children: inline(node),
                depth: (node.attrs.level as 1 | 2 | 3 | 4 | 5 | 6) ?? 1,
                type: 'heading',
            };
        case 'horizontalRule':
            return { type: 'thematicBreak' };
        case 'orderedList':
            return {
                children: listItems(node),
                ordered: true,
                spread: false,
                start: (node.attrs.start as number) ?? 1,
                type: 'list',
            };
        case 'paragraph':
            return { children: inline(node), type: 'paragraph' };
        case 'taskList':
            return { children: listItems(node), ordered: false, spread: false, type: 'list' };
        default:
            return null;
    }
}

const MARK_ORDER = ['link', 'bold', 'italic', 'strike', 'code'] as const;

/** Every top-level block of a document, as Markdown. */
export function generateBlocks(doc: ProseMirrorNode): string[] {
    const out: string[] = [];
    doc.forEach((child) => out.push(generateBlock(child)));
    return out;
}

export function toRootContent(node: ProseMirrorNode): null | RootContent {
    return toBlockContent(node);
}

function inline(node: ProseMirrorNode): PhrasingContent[] {
    const out: PhrasingContent[] = [];
    node.forEach((child) => {
        if (child.type.name === 'hardBreak') {
            out.push({ type: 'break' });
            return;
        }
        if (!child.isText) return;

        let built: PhrasingContent = { type: 'text', value: child.text ?? '' };
        // Innermost first, so the outermost mark ends up wrapping everything.
        for (const name of [...MARK_ORDER].reverse()) {
            const mark = child.marks.find((m) => m.type.name === name);
            if (!mark) continue;
            built = wrap(name, mark.attrs, built, child.text ?? '');
        }
        out.push(built);
    });
    return out;
}

function wrap(
    name: string,
    attrs: Record<string, unknown>,
    inner: PhrasingContent,
    text: string,
): PhrasingContent {
    switch (name) {
        case 'bold':
            return { children: [inner], type: 'strong' };
        case 'code':
            return { type: 'inlineCode', value: text };
        case 'italic':
            return { children: [inner], type: 'emphasis' };
        case 'link':
            return {
                children: [inner],
                title: (attrs.title as null | string) ?? null,
                type: 'link',
                url: String(attrs.href ?? ''),
            };
        case 'strike':
            return { children: [inner], type: 'delete' };
        default:
            return inner;
    }
}
