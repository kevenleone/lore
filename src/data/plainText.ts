const FENCE = /^\s*(?:```|~~~).*$/gm;
const HEADING = /^\s{0,3}#{1,6}\s+/gm;
const BLOCKQUOTE = /^\s{0,3}>\s?/gm;
const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s*)?/gm;
const IMAGE = /!\[([^\]]*)\]\([^)]*\)/g;
const INLINE_LINK = /\[([^\]]*)\]\([^)]*\)/g;
const REFERENCE_LINK = /\[([^\]]*)\]\[[^\]]*\]/g;
/** `[[note]]`, `[[note|alias]]`, `[[note#heading]]` — the alias wins. */
const WIKILINK = /\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;
const EMPHASIS = /(\*\*\*|\*\*|\*|___|__|_|~~)(.+?)\1/g;
const INLINE_CODE = /`+([^`]+)`+/g;
const HTML_TAG = /<\/?[a-zA-Z][^>]*>/g;
const ESCAPE = /\\([\\`*_{}[\]()#+\-.!>~|])/g;
const SENTINEL = '\u0000';

const TITLE_MAX = 80;

/** A note beginning `# Groceries` is titled "Groceries". */
export function deriveTitle(markdown: string): string {
    return firstPlainLine(markdown).slice(0, TITLE_MAX);
}

export function firstPlainLine(markdown: string): string {
    for (const line of markdownToPlainText(markdown).split('\n')) {
        const trimmed = line.trim();
        if (trimmed) return trimmed;
    }
    return '';
}

export function markdownToPlainText(markdown: string): string {
    // Escapes come out first, or `\*not emphasis\*` loses its asterisks and
    // keeps its backslashes.
    const escaped: string[] = [];
    let text = markdown.replace(ESCAPE, (_match, char: string) => {
        escaped.push(char);
        return `${SENTINEL}${escaped.length - 1}${SENTINEL}`;
    });

    text = text.replace(FENCE, '');
    text = text.replace(HEADING, '');
    text = text.replace(BLOCKQUOTE, '');
    text = text.replace(LIST_MARKER, '');

    // Images before links: `![alt](src)` also matches the link shape.
    text = text.replace(IMAGE, '$1');
    text = text.replace(INLINE_LINK, '$1');
    text = text.replace(REFERENCE_LINK, '$1');
    text = text.replace(WIKILINK, (_match, target: string, alias?: string) => alias ?? target);

    text = text.replace(EMPHASIS, '$2');
    text = text.replace(EMPHASIS, '$2');
    text = text.replace(INLINE_CODE, '$1');
    text = text.replace(HTML_TAG, '');

    return text.replace(
        new RegExp(`${SENTINEL}(\\d+)${SENTINEL}`, 'g'),
        (_match, index: string) => escaped[Number(index)],
    );
}
