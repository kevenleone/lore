// Per-type visual metadata (badge background, foreground, label). The colours
// resolve through the theme token set so the badges follow Light / Dark; the
// values themselves live in `theme/tokens.ts`.

import type { ItemType } from './types';

export interface TypeMeta {
    /** @deprecated Inline token references; retired as each caller moves to `chip`. */
    bg: string;
    /** Ground and ink for the type badge. */
    chip: string;
    /** The ink alone, for glyphs drawn without a badge behind them. */
    chipFg: string;
    /** @deprecated Inline token references; retired as each caller moves to `chip`. */
    fg: string;
    label: string;
}

export const TYPE_META: Record<ItemType, TypeMeta> = {
    code: {
        bg: 'var(--type-code-bg)',
        chip: 'bg-type-code-bg text-type-code-fg',
        chipFg: 'text-type-code-fg',
        fg: 'var(--type-code-fg)',
        label: 'Code',
    },
    image: {
        bg: 'var(--type-image-bg)',
        chip: 'bg-type-image-bg text-type-image-fg',
        chipFg: 'text-type-image-fg',
        fg: 'var(--type-image-fg)',
        label: 'Image',
    },
    link: {
        bg: 'var(--type-link-bg)',
        chip: 'bg-type-link-bg text-type-link-fg',
        chipFg: 'text-type-link-fg',
        fg: 'var(--type-link-fg)',
        label: 'Link',
    },
    note: {
        bg: 'var(--type-note-bg)',
        chip: 'bg-type-note-bg text-type-note-fg',
        chipFg: 'text-type-note-fg',
        fg: 'var(--type-note-fg)',
        label: 'Note',
    },
    task: {
        bg: 'var(--type-task-bg)',
        chip: 'bg-type-task-bg text-type-task-fg',
        chipFg: 'text-type-task-fg',
        fg: 'var(--type-task-fg)',
        label: 'Task',
    },
};

export function typeMeta(t: ItemType): TypeMeta {
    return TYPE_META[t];
}
