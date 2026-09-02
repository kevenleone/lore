// Wikilinks. `related` is `[[stem]]` on disk so the vault reads correctly in
// Obsidian and on GitHub, but stays a list of item ids in memory so the whole
// renderer selector layer never learns wikilinks exist.
//
// The rule that matters: a link this vault cannot resolve is preserved
// byte-for-byte. A user may link to a file they have not written yet — that is
// the normal note-taking workflow — and Lore must never be the reason it
// disappears on the next save.

const WIKILINK = /^\[\[(.*)\]\]$/;

export interface Resolver {
  /** Item id for a filename stem, case-insensitively. */
  idForStem(stem: string): string | undefined;
  /** True when the string is already a known item id. */
  hasId(id: string): boolean;
  /** Filename stem for an item id, for writing links back out. */
  stemForId(id: string): string | undefined;
}

export interface ResolvedRelated {
  /** Ids the renderer sees. */
  ids: string[];
  /** Raw entries we could not resolve, kept verbatim for the next write. */
  unresolved: string[];
}

/** Strips `[[ ]]`, an `|alias`, and a `#heading` down to the bare target. */
export function parseWikilink(raw: string): string {
  const inner = WIKILINK.exec(raw.trim())?.[1] ?? raw.trim();
  return inner.split("|")[0].split("#")[0].trim();
}

export function toWikilink(stem: string): string {
  return `[[${stem}]]`;
}

/**
 * Disk → memory. Resolution order is stem, then id (so a hand-written
 * `[[01J8Z…]]` works), then give up and preserve.
 */
export function resolveRelated(raw: unknown, resolver: Resolver): ResolvedRelated {
  if (!Array.isArray(raw)) return { ids: [], unresolved: [] };

  const ids: string[] = [];
  const unresolved: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== "string" || !entry.trim()) continue;
    const target = parseWikilink(entry);
    const byStem = resolver.idForStem(target);
    if (byStem) {
      if (!ids.includes(byStem)) ids.push(byStem);
    } else if (resolver.hasId(target)) {
      if (!ids.includes(target)) ids.push(target);
    } else {
      unresolved.push(entry);
    }
  }

  return { ids, unresolved };
}

/**
 * Memory → disk. Resolved ids become `[[stem]]`; the preserved entries are
 * appended untouched, in their original order, so a round-trip through Lore
 * loses nothing.
 */
export function serializeRelated(
  ids: readonly string[],
  unresolved: readonly string[],
  resolver: Resolver,
): string[] {
  const links = ids
    .map((id) => resolver.stemForId(id))
    .filter((stem): stem is string => !!stem)
    .map(toWikilink);
  return [...links, ...unresolved];
}

/**
 * Rewrites `[[from]]` to `[[to]]` in a frontmatter `related` list, preserving
 * alias and heading suffixes. Used when a file is renamed — only frontmatter,
 * never body prose, which would be text-mangling for no one's benefit.
 */
export function rewriteRelated(raw: readonly string[], from: string, to: string): string[] {
  return raw.map((entry) => {
    const m = WIKILINK.exec(entry.trim());
    if (!m) return entry;
    const inner = m[1];
    const [targetAndHeading, ...aliasParts] = inner.split("|");
    const [target, ...headingParts] = targetAndHeading.split("#");
    if (target.trim().toLowerCase() !== from.toLowerCase()) return entry;
    const heading = headingParts.length ? `#${headingParts.join("#")}` : "";
    const alias = aliasParts.length ? `|${aliasParts.join("|")}` : "";
    return `[[${to}${heading}${alias}]]`;
  });
}
