// Read-only Markdown, for places an editor would be overkill.
//
// Imports the parser only — never the schema or ProseMirror — so a comment
// thread does not pull the editor bundle in behind it.

import type { PhrasingContent, RootContent } from 'mdast';

import { useMemo } from 'react';

import { cn } from '../../lib/cn';
import { toAst } from '../../markdown/parse';

interface MarkdownViewProps {
    className?: string;
    markdown: string;
}

export function MarkdownView({ className, markdown }: MarkdownViewProps): React.JSX.Element {
    const children = useMemo(() => toAst(markdown).children, [markdown]);

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            {children.map((node, index) => (
                <Block key={index} node={node} />
            ))}
        </div>
    );
}

function Block({ node }: { node: RootContent }): null | React.JSX.Element {
    switch (node.type) {
        case 'blockquote':
            return (
                <blockquote className="border-l-2 border-border pl-3 text-text3">
                    {node.children.map((child, index) => (
                        <Block key={index} node={child} />
                    ))}
                </blockquote>
            );
        case 'code':
            return (
                <pre className="overflow-x-auto rounded-lg bg-surface3 p-3 font-mono text-body-sm text-text2">
                    {node.value}
                </pre>
            );
        case 'heading': {
            // A comment is not a document; its headings are emphasis, not
            // outline levels, so they all render at one weight.
            return <p className="font-semibold text-text">{inline(node.children)}</p>;
        }
        case 'list':
            return node.ordered ? (
                <ol className="list-decimal pl-5">{items(node.children)}</ol>
            ) : (
                <ul className="list-disc pl-5">{items(node.children)}</ul>
            );
        case 'paragraph':
            return <p>{inline(node.children)}</p>;
        case 'thematicBreak':
            return <hr className="border-t border-none border-border" />;
        default:
            // Anything unmodelled shows as its own source rather than vanishing.
            return 'value' in node && typeof node.value === 'string' ? (
                <p className="font-mono text-body-sm text-text3">{node.value}</p>
            ) : null;
    }
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
            case 'inlineCode':
                return (
                    <code
                        className="rounded-sm bg-surface3 px-1 font-mono text-body-sm"
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
                        rel="noreferrer"
                        target="_blank"
                    >
                        {inline(node.children)}
                    </a>
                );
            case 'strong':
                return <strong key={index}>{inline(node.children)}</strong>;
            case 'text':
                return node.value;
            default:
                return 'value' in node && typeof node.value === 'string' ? node.value : null;
        }
    });
}

function items(children: readonly RootContent[]): React.JSX.Element[] {
    return children.map((item, index) => (
        <li key={index}>
            {'children' in item
                ? item.children.map((child, childIndex) => <Block key={childIndex} node={child} />)
                : null}
        </li>
    ));
}
