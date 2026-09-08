import type { Extensions } from '@tiptap/core';

import { getSchema, Node } from '@tiptap/core';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { type Schema } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';

/** Holds the source of a block the editor does not model, and writes it back. */
export const UnknownBlock = Node.create({
    // Not `code`: nothing here is edited, it is only carried.
    addAttributes() {
        return { source: { default: '' } };
    },
    atom: true,
    group: 'block',
    name: 'unknownBlock',
    parseHTML() {
        return [{ tag: 'div[data-unknown-block]' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['div', { ...HTMLAttributes, 'data-unknown-block': '' }];
    },
    selectable: true,
});

/* Preflight strips heading sizes, list markers and block margins, so without
 * these every block would render as body text. Heading sizes are in
 * theme/tailwind.css, where they can vary by level. */
const BLOCK_SPACING = 'mt-[14px] first:mt-0';

const NODE_CLASSES = {
    blockquote: `${BLOCK_SPACING} border-l-2 border-border pl-[14px] text-text3`,
    bulletList: `${BLOCK_SPACING} list-disc pl-[22px]`,
    codeBlock: `${BLOCK_SPACING} overflow-x-auto rounded-11 border border-border bg-surface3 p-4 font-mono text-body-lg leading-[1.7] text-text2`,
    horizontalRule: 'my-6 border-none border-t border-border',
    listItem: 'mt-[3px] leading-[1.65] marker:text-text3',
    orderedList: `${BLOCK_SPACING} list-decimal pl-[22px]`,
    paragraph: `${BLOCK_SPACING} text-title-lg leading-[1.65] text-text2`,
    taskItem: 'flex items-start gap-[8px] leading-[1.65]',
    taskList: `${BLOCK_SPACING} list-none pl-0`,
} as const;

export const EXTENSIONS: Extensions = [
    StarterKit.configure({
        blockquote: { HTMLAttributes: { class: NODE_CLASSES.blockquote } },
        bulletList: { HTMLAttributes: { class: NODE_CLASSES.bulletList } },
        code: {
            HTMLAttributes: { class: 'rounded-sm bg-surface3 px-[4px] font-mono text-body-lg' },
        },
        codeBlock: { HTMLAttributes: { class: NODE_CLASSES.codeBlock } },
        heading: { levels: [1, 2, 3, 4] },
        horizontalRule: { HTMLAttributes: { class: NODE_CLASSES.horizontalRule } },
        link: { HTMLAttributes: { class: 'text-accent underline' } },
        listItem: { HTMLAttributes: { class: NODE_CLASSES.listItem } },
        orderedList: { HTMLAttributes: { class: NODE_CLASSES.orderedList } },
        paragraph: { HTMLAttributes: { class: NODE_CLASSES.paragraph } },
    }),
    TaskList.configure({ HTMLAttributes: { class: NODE_CLASSES.taskList } }),
    TaskItem.configure({ HTMLAttributes: { class: NODE_CLASSES.taskItem }, nested: true }),
    UnknownBlock,
];

export function buildSchema(): Schema {
    return getSchema(EXTENSIONS);
}

export const schema: Schema = buildSchema();
