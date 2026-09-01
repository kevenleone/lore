// Entry point: bind a port, print the handshake line the host reads from
// stdout, and stay alive until the host goes away.

import { createApp } from "./app";
import { handshakeLine, loadConfig, watchParent } from "./config";

const config = loadConfig();
const app = createApp(config);

// Bind 127.0.0.1 explicitly — never 0.0.0.0, which would expose the vault to
// the local network.
app.listen({ hostname: "127.0.0.1", port: config.port });

const port = app.server?.port;
if (!port) {
  console.error("lore-sidecar: failed to bind a port");
  process.exit(1);
}

// Must be the first line on stdout: the host reads until it sees this.
console.log(handshakeLine(port));

watchParent(config.parentPid);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    void app.stop();
    process.exit(0);
  });
}
