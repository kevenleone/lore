// Drawing `[[target]]` in the body as a link you can click.
//
// A decoration rather than a mark, deliberately. A mark would put wikilinks in
// the document model, and every one of them would then have to survive the
// mdast round-trip to come back out as the same bytes. Decorations live only in
// the view: the text stays exactly the text that was parsed, so a link Lore
// cannot resolve — the note you have not written yet — is impossible to mangle.
//
// It also keeps the brackets on screen and editable, which is what makes fixing
// a typo in a target possible at all.

import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import type { Item } from '../store/types';

import { WIKILINK, wikilinkParts } from '../lib/wikilinks';

export interface Found {
    from: number;
    /** The item it resolves to, or null for a target nothing answers to. */
    id: null | string;
    to: number;
}

export interface WikilinkOptions {
    /** Opens the item a click landed on. */
    onOpen: (id: string) => void;
    /** The current answer for a target, read fresh so new notes resolve as they arrive. */
    resolve: (target: string) => Item | null;
}

const LIVE = 'cursor-pointer text-accent underline decoration-accent/40';
/** A target nothing answers to. Muted rather than hidden: the text is still yours. */
const DEAD = 'cursor-default text-text3 underline decoration-dotted decoration-text3/50';

export const wikilinkPluginKey = new PluginKey('wikilink');

export const Wikilink = Extension.create<WikilinkOptions>({
    addOptions() {
        return { onOpen: () => {}, resolve: () => null };
    },

    addProseMirrorPlugins() {
        const { onOpen, resolve } = this.options;

        return [
            new Plugin({
                key: wikilinkPluginKey,
                props: {
                    decorations: (state) =>
                        DecorationSet.create(
                            state.doc,
                            findWikilinks(state.doc, resolve).map((found) =>
                                Decoration.inline(found.from, found.to, {
                                    class: found.id ? LIVE : DEAD,
                                    ...(found.id ? { 'data-wikilink': found.id } : {}),
                                }),
                            ),
                        ),
                    handleClick: (view, position) => {
                        const hit = findWikilinks(view.state.doc, resolve).find(
                            (found) => position >= found.from && position < found.to,
                        );

                        if (!hit?.id) {
                            return false;
                        }

                        onOpen(hit.id);

                        return true;
                    },
                },
            }),
        ];
    },

    name: 'wikilink',
});

/** Every wikilink in the document, with the range a click is tested against. */
export function findWikilinks(
    doc: ProseMirrorNode,
    resolve: (target: string) => Item | null,
): Found[] {
    const found: Found[] = [];

    doc.descendants((node, position) => {
        if (node.type.spec.code) {
            // A fenced block is showing the syntax, not using it. Returning
            // false also stops the walk descending into it.
            return false;
        }

        if (!node.isText || !node.text) {
            return true;
        }

        // Same reason, for `` `[[x]]` `` inside a paragraph.
        if (node.marks.some((mark) => mark.type.name === 'code')) {
            return true;
        }

        for (const match of node.text.matchAll(WIKILINK)) {
            const { target } = wikilinkParts(match[1]);
            const start = position + (match.index ?? 0);

            found.push({
                from: start,
                id: resolve(target)?.id ?? null,
                to: start + match[0].length,
            });
        }

        return true;
    });

    return found;
}
