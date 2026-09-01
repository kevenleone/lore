// Fetch a URL and extract useful metadata (title, description, image) from its
// OpenGraph / standard meta tags. Uses the Tauri HTTP plugin so the request goes
// through Rust and bypasses browser CORS. No-op-safe outside Tauri.

export interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) target = `https://${target}`;

  const { fetch } = await import("@tauri-apps/plugin-http");
  const res = await fetch(target, { method: "GET", headers: { "User-Agent": "LoreBot/1.0" } });
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");

  const meta = (selector: string): string | undefined => {
    const el = doc.querySelector(selector);
    const content = el?.getAttribute("content")?.trim();
    return content || undefined;
  };

  const title =
    meta('meta[property="og:title"]') ??
    meta('meta[name="twitter:title"]') ??
    doc.querySelector("title")?.textContent?.trim() ??
    undefined;

  const description =
    meta('meta[property="og:description"]') ??
    meta('meta[name="twitter:description"]') ??
    meta('meta[name="description"]');

  let image =
    meta('meta[property="og:image"]') ?? meta('meta[name="twitter:image"]');
  // Resolve protocol-relative / relative image URLs against the page.
  if (image && !/^https?:\/\//i.test(image)) {
    try {
      image = new URL(image, target).href;
    } catch {
      image = undefined;
    }
  }

  return { title, description, image };
}
