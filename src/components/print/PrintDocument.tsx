import type { Item } from '../../store/types';

import { cn } from '../../lib/cn';
import { TYPE_META } from '../../store/typeMeta';
import { DocumentView } from '../editor/DocumentView';

export interface PrintPayload {
    /** Resolved by the sending window — the print window has no collections. */
    collectionName?: string;
    item: Item;
}

/**
 * One document, laid out as paper.
 *
 * The window painting this always paints the light token map, so the tokens
 * below are ink on white whatever theme the app is in; nothing here needs a
 * print-only colour.
 */
export function PrintDocument({ collectionName, item }: PrintPayload): React.JSX.Element {
    const meta = TYPE_META[item.type];
    const byline = [item.domain, absoluteDate(item.createdAt)].filter(Boolean);

    return (
        <article className="mx-auto max-w-[680px] px-12 py-10 text-text">
            <header className="lore-print-header mb-7 border-b border-border pb-5">
                <div className="flex items-center gap-2 text-label font-semibold">
                    <span className={cn('rounded-md px-[9px] py-[3px]', meta.chip)}>
                        {meta.label}
                    </span>
                    {collectionName && <span className="text-text3">{collectionName}</span>}
                </div>
                <h1 className="mt-3 text-title-lg leading-[1.25] font-[650] text-text">
                    {item.title}
                </h1>
                {byline.length > 0 && (
                    <div className="mt-2 text-body text-text3">{byline.join(' · ')}</div>
                )}
                {item.url && <div className="mt-1 text-body-sm text-text3">{item.url}</div>}
                {item.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-[6px]">
                        {item.tags.map((tag) => (
                            <span
                                className="rounded-md border border-border px-[7px] py-[2px] text-label text-text2"
                                key={tag}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </header>
            <DocumentView className="lore-print-body" markdown={item.body ?? ''} />
        </article>
    );
}

/**
 * Spelled out in full, not `formatSavedDate`: that answers "Today, 14:30",
 * which is true when the PDF is written and a lie every day after.
 */
function absoluteDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}
