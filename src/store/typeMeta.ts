// Per-type visual metadata (badge background, foreground, label) — verbatim
// from the prototype's `typeMeta`.

import type { ItemType } from './types';

export interface TypeMeta {
    bg: string;
    fg: string;
    label: string;
}

export const TYPE_META: Record<ItemType, TypeMeta> = {
    code: { bg: '#eef0f3', fg: '#5b6472', label: 'Code' },
    image: { bg: '#f7ecef', fg: '#a86b7c', label: 'Image' },
    link: { bg: '#ecedfb', fg: '#5b5bd6', label: 'Link' },
    note: { bg: '#f6f1e8', fg: '#9e7b46', label: 'Note' },
    task: { bg: '#e8f2ec', fg: '#4d855f', label: 'Task' },
};

export function typeMeta(t: ItemType): TypeMeta {
    return TYPE_META[t];
}
