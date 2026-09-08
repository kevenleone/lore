import type { RootContent } from 'mdast';

export interface Block {
    node: null | RootContent;
    /** Verbatim source, so a block nobody edited is written back unchanged. */
    source: string;
    type: BlockKind;
}

export type BlockKind = 'unknown' | RootContent['type'];

/** Returning `undefined` keeps the block's original source. */
export type BlockWriter = (block: Block, index: number) => string | undefined;

export interface ParsedBody {
    blocks: Block[];
    prefix: string;
    /** `separators[i]` is the text between block `i` and block `i + 1`. */
    separators: string[];
    suffix: string;
}
