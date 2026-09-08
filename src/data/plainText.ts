// Markdown → plain text, for one-line previews.
//
// Deliberately regex-based and dependency-free. `deriveSnippet` is shared with
// the sidecar through the `@lore/derive` path alias, and the sidecar's whole
// dependency list is `elysia` and `yaml` — pulling remark in here would put a
// Markdown parser into the indexer to produce a 200-character preview.
//
// The bounded job makes that honest: this only has to make a single line read
// well in a list row. It is not a renderer, and nothing round-trips through it.

/** Fenced code delimiters, and the language tag that follows them. */
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
/** A character no Markdown body contains, used to park escaped delimiters. */
const SENTINEL = '\u0000';

/** Longest title a captured item gets before it is cut. */
const TITLE_MAX = 80;

/**
 * The title Lore gives an item captured as free text: its first real line,
 * without the Markdown that made it a heading. A note beginning `# Groceries`
 * is titled "Groceries", not "# Groceries".
 */
export function deriveTitle(markdown: string): string {
    return firstPlainLine(markdown).slice(0, TITLE_MAX);
}

/** The first line with any content, already stripped of Markdown. */
export function firstPlainLine(markdown: string): string {
    for (const line of markdownToPlainText(markdown).split('\n')) {
        const trimmed = line.trim();
        if (trimmed) return trimmed;
    }
    return '';
}

export function markdownToPlainText(markdown: string): string {
    // Escaped delimiters come out first, so `\*not emphasis\*` is not read as
    // emphasis and stripped. They go back in at the end, unescaped.
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

    // Emphasis before code: `**a `b` c**` should lose both.
    text = text.replace(EMPHASIS, '$2');
    text = text.replace(EMPHASIS, '$2');
    text = text.replace(INLINE_CODE, '$1');
    text = text.replace(HTML_TAG, '');

    return text.replace(
        new RegExp(`${SENTINEL}(\\d+)${SENTINEL}`, 'g'),
        (_match, index: string) => escaped[Number(index)],
    );
}
