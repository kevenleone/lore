import type { Blockquote, PhrasingContent, RootContent, TableCell, TableRow } from 'mdast';

import { useMemo } from 'react';

import { openExternal } from '../../lib/appInfo';
import { cn } from '../../lib/cn';
import { toAst } from '../../markdown/parse';
import { Caution, Info, Lightbulb, Message, Warning } from '../common/glyphs';

/**
 * The read-only reading surface for a document Lore did not author.
 *
 * `MarkdownView` cannot serve here — it renders `##` as bold text on purpose,
 * because it exists for comments and card previews. Nor can `BlockEditor`: its
 * schema has no image and no table node, so a README's badges, screenshots and
 * tables would land in `UnknownBlock` and show as raw source. Nothing here can
 * be edited, so none of the round-trip machinery applies either.
 */
interface DocumentViewProps {
    className?: string;
    markdown: string;
}

const SPACING = 'mt-[14px] first:mt-0';

/**
 * GitHub's alerts — `> [!NOTE]` and friends. Not GFM, so remark leaves the
 * marker as literal text at the head of the blockquote; without this the reader
 * shows "[!IMPORTANT]" as prose, which is how the source repo's warnings arrive
 * looking like a typo.
 *
 * Both class names are written out in full: Tailwind only generates a utility it
 * can see as a literal string, so deriving one from the other would emit no CSS.
 */
const ALERTS = {
    caution: {
        border: 'border-alert-caution-fg',
        Icon: Caution,
        label: 'Caution',
        text: 'text-alert-caution-fg',
    },
    important: {
        border: 'border-alert-important-fg',
        Icon: Message,
        label: 'Important',
        text: 'text-alert-important-fg',
    },
    note: {
        border: 'border-alert-note-fg',
        Icon: Info,
        label: 'Note',
        text: 'text-alert-note-fg',
    },
    tip: {
        border: 'border-alert-tip-fg',
        Icon: Lightbulb,
        label: 'Tip',
        text: 'text-alert-tip-fg',
    },
    warning: {
        border: 'border-alert-warning-fg',
        Icon: Warning,
        label: 'Warning',
        text: 'text-alert-warning-fg',
    },
} as const;

type AlertKind = keyof typeof ALERTS;

const MARKER = /^\[!(caution|important|note|tip|warning)\][ \t]*(\r?\n|$)/i;

export function DocumentView({ className, markdown }: DocumentViewProps): React.JSX.Element {
    const children = useMemo(() => toAst(markdown).children, [markdown]);

    return (
        <div className={cn('lore-document text-title-lg leading-[1.65] text-text2', className)}>
            {children.map((node, index) => (
                <Block key={index} node={node} />
            ))}
        </div>
    );
}

function Alert({
    children,
    kind,
}: {
    children: readonly RootContent[];
    kind: AlertKind;
}): React.JSX.Element {
    const { border, Icon, label, text } = ALERTS[kind];
    return (
        <div className={cn(SPACING, 'border-l-[3px] pl-[14px]', border)}>
            <p className={cn('flex items-center gap-[7px] font-[620]', text)}>
                <Icon size={14} />
                {label}
            </p>
            {children.map((child, index) => (
                <Block key={index} node={child} />
            ))}
        </div>
    );
}

/** The alert a blockquote opens with, and what is left once the marker is cut. */
function alertOf(node: Blockquote): { children: RootContent[]; kind: AlertKind } | null {
    const [first, ...rest] = node.children;
    if (first?.type !== 'paragraph') return null;
    const [lead, ...siblings] = first.children;
    if (lead?.type !== 'text') return null;

    const match = MARKER.exec(lead.value);
    if (!match) return null;
    const kind = match[1].toLowerCase() as AlertKind;

    // `> [!NOTE]` alone on its line makes the marker its own paragraph; on the
    // same line as the text it only prefixes the first text node.
    const remainder = lead.value.slice(match[0].length);
    if (!remainder && !siblings.length) return { children: rest, kind };
    return {
        children: [
            {
                ...first,
                children: remainder ? [{ ...lead, value: remainder }, ...siblings] : siblings,
            },
            ...rest,
        ],
        kind,
    };
}

function Block({ node }: { node: RootContent }): null | React.JSX.Element {
    switch (node.type) {
        case 'blockquote': {
            const alert = alertOf(node);
            if (alert) return <Alert kind={alert.kind}>{alert.children}</Alert>;
            return (
                <blockquote
                    className={cn(SPACING, 'border-l-2 border-border pl-[14px] text-text3')}
                >
                    {node.children.map((child, index) => (
                        <Block key={index} node={child} />
                    ))}
                </blockquote>
            );
        }
        case 'code':
            return (
                <pre
                    className={cn(
                        SPACING,
                        'overflow-x-auto rounded-11 border border-border bg-surface3 p-4 font-mono text-body-lg leading-[1.7] text-text2',
                    )}
                >
                    <code>{node.value}</code>
                </pre>
            );
        case 'heading': {
            // Sized in theme/tailwind.css beside the editor's, so the two agree.
            const Tag = `h${node.depth}` as 'h1';
            return <Tag>{inline(node.children)}</Tag>;
        }
        case 'html':
            return <Html value={node.value} />;
        case 'list':
            return node.ordered ? (
                <ol className={cn(SPACING, 'list-decimal pl-[22px]')}>{items(node.children)}</ol>
            ) : (
                <ul className={cn(SPACING, listStyle(node.children))}>{items(node.children)}</ul>
            );
        case 'paragraph':
            return <p className={SPACING}>{inline(node.children)}</p>;
        case 'table':
            return <Table rows={node.children} />;
        case 'thematicBreak':
            return <hr className="my-6 border-t border-none border-border" />;
        default:
            return null;
    }
}

function cellOf(cell: TableCell, index: number, header: boolean): React.JSX.Element {
    const className = cn(
        'border-b border-border px-3 py-2 text-left align-top',
        header ? 'bg-surface3 font-[620] text-text' : 'text-text2',
    );
    return header ? (
        <th className={className} key={index}>
            {inline(cell.children)}
        </th>
    ) : (
        <td className={className} key={index}>
            {inline(cell.children)}
        </td>
    );
}

/**
 * Raw HTML in a README is almost always a banner, a badge row or a `<details>`
 * block. Rendering it as markup would run whatever the repository wrote, so only
 * the images are lifted out — the surrounding tags are dropped, not shown.
 */
function Html({ value }: { value: string }): null | React.JSX.Element {
    const sources = [...value.matchAll(/<img\b[^>]*?\bsrc\s*=\s*"([^"]*)"/gi)].map((m) => m[1]);
    if (!sources.length) return null;
    return (
        <p className={cn(SPACING, 'flex flex-wrap items-center gap-[6px]')}>
            {sources.map((src, index) => (
                <img alt="" className="max-w-full" key={index} src={src} />
            ))}
        </p>
    );
}

function inline(children: readonly PhrasingContent[]): React.ReactNode[] {
    return children.map((node, index) => {
        switch (node.type) {
            case 'break':
                return <br key={index} />;
            case 'delete':
                return <s key={index}>{inline(node.children)}</s>;
            case 'emphasis':
                return <em key={index}>{inline(node.children)}</em>;
            case 'image':
                return (
                    <img
                        alt={node.alt ?? ''}
                        className="inline-block max-w-full align-middle"
                        key={index}
                        src={node.url}
                        title={node.title ?? undefined}
                    />
                );
            case 'inlineCode':
                return (
                    <code
                        className="rounded-sm bg-surface3 px-[4px] font-mono text-body-lg"
                        key={index}
                    >
                        {node.value}
                    </code>
                );
            case 'link':
                return (
                    <a
                        className="text-accent underline"
                        href={node.url}
                        key={index}
                        onClick={(event) => {
                            // The webview would navigate away from the app itself.
                            event.preventDefault();
                            void openExternal(node.url);
                        }}
                    >
                        {inline(node.children)}
                    </a>
                );
            case 'strong':
                return <strong key={index}>{inline(node.children)}</strong>;
            case 'text':
                return node.value;
            default:
                return null;
        }
    });
}

function items(children: readonly RootContent[]): React.JSX.Element[] {
    return children.map((item, index) => {
        const checked = item.type === 'listItem' ? item.checked : null;
        return (
            <li
                className={cn(
                    'mt-[3px] leading-[1.65] marker:text-text3',
                    checked !== null && checked !== undefined && 'flex items-start gap-[8px]',
                )}
                key={index}
            >
                {checked !== null && checked !== undefined && (
                    <input
                        checked={checked}
                        className="mt-[6px]"
                        disabled
                        readOnly
                        type="checkbox"
                    />
                )}
                <span className="min-w-0 flex-1">
                    {'children' in item
                        ? item.children.map((child, childIndex) => (
                              <Block key={childIndex} node={child} />
                          ))
                        : null}
                </span>
            </li>
        );
    });
}

/** A GFM checklist carries its own markers, so the disc would double up. */
function listStyle(children: readonly RootContent[]): string {
    const checklist = children.some(
        (child) => child.type === 'listItem' && typeof child.checked === 'boolean',
    );
    return checklist ? 'list-none pl-0' : 'list-disc pl-[22px]';
}

function Table({ rows }: { rows: readonly TableRow[] }): React.JSX.Element {
    const [head, ...body] = rows;
    return (
        <div className={cn(SPACING, 'overflow-x-auto rounded-11 border border-border')}>
            <table className="w-full border-collapse text-body-lg">
                {head && (
                    <thead>
                        <tr>{head.children.map((cell, index) => cellOf(cell, index, true))}</tr>
                    </thead>
                )}
                <tbody>
                    {body.map((row, index) => (
                        <tr key={index}>
                            {row.children.map((cell, cellIndex) => cellOf(cell, cellIndex, false))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
