import { Elysia } from 'elysia';

import { listTemplates } from '../services/templates';
import type { Workspace } from '../services/workspace';

export function derivedRoutes(workspace: Workspace) {
    return new Elysia()
        .get('/graph', () => workspace.current.graph())

        .get('/tags', () => workspace.current.listTags())

        .get('/templates', () => listTemplates(workspace.current.vault))

        .get('/search', ({ query }) => workspace.current.search(String(query.q ?? '')));
}
