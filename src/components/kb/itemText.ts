// Row text shared by the three library layouts.

import type { Item } from '../../store/types';

import { typeMeta } from '../../store/typeMeta';

export function subtitle(item: Item): string {
    return item.domain || item.snippet || typeMeta(item.type).label;
}
