// The HTTP surface. Every route maps onto exactly one KnowledgeRepository
// method, so the renderer's implementation stays a thin translation layer.

import { Elysia } from "elysia";
import type { Item } from "@lore/types";
import { Workspace, WorkspaceNotOpen } from "./workspace";
import { hashColor } from "./vault";
import { fetchLinkMetadata } from "./linkMetadata";

type NewItemBody = Omit<Item, "id" | "createdAt" | "updatedAt">;

export function routes(workspace: Workspace) {
  return (
    new Elysia()
      .onError(({ error, set }) => {
        if (error instanceof WorkspaceNotOpen) {
          set.status = 409;
          return { error: "no_workspace" };
        }
        set.status = 500;
        return { error: error instanceof Error ? error.message : "internal_error" };
      })

      /* ---------------- workspace ---------------- */

      .get("/workspace", async () => {
        if (!workspace.isOpen) return { path: null, open: false, itemCount: 0, tagOrder: [] };
        const { tagOrder } = await workspace.current.vault.readWorkspaceFile();
        return {
          path: workspace.path,
          open: true,
          itemCount: workspace.current.listItems().length,
          tagOrder,
        };
      })

      .post("/workspace/open", ({ body }) => {
        const { path } = body as { path?: string };
        if (!path) return { error: "path_required" };
        return workspace.open(path);
      })

      .post("/workspace/reindex", () => workspace.reconcile())

      /**
       * One-shot import from the legacy SQLite store. Collections are created
       * first so every item lands in a folder that already exists, and related
       * ids are rewritten to wikilinks once every file has a filename.
       */
      .post("/migrate/sqlite", async ({ body }) => {
        const { collections = [], items = [] } = body as {
          collections?: { id: string; name: string; color: string }[];
          items?: Item[];
        };
        const store = workspace.current;

        for (const c of collections) {
          await store.createCollection(c.name, c.color);
        }

        // Pass 1: write every item, remembering the id it was given.
        const idMap = new Map<string, string>();
        for (const item of items) {
          const created = await store.createItem({ ...item, related: [] });
          idMap.set(item.id, created.id);
        }

        // Pass 2: now that every file exists, related ids resolve to filenames.
        for (const item of items) {
          if (!item.related?.length) continue;
          const id = idMap.get(item.id);
          if (!id) continue;
          const related = item.related
            .map((old) => idMap.get(old))
            .filter((x): x is string => !!x);
          if (related.length) await store.updateItem(id, { related }, { touch: false });
        }

        workspace.notify();
        return { items: idMap.size, collections: collections.length };
      })

      /* ---------------- items ---------------- */

      // Deliberately no ?view= — filtering stays client-side via matchesView, so
      // there is one filtering code path shared by every repository.
      .get("/items", () => workspace.current.listItems())

      .get("/items/:id", ({ params, set }) => {
        const item = workspace.current.getItem(params.id);
        if (!item) {
          set.status = 404;
          return { error: "not_found" };
        }
        return item;
      })

      .post("/items", async ({ body, set }) => {
        const item = await workspace.current.createItem(body as NewItemBody);
        workspace.notify();
        set.status = 201;
        return item;
      })

      .patch("/items/:id", async ({ params, body, set }) => {
        const item = await workspace.current.updateItem(params.id, body as Partial<Item>);
        if (!item) {
          set.status = 404;
          return { error: "not_found" };
        }
        workspace.notify();
        return item;
      })

      .delete("/items/:id", async ({ params, set }) => {
        const ok = await workspace.current.deleteItem(params.id);
        if (!ok) {
          set.status = 404;
          return { error: "not_found" };
        }
        workspace.notify();
        set.status = 204;
        return "";
      })

      /**
       * Renames the file behind an item, rewriting inbound wikilinks.
       * Separate from PATCH because retitling deliberately does not rename.
       */
      .post("/items/:id/rename", async ({ params, body, set }) => {
        const { stem } = body as { stem?: string };
        if (!stem?.trim()) {
          set.status = 400;
          return { error: "stem_required" };
        }
        const item = await workspace.current.renameItem(params.id, stem);
        if (!item) {
          set.status = 404;
          return { error: "not_found" };
        }
        workspace.notify();
        return item;
      })

      /* ---------------- collections ---------------- */

      .get("/collections", () => workspace.current.listCollections())

      .post("/collections", async ({ body, set }) => {
        const { name, color } = body as { name?: string; color?: string };
        if (!name) {
          set.status = 400;
          return { error: "name_required" };
        }
        const created = await workspace.current.createCollection(name, color ?? hashColor(name));
        workspace.notify();
        set.status = 201;
        return created;
      })

      .patch("/collections/:id", async ({ params, body, set }) => {
        const patch = body as { name?: string; color?: string };
        const updated = await workspace.current.updateCollection(params.id, patch);
        if (!updated) {
          set.status = 404;
          return { error: "not_found" };
        }
        workspace.notify();
        return updated;
      })

      .delete("/collections/:id", async ({ params, set }) => {
        await workspace.current.deleteCollection(params.id);
        workspace.notify();
        set.status = 204;
        return "";
      })

      /**
       * Reads a page's OpenGraph tags for the capture window.
       *
       * Deliberately not behind the workspace guard: the capture window asks
       * for a preview while the user is still typing, which can happen before
       * any vault is open.
       */
      .post("/link-metadata", async ({ body, set }) => {
        const { url } = body as { url?: string };
        if (!url) {
          set.status = 400;
          return { error: "url_required" };
        }
        return fetchLinkMetadata(url);
      })

      /* ---------------- derived reads ---------------- */

      .get("/tags", () => workspace.current.listTags())

      /** Persists the sidebar's tag order into the vault itself. */
      .post("/tags/order", async ({ body }) => {
        const { tagOrder } = body as { tagOrder?: string[] };
        await workspace.current.vault.writeWorkspaceFile(tagOrder ?? []);
        return { ok: true };
      })

      .get("/search", ({ query }) => workspace.current.search(String(query.q ?? "")))

      /* ---------------- live updates ---------------- */

      /**
       * SSE rather than a WebSocket: the traffic is strictly one-directional,
       * and EventSource reconnects on its own, which is exactly the behaviour
       * wanted when the sidecar restarts.
       */
      .get("/events", () => {
        let unsubscribe: (() => void) | undefined;
        let keepalive: ReturnType<typeof setInterval> | undefined;

        const stream = new ReadableStream({
          start(controller) {
            const send = (event: string, data: unknown) => {
              try {
                controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
              } catch {
                // Client went away mid-write; cleanup happens in cancel().
              }
            };
            send("ready", { ok: true });
            unsubscribe = workspace.subscribe((paths) => send("changed", { paths }));
            // Proxies and idle timeouts drop a silent stream; a comment keeps it warm.
            keepalive = setInterval(() => {
              try {
                controller.enqueue(": keepalive\n\n");
              } catch {
                /* closed */
              }
            }, 25_000);
          },
          cancel() {
            unsubscribe?.();
            if (keepalive) clearInterval(keepalive);
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      })
  );
}
