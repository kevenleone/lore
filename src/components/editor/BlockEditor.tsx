import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor } from '@tiptap/react';
import { useRef, useState } from 'react';

import { applyDocument, diffBlocks } from '../../markdown/apply';
import { guard } from '../../markdown/fragility';
import { parse } from '../../markdown/parse';
import { EXTENSIONS } from '../../markdown/schema';
import { toDocument } from '../../markdown/to-prosemirror';

interface BlockEditorProps {
    autoFocus?: boolean;
    onChange: (markdown: string) => void;
    placeholder?: string;
    /** Read once, at construction. Later edits flow out through `onChange`. */
    value: string;
}

export function BlockEditor({
    autoFocus,
    onChange,
    placeholder,
    value,
}: BlockEditorProps): React.JSX.Element {
    // Content goes in at construction: `editor.commands` is null until the view
    // exists, and again while StrictMode recreates it.
    const [initial] = useState(() => {
        const parsed = parse(value);
        return { ...parsed, blocks: guard(parsed.blocks) };
    });
    const [content] = useState(() => toDocument(initial).toJSON());

    // Must stay aligned with the document for source preservation to hold.
    const parsedRef = useRef(initial);
    const dirtyRef = useRef<Set<number>>(new Set());
    const rewriteAllRef = useRef(false);

    const editor = useEditor(
        {
            autofocus: autoFocus ? 'end' : false,
            content,
            extensions: [...EXTENSIONS, Placeholder.configure({ placeholder: placeholder ?? '' })],
            onUpdate: ({ editor: instance, transaction }) => {
                const changed = diffBlocks(transaction.before, transaction.doc);
                if (changed === null) rewriteAllRef.current = true;
                else for (const index of changed) dirtyRef.current.add(index);

                const doc = instance.state.doc;
                const dirty = rewriteAllRef.current
                    ? new Set(Array.from({ length: doc.childCount }, (_, i) => i))
                    : dirtyRef.current;
                onChange(applyDocument(parsedRef.current, doc, dirty));
            },
        },
        [],
    );

    return <EditorContent className="lore-editor" editor={editor} />;
}
