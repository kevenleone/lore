// The editor's document schema, defined once and shared by the converters.
//
// `getSchema` runs without a DOM, so everything below — and every test that
// builds a document from it — works under plain Node. That is deliberate: the
// mdast ↔ document mapping is where corruption bugs live, and it must be
// testable without a browser.

import type { Extensions } from '@tiptap/core';

import { getSchema, Node } from '@tiptap/core';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { type Schema } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';

/**
 * A block the editor deliberately does not model: raw HTML, a footnote
 * definition, a `$$` math fence, a `:::` directive. It holds its source and is
 * written back untouched, so opening a note can never cost the user content
 * Lore happens not to understand.
 */
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

/*
 * Appearance lives here, as Tailwind classes on each node, rather than in a
 * stylesheet. Preflight strips heading sizes, list markers and block margins,
 * so without this the editor renders structurally correct HTML that all looks
 * like body text.
 *
 * Body prose matches the detail pane it replaces: `text-title-lg` at 1.65.
 * Heading sizes are arbitrary px because the shared scale tops out at 15px —
 * see the note on px units at the top of theme/tailwind.css.
 */
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
