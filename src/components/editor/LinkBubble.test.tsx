// @vitest-environment jsdom

import type { Editor } from '@tiptap/core';

import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BlockEditor } from './BlockEditor';

const openExternal = vi.hoisted(() => vi.fn());

vi.mock('../../lib/appInfo', () => ({ openExternal }));

afterEach(() => {
    cleanup();
    openExternal.mockReset();
});

Range.prototype.getBoundingClientRect = () => new DOMRect();
Range.prototype.getClientRects = () => [] as unknown as DOMRectList;

const URL = 'https://example.com/wiki/Culture';

function findButton(container: HTMLElement, label: string): Promise<HTMLButtonElement> {
    return waitFor(() => {
        const button = container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`);

        expect(button).not.toBeNull();

        return button!;
    });
}

async function mount(markdown: string) {
    const onChange = vi.fn();
    const view = render(<BlockEditor onChange={onChange} value={markdown} />);
    const dom = await waitFor(() => {
        const element = view.container.querySelector<{ editor?: Editor } & HTMLElement>(
            '.ProseMirror',
        );

        expect(element?.editor).toBeDefined();

        return element!;
    });
    const editor = dom.editor!;

    // jsdom has no layout, so ProseMirror cannot map a caret from coordinates.
    editor.view.coordsAtPos = () => ({ bottom: 0, left: 0, right: 0, top: 0 });

    return { ...view, dom, editor, onChange };
}

function placeCaretInLink(editor: Editor): void {
    act(() => {
        editor.commands.focus();
        editor.commands.setTextSelection(3);
        editor.view.hasFocus = () => true;
        editor.view.dispatch(editor.state.tr);
    });
}

describe('LinkBubble', () => {
    it('stays hidden while the caret is outside a link', async () => {
        const { container } = await mount(`plain [**Culture**](${URL})\n`);

        expect(container.querySelector('[data-link-bubble]')).toBeNull();
    });

    it('opens the link in the system browser', async () => {
        const { container, editor } = await mount(`[**Culture**](${URL})\n`);

        placeCaretInLink(editor);

        fireEvent.click(await findButton(container, 'Open link'));
        expect(openExternal).toHaveBeenCalledWith(URL);
    });

    it('edits the text and URL, keeping the bold', async () => {
        const { container, editor, onChange } = await mount(`[**Culture**](${URL})\n`);

        placeCaretInLink(editor);

        fireEvent.click(await findButton(container, 'Edit link'));
        fireEvent.change(container.querySelector('[aria-label="Link text"]')!, {
            target: { value: 'Values' },
        });
        fireEvent.change(container.querySelector('[aria-label="Link URL"]')!, {
            target: { value: 'https://example.com/values' },
        });
        fireEvent.submit(container.querySelector('form')!);

        expect(onChange).toHaveBeenLastCalledWith('[**Values**](https://example.com/values)\n');
    });

    it('opens a link on Cmd-click without entering it', async () => {
        const { dom, editor } = await mount(`<${URL}>\n`);
        const event = new MouseEvent('click', { metaKey: true });

        Object.defineProperty(event, 'target', { value: dom.querySelector('a') });

        // jsdom cannot drive ProseMirror's mousedown/mouseup click detection.
        const handled = editor.view.someProp('handleClick', (handle) =>
            handle(editor.view, 3, event),
        );

        expect(handled).toBe(true);
        expect(openExternal).toHaveBeenCalledWith(URL);
    });
});
