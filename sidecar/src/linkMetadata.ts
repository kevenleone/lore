// Reads a page's OpenGraph / meta tags.
//
// This used to run in the renderer through the Tauri HTTP plugin, purely to get
// around CORS. Server-side there is no CORS, so moving it here lets the app drop
// that plugin and its `http://**` grant entirely.
//
// It also gets to be better behaved than the renderer version was: HTMLRewriter
// streams, so parsing stops at `</head>` instead of buffering a whole page, and
// there is a timeout and a size cap where before there was neither.

export interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
}

const TIMEOUT_MS = 5_000;
/** Plenty for any real `<head>`; stops a hostile or broken page streaming forever. */
const MAX_BYTES = 512 * 1024;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 LoreBot/1.0";

export function normalizeUrl(raw: string): string {
  const target = raw.trim();
  return /^https?:\/\//i.test(target) ? target : `https://${target}`;
}

/** First non-empty value wins, matching the renderer version's precedence. */
function pick(...values: (string | undefined)[]): string | undefined {
  for (const v of values) {
    const trimmed = v?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

export async function fetchLinkMetadata(rawUrl: string): Promise<LinkMetadata> {
  const target = normalizeUrl(rawUrl);
  // Refuse anything that is not http(s) — no file://, no data:.
  const parsed = new URL(target);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("unsupported protocol");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(target, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok || !res.body) return {};

    const meta: Record<string, string> = {};
    let title: string | undefined;
    let inTitle = false;

    const rewriter = new HTMLRewriter()
      .on("meta", {
        element(el) {
          const key = el.getAttribute("property") ?? el.getAttribute("name");
          const content = el.getAttribute("content");
          if (key && content && !(key in meta)) meta[key] = content;
        },
      })
      .on("title", {
        element() {
          inTitle = true;
        },
        text(chunk) {
          if (inTitle) title = (title ?? "") + chunk.text;
          if (chunk.lastInTextNode) inTitle = false;
        },
      });

    // HTMLRewriter transforms a Response, so wrap the capped stream back up.
    await rewriter.transform(new Response(capped(res.body))).arrayBuffer();

    let image = pick(meta["og:image"], meta["twitter:image"]);
    // Resolve protocol-relative and relative image URLs against the page.
    if (image && !/^https?:\/\//i.test(image)) {
      try {
        image = new URL(image, target).href;
      } catch {
        image = undefined;
      }
    }

    return {
      title: pick(meta["og:title"], meta["twitter:title"], title),
      description: pick(meta["og:description"], meta["twitter:description"], meta.description),
      image,
    };
  } catch {
    // A page that will not load is not an error worth surfacing — the capture
    // just keeps whatever the user typed.
    return {};
  } finally {
    clearTimeout(timer);
  }
}

/** Stops reading after MAX_BYTES, however much the server wants to send. */
function capped(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  let seen = 0;
  const reader = body.getReader();
  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done || seen >= MAX_BYTES) {
        controller.close();
        await reader.cancel().catch(() => {});
        return;
      }
      seen += value.byteLength;
      controller.enqueue(value);
    },
    cancel() {
      void reader.cancel().catch(() => {});
    },
  });
}
