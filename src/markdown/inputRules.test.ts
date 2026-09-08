// @vitest-environment jsdom

import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import { EXTENSIONS } from './schema';

function editorWith(text: string): Editor {
    const editor = new Editor({
        content: '<p></p>',
        element: document.createElement('div'),
        extensions: EXTENSIONS,
    });
    editor.commands.focus('end');
    type(editor, text);
    return editor;
}

/** Types `text` at the end of the document, running input rules as it goes. */
function type(editor: Editor, text: string): void {
    for (const char of text) {
        const { view } = editor;
        const { from, to } = view.state.selection;
        // The fifth argument is prosemirror-view's `deflt`: the transaction it
        // would have applied had no rule matched.
        const insert = () => view.state.tr.insertText(char, from, to);
        const handled = view.someProp('handleTextInput', (f) => f(view, from, to, char, insert));
        if (!handled) view.dispatch(insert());
    }
}

const firstNode = (text: string) => {
    const editor = editorWith(text);
    const node = editor.state.doc.firstChild;
    const result = { attrs: node?.attrs, text: node?.textContent, type: node?.type.name };
    editor.destroy();
    return result;
};

describe('Markdown input rules', () => {
    it('turns `# ` into a heading', () => {
        expect(firstNode('# Title')).toMatchObject({ text: 'Title', type: 'heading' });
        expect(firstNode('# Title').attrs?.level).toBe(1);
    });

    it('supports every heading level the schema allows', () => {
        for (const level of [1, 2, 3, 4]) {
            const node = firstNode(`${'#'.repeat(level)} Heading`);
            expect(node.type, `level ${level}`).toBe('heading');
            expect(node.attrs?.level, `level ${level}`).toBe(level);
        }
    });

    it('turns `- ` into a bullet list', () => {
        expect(firstNode('- an item')).toMatchObject({ text: 'an item', type: 'bulletList' });
    });

    it('turns `1. ` into an ordered list', () => {
        expect(firstNode('1. an item')).toMatchObject({ text: 'an item', type: 'orderedList' });
    });

    it('turns `> ` into a blockquote', () => {
        expect(firstNode('> quoted')).toMatchObject({ text: 'quoted', type: 'blockquote' });
    });

    it('turns ``` into a code block once the fence is closed by a space', () => {
        // Tiptap's rule is /^```([a-z]+)?[\s\n]$/ — three backticks alone are
        // still prose, which is why typing them and stopping looks like nothing
        // happened.
        expect(firstNode('```')).toMatchObject({ type: 'paragraph' });
        expect(firstNode('``` ')).toMatchObject({ type: 'codeBlock' });
        expect(firstNode('```js ')).toMatchObject({ type: 'codeBlock' });
    });

    it('turns `[ ] ` into a task list', () => {
        expect(firstNode('[ ] todo')).toMatchObject({ type: 'taskList' });
    });

    it('applies inline marks', () => {
        const editor = editorWith('**bold** and *italic* and `code`');
        const marks = new Set<string>();
        editor.state.doc.descendants((node) => {
            for (const mark of node.marks) marks.add(mark.type.name);
        });
        editor.destroy();
        expect(marks).toContain('bold');
        expect(marks).toContain('italic');
        expect(marks).toContain('code');
    });

    it('leaves ordinary prose alone', () => {
        expect(firstNode('just a sentence')).toMatchObject({
            text: 'just a sentence',
            type: 'paragraph',
        });
    });
});
