import type { Block, BlockWriter, ParsedBody } from './types';

export function replaceBlock(parsed: ParsedBody, index: number, markdown: string): string {
    return serialize(parsed, (_block, i) => (i === index ? markdown : undefined));
}

export function serialize(parsed: ParsedBody, write?: BlockWriter): string {
    const { blocks, prefix, separators, suffix } = parsed;

    let out = prefix;
    blocks.forEach((block, index) => {
        if (index > 0) out += separators[index - 1] ?? '\n\n';
        out += write?.(block, index) ?? block.source;
    });
    return out + suffix;
}

export function unknownBlocks(parsed: ParsedBody): Block[] {
    return parsed.blocks.filter((block) => block.type === 'unknown');
}
