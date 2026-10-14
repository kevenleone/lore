import type { SavedSearch } from '@lore/types';

import { Elysia } from 'elysia';

import type { Workspace } from '../services/workspace';

import { exportVault, measureVault } from '../services/vault-size';

export function workspaceRoutes(workspace: Workspace) {
    return (
        new Elysia()
            .get('/workspace', async () => {
                if (!workspace.isOpen) {
                    return { itemCount: 0, open: false, path: null, savedSearches: [] };
                }

                const { savedSearches } = await workspace.current.vault.readWorkspaceFile();

                return {
                    itemCount: workspace.current.listItems().length,
                    open: true,
                    path: workspace.path,
                    savedSearches,
                };
            })

            .post('/workspace/open', ({ body }) => {
                const { path } = body as { path?: string };

                if (!path) {
                    return { error: 'path_required' };
                }

                return workspace.open(path);
            })

            .post('/workspace/reindex', () => workspace.reconcile())

            .get('/workspace/size', () => measureVault(workspace.current.vault.root))

            /**
             * Copy the vault's own files somewhere the user picked. The index is
             * left behind: it is derived, and the point of the export is the
             * Markdown, which is readable without Lore at all.
             */
            .post('/workspace/export', async ({ body, set }) => {
                const { path } = body as { path?: string };

                if (!path) {
                    set.status = 400;

                    return { error: 'path_required' };
                }

                return exportVault(workspace.current.vault.root, path);
            })

            /**
             * The whole list on every write. There are a handful of them and they
             * are reordered and renamed as a set, so a per-entry API would buy
             * nothing but a merge problem.
             */
            .post('/saved-searches', async ({ body }) => {
                const { savedSearches } = body as { savedSearches?: SavedSearch[] };

                await workspace.current.vault.writeWorkspaceFile({
                    savedSearches: savedSearches ?? [],
                });

                return { ok: true };
            })
    );
}
