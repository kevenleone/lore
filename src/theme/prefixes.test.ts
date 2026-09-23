// `user-select` has to carry its own `-webkit-` prefix in the stylesheet.
//
// Lightning CSS adds vendor prefixes when it bundles, but not when it serves
// the dev server, and the webview this app runs in wants the prefixed property.
// Leaving it to the build means `pnpm tauri dev` lets you drag-select the whole
// window — sidebar, toolbar and all — while the shipped app does not, which is
// the kind of difference that gets debugged as an app bug.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync(join(__dirname, 'tailwind.css'), 'utf8');

/** Declarations the build would prefix for us, so we write them out instead. */
const NEEDS_PREFIX = ['user-select'];

describe('vendor prefixes in tailwind.css', () => {
    for (const property of NEEDS_PREFIX) {
        it(`pairs every \`${property}\` with a \`-webkit-${property}\``, () => {
            const lines = CSS.split('\n');
            const unpaired: string[] = [];

            lines.forEach((line, index) => {
                const declaration = new RegExp(`^\\s*${property}\\s*:\\s*([^;]+);`).exec(line);

                if (!declaration) {
                    return;
                }

                const value = declaration[1].trim();
                const previous = lines[index - 1] ?? '';
                const prefixed = new RegExp(`^\\s*-webkit-${property}\\s*:\\s*${value}\\s*;`);

                if (!prefixed.test(previous)) {
                    unpaired.push(`line ${index + 1}: ${line.trim()}`);
                }
            });

            expect(unpaired).toEqual([]);
        });
    }

    it('finds the declarations it is guarding, so the test cannot pass vacuously', () => {
        expect(CSS).toMatch(/^\s*user-select\s*:/m);
    });
});
