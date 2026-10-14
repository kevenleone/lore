// The HTTP surface. Every route maps onto exactly one KnowledgeRepository
// method, so the renderer's implementation stays a thin translation layer.

import { Elysia } from 'elysia';

import { type Agents, createAgents } from '../ai/agents';
import { AiError } from '../ai/backend';
import { type AiService, createAiService } from '../ai/service';
import { type Workspace, WorkspaceNotOpen } from '../services/workspace';
import { aiRoutes } from './ai';
import { attachmentRoutes } from './attachments';
import { boardRoutes } from './boards';
import { captureRoutes } from './capture';
import { chatRoutes } from './chats';
import { collectionRoutes } from './collections';
import { derivedRoutes } from './derived';
import { documentRoutes } from './documents';
import { eventRoutes } from './events';
import { gitRoutes } from './git';
import { itemRoutes } from './items';
import { unsplashRoutes } from './unsplash';
import { workspaceRoutes } from './workspace';

export function routes(
    workspace: Workspace,
    ai: AiService = createAiService(),
    agents: Agents = createAgents(),
) {
    return new Elysia()
        .onError(({ error, set }) => {
            if (error instanceof WorkspaceNotOpen) {
                set.status = 409;

                return { error: 'no_workspace' };
            }

            if (error instanceof AiError) {
                set.status = error.code === 'not_configured' ? 409 : 502;

                // `error` is the sentence the user reads, as it is for every other route.
                return { code: `ai_${error.code}`, error: error.message };
            }

            set.status = 500;

            return { error: error instanceof Error ? error.message : 'internal_error' };
        })
        .use(workspaceRoutes(workspace))
        .use(gitRoutes())
        .use(itemRoutes(workspace))
        .use(attachmentRoutes(workspace))
        .use(boardRoutes(workspace))
        .use(collectionRoutes(workspace))
        .use(captureRoutes())
        .use(documentRoutes())
        .use(unsplashRoutes())
        .use(derivedRoutes(workspace))
        .use(aiRoutes(workspace, ai, agents))
        .use(chatRoutes(workspace))
        .use(eventRoutes(workspace));
}
