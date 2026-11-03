import type { ReactNodeViewProps } from '@tiptap/react';
import type { Table as TableNode } from 'mdast';

import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useMemo } from 'react';

import { toAst } from '../../markdown/parse';
import { UnknownBlock } from '../../markdown/schema';
import { Table } from './DocumentView';

export const UnknownBlockWithView = UnknownBlock.extend({
    addNodeView() {
        return ReactNodeViewRenderer(UnknownBlockView);
    },
});

function tableOf(source: string): null | TableNode {
    const { children } = toAst(source);
    const [only] = children;

    return children.length === 1 && only.type === 'table' ? only : null;
}

function UnknownBlockView({ node }: ReactNodeViewProps): React.JSX.Element {
    const source = String(node.attrs.source ?? '');
    const table = useMemo(() => tableOf(source), [source]);

    // `data-unknown-block` without `data-rendered` is what draws the raw source.
    return (
        <NodeViewWrapper
            className="mt-[14px] first:mt-0"
            data-rendered={table ? '' : undefined}
            data-unknown-block=""
            source={source}
        >
            {table && <Table rows={table.children} />}
        </NodeViewWrapper>
    );
}
