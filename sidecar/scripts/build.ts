// Compiles the sidecar to a standalone binary per platform.
//
// Tauri's `externalBin` resolves `binaries/lore-sidecar-<target-triple>`, so the
// output names must match Rust's triples exactly, not Bun's target names.
//
//   bun scripts/build.ts                          # host triple only — what `tauri dev` needs
//   bun scripts/build.ts --all                    # every target, for a release build
//   bun scripts/build.ts aarch64-apple-darwin     # one named target, for CI

import { $ } from 'bun';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

interface Target {
    /** Bun's `--target` value. */
    bun: string;
    ext?: string;
    /** Rust target triple — the suffix Tauri looks for. */
    triple: string;
}

const TARGETS: Target[] = [
    { bun: 'bun-darwin-arm64', triple: 'aarch64-apple-darwin' },
    { bun: 'bun-darwin-x64', triple: 'x86_64-apple-darwin' },
    { bun: 'bun-windows-x64', ext: '.exe', triple: 'x86_64-pc-windows-msvc' },
    { bun: 'bun-linux-x64', triple: 'x86_64-unknown-linux-gnu' },
];

const OUT_DIR = fileURLToPath(new URL('../../src-tauri/binaries/', import.meta.url));

/** The triple of the machine running this script, so a dev build is one target. */
function hostTriple(): string {
    const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
    if (process.platform === 'darwin') return `${arch}-apple-darwin`;
    if (process.platform === 'win32') return 'x86_64-pc-windows-msvc';
    return `${arch}-unknown-linux-gnu`;
}

const args = process.argv.slice(2);
const all = args.includes('--all');
const requested = args.filter((argument) => !argument.startsWith('--'));

for (const triple of requested) {
    if (!TARGETS.some((target) => target.triple === triple)) {
        console.error(`Unknown target: ${triple}`);
        console.error(`Known targets: ${TARGETS.map((target) => target.triple).join(', ')}`);
        process.exit(1);
    }
}

function selectTargets(): Target[] {
    if (all) return TARGETS;
    if (requested.length > 0) return TARGETS.filter((target) => requested.includes(target.triple));
    return TARGETS.filter((target) => target.triple === hostTriple());
}

const wanted = selectTargets();

if (wanted.length === 0) {
    console.error(`No target matches this host (${hostTriple()}).`);
    process.exit(1);
}

await mkdir(OUT_DIR, { recursive: true });

for (const t of wanted) {
    const out = `${OUT_DIR}lore-sidecar-${t.triple}${t.ext ?? ''}`;
    console.log(`→ ${t.triple}`);
    // --bytecode trims startup time and size; both matter because this binary is
    // the single biggest thing the sidecar adds to the app bundle.
    await $`bun build --compile --minify --bytecode --target=${t.bun} ${import.meta.dir}/../src/index.ts --outfile ${out}`;
    const size = (await Bun.file(out).stat()).size;
    console.log(`  ${(size / 1024 / 1024).toFixed(1)} MB  ${out}`);
}
