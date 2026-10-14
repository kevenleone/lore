import { Elysia } from 'elysia';

import { ATTACHMENTS_DIR } from '../services/vault';
import type { Workspace } from '../services/workspace';

const MIME: Record<string, string> = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.heic': 'image/heic',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
};

export function attachmentRoutes(workspace: Workspace) {
    return (
        new Elysia()
            /**
             * Copies a captured file into the vault's `attachments/` folder and
             * answers with the vault-relative path the item stores. Multipart
             * rather than JSON so a screenshot does not have to be base64'd.
             */
            .post('/attachments', async ({ request, set }) => {
                const form = await request.formData();
                const file = form.get('file');

                if (!(file instanceof File)) {
                    set.status = 400;

                    return { error: 'file_required' };
                }

                const bytes = new Uint8Array(await file.arrayBuffer());
                const path = await workspace.current.vault.writeAttachment(file.name, bytes);

                set.status = 201;

                return { path };
            })

            /**
             * Serves an attachment back. A wildcard rather than `:name` so a path
             * reads the way it is stored; `readAttachment` refuses anything
             * outside `attachments/`, and `safeJoin` anything outside the vault.
             */
            .get('/attachments/*', async ({ params, set }) => {
                const rel = `${ATTACHMENTS_DIR}/${params['*']}`;

                try {
                    const bytes = await workspace.current.vault.readAttachment(rel);

                    set.headers['content-type'] = contentType(rel);
                    // Content-addressed by name: a new upload gets a new filename,
                    // so a stored one can be cached hard.
                    set.headers['cache-control'] = 'private, max-age=31536000, immutable';

                    return new Response(bytes);
                } catch {
                    set.status = 404;

                    return { error: 'not_found' };
                }
            })
    );
}

function contentType(relPath: string): string {
    const dot = relPath.lastIndexOf('.');

    return (dot > 0 && MIME[relPath.slice(dot).toLowerCase()]) || 'application/octet-stream';
}
