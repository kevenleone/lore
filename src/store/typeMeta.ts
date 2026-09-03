// Per-type visual metadata (badge background, foreground, label). The colours
// resolve through the theme token set so the badges follow Light / Dark; the
// values themselves live in `theme/tokens.ts`.

import type { ItemType } from './types';

export interface TypeMeta {
    bg: string;
    fg: string;
    label: string;
}

export const TYPE_META: Record<ItemType, TypeMeta> = {
    code: { bg: 'var(--type-code-bg)', fg: 'var(--type-code-fg)', label: 'Code' },
    image: { bg: 'var(--type-image-bg)', fg: 'var(--type-image-fg)', label: 'Image' },
    link: { bg: 'var(--type-link-bg)', fg: 'var(--type-link-fg)', label: 'Link' },
    note: { bg: 'var(--type-note-bg)', fg: 'var(--type-note-fg)', label: 'Note' },
    task: { bg: 'var(--type-task-bg)', fg: 'var(--type-task-fg)', label: 'Task' },
};

export function typeMeta(t: ItemType): TypeMeta {
    return TYPE_META[t];
}
