import type { Editor } from '@tiptap/core';

import { getMarkRange } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';

import { openExternal } from '../../lib/appInfo';
import { Close, External, Pencil } from '../common/glyphs';

interface LinkBubbleProps {
    editor: Editor | null;
    /** The positioned element the bubble is placed inside. */
    frame: React.RefObject<HTMLDivElement | null>;
}

interface LinkTarget {
    from: number;
    href: string;
    left: number;
    text: string;
    to: number;
    top: number;
}

const BUBBLE_GAP = 6;

const ICON_BUTTON =
    'inline-flex shrink-0 items-center justify-center rounded-7 border-none bg-transparent p-[5px] text-text3 hover:bg-surface2 hover:text-text';

const FIELD =
    'min-w-0 flex-1 rounded-7 border border-border bg-surface3 px-[7px] py-1 font-[inherit] text-body text-text outline-none focus:border-accent';

export function LinkBubble({ editor, frame }: LinkBubbleProps): null | React.JSX.Element {
    const live = useEditorState<LinkTarget | null>({
        editor,
        equalityFn: (previous, next) =>
            previous === next ||
            (previous !== null &&
                next !== null &&
                previous.from === next.from &&
                previous.to === next.to &&
                previous.href === next.href &&
                previous.top === next.top &&
                previous.left === next.left),
        selector: ({ editor: instance }): LinkTarget | null =>
            instance ? linkAtSelection(instance, frame.current) : null,
    });

    const [editing, setEditing] = useState<LinkTarget | null>(null);
    const [text, setText] = useState('');
    const [href, setHref] = useState('');
    const textRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) textRef.current?.select();
    }, [editing]);

    const target = editing ?? live;
    if (!editor || !target) return null;

    const startEditing = (): void => {
        setText(target.text);
        setHref(target.href);
        setEditing(target);
    };

    const stopEditing = (): void => {
        setEditing(null);
        editor.commands.focus();
    };

    const save = (): void => {
        const nextHref = href.trim();
        const nextText = text.length ? text : nextHref;
        const chain = editor.chain().focus().setTextSelection({
            from: target.from,
            to: target.to,
        });

        if (!nextHref) {
            chain.unsetLink().run();
        } else if (nextText === target.text) {
            chain.setLink({ href: nextHref }).run();
        } else {
            // Carries bold/italic from the old text so only the words change.
            const marks = editor.state.doc
                .resolve(target.from + 1)
                .marks()
                .filter((mark) => mark.type.name !== 'link')
                .map((mark) => ({ attrs: mark.attrs, type: mark.type.name }));
            chain
                .insertContent({
                    marks: [...marks, { attrs: { href: nextHref }, type: 'link' }],
                    text: nextText,
                    type: 'text',
                })
                .run();
        }
        setEditing(null);
    };

    const remove = (): void => {
        editor
            .chain()
            .focus()
            .setTextSelection({ from: target.from, to: target.to })
            .unsetLink()
            .run();
    };

    // Buttons act without taking focus: the editor keeps its selection, and
    // WebKit's null `relatedTarget` would otherwise close the form mid-click.
    const keepFocus = (event: React.MouseEvent): void => event.preventDefault();

    return (
        <div
            className="absolute z-[60] max-w-[min(420px,100%)] rounded-9 border border-border bg-surface p-[5px] shadow-float"
            data-link-bubble=""
            onMouseDown={editing ? undefined : keepFocus}
            // Anchored to a caret position measured at runtime.
            style={{ left: target.left, top: target.top }}
        >
            {editing ? (
                <form
                    className="flex w-[320px] max-w-full flex-col gap-[6px] p-[3px]"
                    onBlur={(event) => {
                        if (event.currentTarget.contains(event.relatedTarget)) return;
                        setEditing(null);
                    }}
                    onKeyDown={(event) => {
                        if (event.key !== 'Escape') return;
                        event.preventDefault();
                        stopEditing();
                    }}
                    onSubmit={(event) => {
                        event.preventDefault();
                        save();
                    }}
                >
                    <label className="flex items-center gap-2 text-body-sm text-text3">
                        <span className="w-[34px]">Text</span>
                        <input
                            aria-label="Link text"
                            className={FIELD}
                            onChange={(event) => setText(event.target.value)}
                            ref={textRef}
                            value={text}
                        />
                    </label>
                    <label className="flex items-center gap-2 text-body-sm text-text3">
                        <span className="w-[34px]">URL</span>
                        <input
                            aria-label="Link URL"
                            className={FIELD}
                            onChange={(event) => setHref(event.target.value)}
                            value={href}
                        />
                    </label>
                    <div className="flex justify-end gap-[6px]">
                        <button
                            className="rounded-7 border border-border bg-transparent px-[9px] py-1 font-[inherit] text-body-sm text-text2 hover:bg-surface2"
                            onClick={stopEditing}
                            onMouseDown={keepFocus}
                            type="button"
                        >
                            Cancel
                        </button>
                        <button
                            className="rounded-7 border-none bg-accent px-[9px] py-1 font-[inherit] text-body-sm text-white hover:opacity-90"
                            onMouseDown={keepFocus}
                            type="submit"
                        >
                            Save
                        </button>
                    </div>
                </form>
            ) : (
                <div className="flex items-center gap-[2px]">
                    <button
                        className="min-w-0 truncate rounded-7 border-none bg-transparent px-[7px] py-1 text-left font-[inherit] text-body-sm text-accent hover:bg-surface2"
                        onClick={() => void openExternal(target.href)}
                        title={target.href}
                        type="button"
                    >
                        {target.href}
                    </button>
                    <button
                        aria-label="Open link"
                        className={ICON_BUTTON}
                        onClick={() => void openExternal(target.href)}
                        title="Open link"
                        type="button"
                    >
                        <External size={13} />
                    </button>
                    <button
                        aria-label="Edit link"
                        className={ICON_BUTTON}
                        onClick={startEditing}
                        title="Edit link"
                        type="button"
                    >
                        <Pencil size={13} />
                    </button>
                    <button
                        aria-label="Remove link"
                        className={ICON_BUTTON}
                        onClick={remove}
                        title="Remove link"
                        type="button"
                    >
                        <Close size={13} />
                    </button>
                </div>
            )}
        </div>
    );
}

function linkAtSelection(editor: Editor, frame: HTMLDivElement | null): LinkTarget | null {
    if (!frame || !editor.isInitialized || editor.isDestroyed) return null;
    const { selection } = editor.state;
    const type = editor.schema.marks.link;
    if (!type || !editor.isFocused || !editor.isActive('link')) return null;

    const range = getMarkRange(selection.$from, type) ?? getMarkRange(selection.$to, type);
    if (!range || selection.from < range.from || selection.to > range.to) return null;

    const mark = editor.state.doc
        .resolve(range.from + 1)
        .marks()
        .find((candidate) => candidate.type === type);
    const href = String(mark?.attrs.href ?? '');

    // Client rects include the Text size `zoom`; the bubble is laid out inside it.
    const frameRect = frame.getBoundingClientRect();
    const scale = frame.offsetWidth ? frameRect.width / frame.offsetWidth : 1;
    const coords = editor.view.coordsAtPos(range.from);

    return {
        from: range.from,
        href,
        left: Math.max(0, (coords.left - frameRect.left) / scale),
        text: editor.state.doc.textBetween(range.from, range.to),
        to: range.to,
        top: (coords.bottom - frameRect.top) / scale + BUBBLE_GAP,
    };
}
