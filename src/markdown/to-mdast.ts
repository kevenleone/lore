import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type {
    AlignType,
    BlockContent,
    ListItem,
    PhrasingContent,
    RootContent,
    Table,
    TableRow,
} from 'mdast';

import { gfmToMarkdown } from 'mdast-util-gfm';
import { toMarkdown } from 'mdast-util-to-markdown';

export function generateBlock(node: ProseMirrorNode): string {
    if (node.type.name === 'unknownBlock') {
        return String(node.attrs.source ?? '');
    }

    const mdast = toBlockContent(node);

    if (!mdast) {
        return '';
    }

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

/** A line break would end the row, so a cell writes one the way GFM tables do. */
function cellInline(cell: ProseMirrorNode): PhrasingContent[] {
    return (cell.firstChild ? inline(cell.firstChild) : []).map((child) =>
        child.type === 'break' ? { type: 'html', value: '<br>' } : child,
    );
}

function childBlocks(node: ProseMirrorNode): BlockContent[] {
    const out: BlockContent[] = [];

    node.forEach((child) => {
        const block = toBlockContent(child);

        if (block) {
            out.push(block);
        }
    });

    return out;
}

function listItems(node: ProseMirrorNode): ListItem[] {
    const items: ListItem[] = [];

    node.forEach((child) => {
        const checked = child.type.name === 'taskItem' ? !!child.attrs.checked : null;

        const children = childBlocks(child);
        // Written tight, a second paragraph or a table would run into the line above it.
        const spread = children.some((block, index) => index > 0 && block.type !== 'list');

        items.push({ checked, children, spread, type: 'listItem' });
    });

    return items;
}

function tableOf(node: ProseMirrorNode): Table {
    const children: TableRow[] = [];

    node.forEach((row) => {
        const cells: TableRow['children'] = [];

        row.forEach((cell) => {
            cells.push({ children: cellInline(cell), type: 'tableCell' });
        });
        children.push({ children: cells, type: 'tableRow' });
    });

    const align: AlignType[] = [];

    node.firstChild?.forEach((cell) => {
        align.push((cell.attrs.align as AlignType | undefined) ?? null);
    });

    return { align, children, type: 'table' };
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
        case 'table':
            return tableOf(node);
        case 'taskList':
            return { children: listItems(node), ordered: false, spread: false, type: 'list' };
        default:
            return null;
    }
}

const MARK_ORDER = ['link', 'bold', 'italic', 'strike', 'code'] as const;

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

        if (!child.isText) {
            return;
        }

        let built: PhrasingContent = { type: 'text', value: child.text ?? '' };

        // Innermost first, so the outermost mark wraps everything.
        for (const name of [...MARK_ORDER].reverse()) {
            const mark = child.marks.find((mark) => mark.type.name === name);

            if (!mark) {
                continue;
            }

            built = wrap(name, mark.attrs, built, child.text ?? '');
        }

        out.push(built);
    });

    return mergeSiblings(out);
}

// Marks sit on each text run; unmerged, `**a `b`**` would be written as two `strong`s.
function mergeSiblings(nodes: readonly PhrasingContent[]): PhrasingContent[] {
    const out: PhrasingContent[] = [];

    for (const node of nodes) {
        const previous = out[out.length - 1] as PhrasingContent | undefined;

        if (
            previous &&
            'children' in previous &&
            'children' in node &&
            sameWrapper(previous, node)
        ) {
            previous.children = [
                ...previous.children,
                ...node.children,
            ] as typeof previous.children;
            continue;
        }

        out.push('children' in node ? { ...node } : node);
    }

    for (const node of out) {
        if ('children' in node) {
            node.children = mergeSiblings(node.children) as typeof node.children;
        }
    }

    return out;
}

function sameWrapper(left: PhrasingContent, right: PhrasingContent): boolean {
    if (left.type !== right.type) {
        return false;
    }

    if (left.type === 'link' && right.type === 'link') {
        return left.url === right.url && left.title === right.title;
    }

    return true;
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
