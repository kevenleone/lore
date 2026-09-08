// The unit of source preservation.
//
// A body is split into top-level blocks, each of which remembers the exact
// substring it was parsed from. Blocks nobody edited are written back from
// `source` verbatim, so a save can never reformat text the user did not touch —
// which is what keeps Lore honest on a Git-tracked vault that Obsidian also
// writes to.

import type { RootContent } from 'mdast';

export interface Block {
    /**
     * The parsed node, for blocks we model. `null` for `unknown` blocks, whose
     * only meaningful representation is their source text.
     */
    node: null | RootContent;
    /** Verbatim source, exactly as it appeared in the body. */
    source: string;
    type: BlockKind;
}

/** A top-level construct we model, or `unknown` for one we deliberately do not. */
export type BlockKind = 'unknown' | RootContent['type'];

/**
 * Produces Markdown for a block whose content changed. Returning `undefined`
 * means "unchanged" and keeps the original source.
 */
export type BlockWriter = (block: Block, index: number) => string | undefined;

/**
 * A body decomposed into blocks and the literal text between them.
 *
 * `prefix`, `separators` and `suffix` exist so that reassembly is concatenation
 * rather than reconstruction: blank lines, trailing spaces and unusual
 * indentation between blocks survive untouched.
 */
export interface ParsedBody {
    blocks: Block[];
    /** Text before the first block. Empty unless the body opens with blank lines. */
    prefix: string;
    /** `separators[i]` is the text between block `i` and block `i + 1`. */
    separators: string[];
    /** Text after the last block. */
    suffix: string;
}
