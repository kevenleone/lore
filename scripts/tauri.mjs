#!/usr/bin/env node
// `pnpm tauri` — the Tauri CLI with the build mode already applied.
//
// The CLI has no environment variable for `--config`, so the overlay that
// renames the app and moves its vault has to reach it as an argument. This
// resolves LORE_MODE once and appends the right overlay, which is why
// `LORE_MODE=agent pnpm tauri dev` is all an agent has to do.

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import process from 'node:process';

const require = createRequire(import.meta.url);
const MODES = require('../lore.modes.json');

const args = process.argv.slice(2);
const subcommand = args.find((arg) => !arg.startsWith('-'));

function resolveMode(envMode, subcommand) {
    if (envMode && envMode in MODES) {
        return envMode;
    }

    if (envMode) {
        throw new Error(
            `LORE_MODE=${envMode} is not a mode; expected one of ${Object.keys(MODES).join(', ')}`,
        );
    }

    return subcommand === 'build' ? 'prod' : 'dev';
}

const mode = resolveMode(process.env.LORE_MODE, subcommand);

// `icon`, `info` and friends reject `--config`; only the two commands that
// actually read a config get the overlay. Prod is the base config untouched,
// which is what keeps CI's own `--config` composing.
const overlaid =
    mode === 'prod' || (subcommand !== 'dev' && subcommand !== 'build')
        ? args
        : [...args, '--config', `src-tauri/tauri.${mode}.conf.json`];

const child = spawn(process.execPath, [require.resolve('@tauri-apps/cli/tauri.js'), ...overlaid], {
    // The mode has to be in the environment as well as the argv: `build.rs` and
    // `beforeDevCommand` (vite and the sidecar) each resolve it for themselves.
    env: { ...process.env, LORE_MODE: mode },
    stdio: 'inherit',
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exit(code ?? 1);
});
