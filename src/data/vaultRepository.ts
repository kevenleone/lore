// KnowledgeRepository backed by the Markdown vault, over the local data engine.
//
// Thin on purpose: the engine owns the files, the index and the search, so this
// is a translation layer and nothing more. The one piece of real logic is
// making sure a workspace is open before the first read.

import type { Collection, Item, TagCount, View } from "../store/types";
import { matchesView } from "../store/views";
import { eventsUrl, HttpError, request } from "./sidecarClient";
import type {
  CollectionPatch,
  ItemPatch,
  KnowledgeRepository,
  NewCollection,
  NewItem,
} from "./repository";

interface WorkspaceInfo {
  path: string | null;
  open: boolean;
  itemCount: number;
  tagOrder?: string[];
}

export class VaultRepository implements KnowledgeRepository {
  private opening: Promise<void> | null = null;
  private events: EventSource | null = null;

  /**
   * @param workspacePath the vault to open, or null for the default one.
   */
  constructor(private workspacePath: string | null = null) {}

  /**
   * The engine already opens the vault the host passed it at launch, but not in
   * development and not after a workspace switch — so every call goes through
   * here, and it costs one cached promise once warm.
   */
  private async ready(): Promise<void> {
    if (!this.opening) {
      this.opening = this.openWorkspace().catch((e) => {
        this.opening = null;
        throw e;
      });
    }
    return this.opening;
  }

  /**
   * Every call goes through here so a restarted engine recovers on its own.
   *
   * If the engine is replaced — a crash-restart in production, a hot reload in
   * development — the new process has no workspace open and answers 409. The
   * cached `ready()` promise would otherwise never re-run, leaving the app
   * talking to an engine that has forgotten which vault it is serving.
   */
  private async call<T>(fn: () => Promise<T>): Promise<T> {
    await this.ready();
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof HttpError) || e.status !== 409) throw e;
      this.opening = null;
      await this.ready();
      return fn();
    }
  }

  /**
   * Opens the workspace without reading anything.
   *
   * The one-shot import writes straight to the engine rather than through this
   * repository, so it has to be able to guarantee a vault is open first —
   * otherwise the engine answers 409 and the import silently does nothing.
   */
  async ensureOpen(): Promise<void> {
    await this.ready();
  }

  private async openWorkspace(): Promise<void> {
    const info = await request<WorkspaceInfo>("/workspace");
    const wanted = this.workspacePath ?? (await defaultVaultPath());
    if (info.open && info.path === wanted) return;
    await request<{ path: string; itemCount: number }>("/workspace/open", {
      method: "POST",
      body: JSON.stringify({ path: wanted }),
    });
  }

  /* ---------------- items ---------------- */

  async listItems(view?: View): Promise<Item[]> {
    // Filtering stays client-side so there is one `matchesView` shared by every
    // repository, and the selector tests keep covering it.
    const items = await this.call(() => request<Item[]>("/items"));
    return view ? items.filter((i) => matchesView(i, view)) : items;
  }

  async getItem(id: string): Promise<Item | null> {
    try {
      return await this.call(() => request<Item>(`/items/${encodeURIComponent(id)}`));
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) return null;
      throw e;
    }
  }

  async createItem(input: NewItem): Promise<Item> {
    return this.call(() =>
      request<Item>("/items", { method: "POST", body: JSON.stringify(input) }),
    );
  }

  async updateItem(id: string, patch: ItemPatch): Promise<Item> {
    return this.call(() =>
      request<Item>(`/items/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    );
  }

  async deleteItem(id: string): Promise<void> {
    await this.call(() =>
      request<void>(`/items/${encodeURIComponent(id)}`, { method: "DELETE" }),
    );
  }

  /* ---------------- collections ---------------- */

  async listCollections(): Promise<Collection[]> {
    return this.call(() => request<Collection[]>("/collections"));
  }

  async createCollection(input: NewCollection): Promise<Collection> {
    return this.call(() =>
      request<Collection>("/collections", { method: "POST", body: JSON.stringify(input) }),
    );
  }

  async updateCollection(id: string, patch: CollectionPatch): Promise<Collection> {
    return this.call(() =>
      request<Collection>(`/collections/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    );
  }

  async deleteCollection(id: string): Promise<void> {
    await this.call(() =>
      request<void>(`/collections/${encodeURIComponent(id)}`, { method: "DELETE" }),
    );
  }

  /** The sidebar tag order this vault carries, if it has one. */
  async tagOrder(): Promise<string[]> {
    const info = await this.call(() => request<WorkspaceInfo>("/workspace"));
    return info.tagOrder ?? [];
  }

  async renameItem(id: string, stem: string): Promise<Item> {
    return this.call(() =>
      request<Item>(`/items/${encodeURIComponent(id)}/rename`, {
        method: "POST",
        body: JSON.stringify({ stem }),
      }),
    );
  }

  /* ---------------- derived ---------------- */

  async listTags(): Promise<TagCount[]> {
    return this.call(() => request<TagCount[]>("/tags"));
  }

  async search(query: string): Promise<Item[]> {
    return this.call(() => request<Item[]>(`/search?q=${encodeURIComponent(query)}`));
  }

  /* ---------------- live updates ---------------- */

  /**
   * Fires whenever the vault changes on disk — including edits made outside
   * Lore. `EventSource` reconnects on its own, which is what covers an engine
   * restart without any retry logic here.
   */
  subscribe(cb: () => void): () => void {
    let closed = false;
    void eventsUrl().then((url) => {
      if (closed) return;
      this.events = new EventSource(url);
      this.events.addEventListener("changed", () => cb());
    });
    return () => {
      closed = true;
      this.events?.close();
      this.events = null;
    };
  }

  dispose(): void {
    this.events?.close();
    this.events = null;
    this.opening = null;
  }
}

/** The vault the host keeps alongside the app's own data. */
export async function defaultVaultPath(): Promise<string> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("default_vault_path");
}
