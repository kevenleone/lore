// Entry point: bind a port, print the handshake line the host reads from
// stdout, and stay alive until the host goes away.
//
// Everything runs inside `main()` rather than at the top level because
// `bun build --bytecode` — which is what keeps the shipped binary's startup
// fast — cannot compile top-level await.

import { createApp } from './app';
import { runCli } from './cli';
import { cliContext } from './cli/context';
import { handshakeLine, loadConfig, watchParent } from './config';
import { recordVault } from './services/known-vaults';
import { Workspace } from './services/workspace';

async function main(): Promise<void> {
    // The host spawns the engine with no arguments; anything else is the `lore`
    // command, and nothing below may write to stdout, which `mcp` speaks on.
    if (process.argv.length > 2) {
        const code = await runCli(process.argv.slice(2));

        if (code !== 0) {
            process.exit(code);
        }

        return;
    }

    const config = loadConfig();
    const workspace = new Workspace();
    const app = createApp(config, workspace);
    const { vaultsFile } = cliContext();

    // So `lore` can tell agents which vault is in use, which the app keeps in the webview.
    workspace.onOpen = (root) => {
        recordVault(vaultsFile, root).catch((error) =>
            console.error('lore-sidecar: could not record the vault:', error),
        );
    };

    // The host may already know which vault to open; otherwise the renderer calls
    // POST /workspace/open once it has resolved the path.
    if (config.vault) {
        await workspace.open(config.vault);
    }

    // Bind 127.0.0.1 explicitly — never 0.0.0.0, which would expose the vault to
    // the local network.
    app.listen({ hostname: '127.0.0.1', port: config.port });

    const port = app.server?.port;

    if (!port) {
        console.error('lore-sidecar: failed to bind a port');
        process.exit(1);
    }

    // Must be the first line on stdout: the host reads until it sees this.
    console.log(handshakeLine(port));

    watchParent(config.parentPid);

    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
        process.on(signal, () => {
            void workspace.close();
            void app.stop();
            process.exit(0);
        });
    }
}

main().catch((error) => {
    console.error('lore-sidecar: failed to start:', error);
    process.exit(1);
});
