import { homedir } from 'node:os';
import { join } from 'node:path';

import modes from '../../../lore.modes.json';
import { version } from '../../package.json';

export interface CliContext {
    defaultVault: string;
    label: null | string;
    /** Where the log-work skill remembers each repository's vault and collection. */
    logWorkFile: string;
    mode: ModeName;
    name: string;
    /** Set when an agent starts the server it registered: `lore-sidecar mcp` with the vault in its environment. */
    servedVault: null | string;
    /** Every vault the app has opened, which only the engine sees; the app keeps its own list in the webview. */
    vaultsFile: string;
    version: string;
}

type ModeName = keyof typeof modes;

/**
 * Who this command is. The launcher script passes the app's bundle identifier,
 * which names the build; under `bun src/index.ts` there is only `LORE_MODE`.
 */
export function cliContext(
    env: Record<string, string | undefined> = Bun.env,
    platform: NodeJS.Platform = process.platform,
    home: string = homedir(),
): CliContext {
    const mode = modeOf(env);
    const { cliName, identifier, label } = modes[mode];
    const dataDir = appDataDir(identifier, env, platform, home);

    return {
        defaultVault: join(dataDir, 'Vault'),
        label,
        logWorkFile: join(home, '.config', 'lore', 'log-work.json'),
        mode,
        name: cliName,
        servedVault: env.LORE_VAULT || null,
        vaultsFile: join(dataDir, 'vaults.json'),
        version,
    };
}

/** Where Tauri's `app_data_dir` lands on each platform; `default_vault` in `sidecar.rs` builds on it. */
function appDataDir(
    identifier: string,
    env: Record<string, string | undefined>,
    platform: NodeJS.Platform,
    home: string,
): string {
    if (platform === 'darwin') {
        return join(home, 'Library', 'Application Support', identifier);
    }

    if (platform === 'win32') {
        return join(env.APPDATA ?? join(home, 'AppData', 'Roaming'), identifier);
    }

    return join(env.XDG_DATA_HOME ?? join(home, '.local', 'share'), identifier);
}

function modeOf(env: Record<string, string | undefined>): ModeName {
    const names = Object.keys(modes) as ModeName[];
    const byIdentifier = names.find((name) => modes[name].identifier === env.LORE_APP_ID);

    if (byIdentifier) {
        return byIdentifier;
    }

    return names.find((name) => name === env.LORE_MODE) ?? 'prod';
}
