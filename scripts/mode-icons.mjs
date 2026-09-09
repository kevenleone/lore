#!/usr/bin/env node
// Regenerates the dev and agent icon sets from the production masters.
//
// The masters in `src-tauri/icons` stay the only hand-drawn files: this tints
// a copy of each and hands it to `tauri icon`, so a change to the mark reaches
// all three modes by rerunning this rather than by editing six SVGs.
//
//     node scripts/mode-icons.mjs

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const require = createRequire(import.meta.url);
const MODES = require('../lore.modes.json');

const ICONS = 'src-tauri/icons';
const SCRATCH = path.join(process.env.TMPDIR ?? '/tmp', 'lore-mode-icons');

assertRepositoryRoot();

for (const [mode, config] of Object.entries(MODES)) {
    if (!config.accent) {
        continue;
    }

    const out = path.join(ICONS, mode);
    fs.mkdirSync(out, { recursive: true });
    fs.mkdirSync(SCRATCH, { recursive: true });

    // The tray marks are solid black on transparency so macOS can invert them
    // as a template; a labelled build opts out of template mode, so here the
    // black becomes the accent and the menu bar shows it as drawn.
    for (const [master, target] of [
        ['tray-icon.svg', 'tray@2x.png'],
        ['tray-focus.svg', 'tray-focus@2x.png'],
    ]) {
        const tinted = path.join(SCRATCH, `${mode}-${master}`);
        fs.writeFileSync(tinted, read(master).replaceAll('#000000', config.accent));
        icon(tinted, path.join(SCRATCH, `${mode}-tray`));
        fs.copyFileSync(path.join(SCRATCH, `${mode}-tray`, '64x64.png'), path.join(out, target));
    }

    // The Dock tile keeps the paper-white mark and swaps the indigo field for
    // the mode's accent, shaded across the same gradient the master uses.
    const tile = path.join(SCRATCH, `${mode}-app-icon.svg`);
    fs.writeFileSync(
        tile,
        read('app-icon.svg')
            .replace('stop-color="#33364a"', `stop-color="${shade(config.accent, 0.28)}"`)
            .replace('stop-color="#393A4A"', `stop-color="${config.accent}"`)
            .replace('stop-color="#0b0c14"', `stop-color="${shade(config.accent, -0.62)}"`),
    );
    icon(tile, out);

    // `tauri icon` also writes the mobile sets, which Lore does not ship.
    for (const platform of ['android', 'ios']) {
        fs.rmSync(path.join(out, platform), { force: true, recursive: true });
    }

    process.stdout.write(`lore: ${mode} icons written to ${out}\n`);
}

fs.rmSync(SCRATCH, { force: true, recursive: true });

function assertRepositoryRoot() {
    if (!fs.existsSync(path.join(ICONS, 'app-icon.svg'))) {
        throw new Error('run this from the repository root');
    }
}

function icon(source, out) {
    const result = spawnSync(
        process.execPath,
        [require.resolve('@tauri-apps/cli/tauri.js'), 'icon', source, '-o', out],
        { stdio: ['ignore', 'ignore', 'inherit'] },
    );
    if (result.status !== 0) {
        throw new Error(`tauri icon failed for ${source}`);
    }
}

function read(name) {
    return fs.readFileSync(path.join(ICONS, name), 'utf8');
}

/** Moves a hex colour towards white (positive `amount`) or black (negative). */
function shade(hex, amount) {
    const channels = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
    const moved = channels.map((channel) => {
        const target = amount > 0 ? 255 : 0;
        return Math.round(channel + (target - channel) * Math.abs(amount));
    });
    return `#${moved.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
