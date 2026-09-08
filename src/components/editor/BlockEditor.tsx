// The block editor itself: a Tiptap document built from a Markdown body.
//
// It owns no saving policy. `BodyEditor` decides when a change is worth writing
// to disk; this component only reports that the document changed and can hand
// back Markdown on demand.

import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor } from '@tiptap/react';
import { useRef, useState } from 'react';

import { applyDocument, diffBlocks } from '../../markdown/apply';
import { guard } from '../../markdown/fragility';
import { parse } from '../../markdown/parse';
import { EXTENSIONS } from '../../markdown/schema';
import { toDocument } from '../../markdown/to-prosemirror';

interface BlockEditorProps {
    /** Place the caret here on mount. */
    autoFocus?: boolean;
    /** Called on every document change, with the body as Markdown. */
    onChange: (markdown: string) => void;
    placeholder?: string;
    /** The Markdown body. Read once per item; later edits flow out via onChange. */
    value: string;
}

export function BlockEditor({
    autoFocus,
    onChange,
    placeholder,
    value,
}: BlockEditorProps): React.JSX.Element {
    // The body is read once, here, and handed to the editor as its initial
    // content. Setting it imperatively afterwards would mean touching
    // `editor.commands` before the view exists — under StrictMode the editor is
    // also created, destroyed and recreated — and `commandManager` is null in
    // both windows. This component is keyed on the item id, so a different item
    // remounts it rather than needing a live swap.
    const [initial] = useState(() => {
        const parsed = parse(value);
        return { ...parsed, blocks: guard(parsed.blocks) };
    });
    const [content] = useState(() => toDocument(initial).toJSON());

    // The parse the document was built from. Block count and order must line up
    // with the document for source preservation to hold, so it is replaced only
    // when the document is rebuilt, never on a keystroke.
    const parsedRef = useRef(initial);
    // Top-level blocks the user has edited. Untouched blocks keep their bytes;
    // see the note on node identity in markdown/apply.ts.
    const dirtyRef = useRef<Set<number>>(new Set());
    // `true` once the block structure changed and per-block mapping is gone.
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
