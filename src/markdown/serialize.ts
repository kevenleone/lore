// Blocks → body text, preserving the source of everything untouched.

import type { Block, BlockWriter, ParsedBody } from './types';

/**
 * Replaces one block's source, leaving every other byte of the body alone.
 * The single-block edit the editor performs on every keystroke.
 */
export function replaceBlock(parsed: ParsedBody, index: number, markdown: string): string {
    return serialize(parsed, (_block, i) => (i === index ? markdown : undefined));
}

/**
 * Reassembles a body. Blocks are emitted from `source` unless `write` returns
 * replacement Markdown for them.
 *
 * With no writer this is exactly the inverse of `parse`. That is the property
 * the whole design rests on: opening a note and closing it rewrites nothing,
 * so a vault full of files Lore has merely *read* stays clean in `git status`.
 */
export function serialize(parsed: ParsedBody, write?: BlockWriter): string {
    const { blocks, prefix, separators, suffix } = parsed;

    let out = prefix;
    blocks.forEach((block, index) => {
        if (index > 0) out += separators[index - 1] ?? '\n\n';
        out += write?.(block, index) ?? block.source;
    });
    return out + suffix;
}

/** The blocks a body could not model, in document order. */
export function unknownBlocks(parsed: ParsedBody): Block[] {
    return parsed.blocks.filter((block) => block.type === 'unknown');
}
